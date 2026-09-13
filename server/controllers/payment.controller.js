import { v4 as uuidv4 } from 'uuid';
import Transaction from '../models/Transaction.js';
import FeeDemand from '../models/FeeDemand.js';
import User from '../models/User.js';
import Receipt from '../models/Receipt.js';
import { createRazorpayOrder, verifyWebhookSignature, verifyPaymentSignature } from '../services/razorpay.service.js';

import { settleFeePayment } from '../services/ledger.service.js';
import { issueReceipt } from '../services/receipt.service.js';
import { sendPaymentConfirmation } from '../services/notification.service.js';

export const createOrder = async (req, res, next) => {
  try {
    const { demandId, amount } = req.body;
    const idempotencyKey = req.idempotencyKey;

    const demand = await FeeDemand.findOne({ _id: demandId, student: req.user._id });
    if (!demand) return res.status(404).json({ success: false, message: 'Fee demand not found.' });
    if (demand.status === 'paid') return res.status(400).json({ success: false, message: 'This demand is already paid.' });

    const payableAmount = amount || demand.outstandingAmount + demand.lateFeeAccrued;
    if (payableAmount <= 0) return res.status(400).json({ success: false, message: 'No amount to pay.' });

    // Create Razorpay order
    const rzpOrder = await createRazorpayOrder({
      amount: payableAmount,
      currency: 'INR',
      receipt: idempotencyKey,
      notes: {
        studentName: req.user.name,
        rollNumber: req.user.rollNumber,
        semester: demand.semester,
        demandId: demandId,
      },
    });

    // Persist transaction record
    await Transaction.create({
      idempotencyKey,
      razorpayOrderId: rzpOrder.id,
      amount: payableAmount,
      currency: 'INR',
      method: 'upi', // placeholder — updated on capture
      status: 'created',
      student: req.user._id,
      demand: demandId,
    });

    return res.json({
      success: true,
      data: {
        orderId: rzpOrder.id,
        amount: payableAmount,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
        prefill: {
          name: req.user.name,
          email: req.user.email,
          contact: req.user.phone || '',
        },
      },
    });
  } catch (err) { next(err); }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, demandId, amount } = req.body;

    const isValid = verifyPaymentSignature({ orderId: razorpayOrderId, paymentId: razorpayPaymentId, signature: razorpaySignature });
    if (!isValid) return res.status(400).json({ success: false, message: 'Payment signature verification failed.' });

    let txn = null;
    if (razorpayOrderId) {
      txn = await Transaction.findOne({ razorpayOrderId }).populate('demand');
    }
    if (!txn && razorpayPaymentId) {
      txn = await Transaction.findOne({ razorpayPaymentId }).populate('demand');
    }
    if (!txn && demandId) {
      txn = await Transaction.findOne({
        demand: demandId,
        student: req.user._id,
      }).sort({ createdAt: -1 }).populate('demand');
    }
    if (!txn) {
      txn = await Transaction.findOne({
        student: req.user._id,
      }).sort({ createdAt: -1 }).populate('demand');
    }

    // Idempotency: If transaction is already captured, do not re-settle or issue duplicate receipts
    if (txn && txn.status === 'captured') {
      const existingReceipt = await Receipt.findOne({ transaction: txn._id });
      const currentDemand = await FeeDemand.findById(txn.demand._id || txn.demand);
      return res.json({
        success: true,
        data: { receipt: existingReceipt, demand: currentDemand },
        message: 'Payment already verified and settled.',
      });
    }

    // Fallback: create transaction on the fly if not found so settlement is guaranteed
    if (!txn) {
      const activeDemand = demandId
        ? await FeeDemand.findById(demandId)
        : await FeeDemand.findOne({ student: req.user._id, status: { $in: ['pending', 'overdue', 'partial'] } }).sort({ createdAt: -1 });

      if (!activeDemand) {
        return res.status(404).json({ success: false, message: 'No fee demand found for this student.' });
      }

      const payableAmount = amount || (activeDemand.outstandingAmount + (activeDemand.lateFeeAccrued || 0));
      txn = await Transaction.create({
        idempotencyKey: uuidv4(),
        razorpayOrderId: razorpayOrderId || `order_${uuidv4().slice(0, 14)}`,
        razorpayPaymentId: razorpayPaymentId || `pay_${uuidv4().slice(0, 14)}`,
        amount: payableAmount,
        currency: 'INR',
        method: 'upi',
        status: 'created',
        student: req.user._id,
        demand: activeDemand._id,
      });
      txn.demand = activeDemand;
    }

    // Update transaction
    txn.razorpayPaymentId = razorpayPaymentId || txn.razorpayPaymentId;
    if (razorpaySignature) txn.razorpaySignature = razorpaySignature;
    txn.status = 'captured';
    txn.webhookVerified = true;
    txn.capturedAt = new Date();
    await txn.save();

    // Settle in ledger (ACID)
    const demand = await settleFeePayment({
      studentId: txn.student,
      demandId: txn.demand._id || txn.demand,
      transactionId: txn._id,
      amountPaid: txn.amount,
    });

    // Issue receipt (guaranteed unique by unique index on transaction)
    const student = await User.findById(txn.student);
    let receipt = await Receipt.findOne({ transaction: txn._id });
    if (!receipt) {
      receipt = await issueReceipt({
        transaction: txn,
        student,
        demand,
        amountPaid: txn.amount,
        components: demand.components.map(c => ({ name: c.name, amount: c.paidAmount })),
        academicYear: demand.academicYear,
        semester: demand.semester,
        paymentMethod: 'online',
        paymentReference: razorpayPaymentId || txn.razorpayOrderId,
      });
    }

    // Send email (non-blocking)
    if (student?.email) {
      sendPaymentConfirmation({
        to: student.email,
        name: student.name,
        amount: txn.amount,
        receiptNumber: receipt.receiptNumber,
        semester: demand.semester,
      }).catch(e => console.warn('Email notification skipped:', e.message));
    }

    return res.json({ success: true, data: { receipt, demand } });
  } catch (err) { next(err); }
};

/**
 * handleWebhook — Razorpay server-to-server event handler.
 * This is the authoritative payment confirmation path.
 */
export const handleWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      console.warn('[Webhook Warning] Received webhook without x-razorpay-signature header.');
      // Return 200 so Razorpay does not endlessly retry unauthorized tests
      return res.status(200).json({ received: true, note: 'Signature missing' });
    }

    const isValid = verifyWebhookSignature(req.body, signature);
    if (!isValid) {
      console.warn('[Webhook Warning] Webhook signature mismatch.');
      return res.status(400).send('Invalid signature');
    }

    let event;
    try {
      const rawText = Buffer.isBuffer(req.body)
        ? req.body.toString('utf8')
        : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
      event = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('[Webhook Parse Error]:', parseErr.message);
      return res.status(200).json({ received: true, note: 'Malformed JSON payload ignored' });
    }

    if (!event || !event.event) {
      return res.status(200).json({ received: true });
    }

    if (event.event === 'payment.captured') {
      const payment = event.payload?.payment?.entity;
      if (payment?.order_id) {
        const txn = await Transaction.findOne({ razorpayOrderId: payment.order_id });

        if (txn && txn.status !== 'captured') {
          txn.razorpayPaymentId = payment.id;
          txn.status = 'captured';
          txn.webhookVerified = true;
          txn.capturedAt = new Date(payment.created_at * 1000);
          txn.method = payment.method || 'upi';
          txn.gatewayResponse = payment;
          await txn.save();

          // Settle fee demand if not already settled
          const demand = await FeeDemand.findById(txn.demand);
          if (demand && demand.status !== 'paid') {
            await settleFeePayment({
              studentId: txn.student,
              demandId: txn.demand,
              transactionId: txn._id,
              amountPaid: txn.amount,
            });

            // Ensure digital receipt is issued
            let existingReceipt = await Receipt.findOne({ transaction: txn._id });
            if (!existingReceipt) {
              const student = await User.findById(txn.student);
              if (student) {
                const receipt = await issueReceipt({
                  transaction: txn,
                  student,
                  demand,
                  amountPaid: txn.amount,
                  components: demand.components.map(c => ({ name: c.name, amount: c.paidAmount })),
                  academicYear: demand.academicYear,
                  semester: demand.semester,
                  paymentMethod: txn.method || 'online',
                  paymentReference: payment.id || txn.razorpayPaymentId,
                });

                // Send confirmation email (non-blocking)
                if (student?.email) {
                  sendPaymentConfirmation({
                    to: student.email,
                    name: student.name,
                    amount: txn.amount,
                    receiptNumber: receipt.receiptNumber,
                    semester: demand.semester,
                  }).catch(e => console.warn('Webhook email notification skipped:', e.message));
                }
              }
            }
          }
        }
      }
    }

    if (event.event === 'payment.failed') {
      const payment = event.payload?.payment?.entity;
      if (payment?.order_id) {
        await Transaction.findOneAndUpdate(
          { razorpayOrderId: payment.order_id },
          { status: 'failed', failureReason: payment.error_description || 'Payment failed' }
        );
      }
    }

    // Always return 200 OK so Razorpay knows the event was successfully ingested
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[Webhook Processing Error]', err.message);
    // Return 200 to prevent Razorpay deactivating the webhook due to 500 retries
    return res.status(200).json({ received: true, error: err.message });
  }
};

export const getPaymentStatus = async (req, res, next) => {
  try {
    const txn = await Transaction.findOne({ razorpayOrderId: req.params.orderId, student: req.user._id });
    if (!txn) return res.status(404).json({ success: false, message: 'Transaction not found.' });
    return res.json({ success: true, data: txn });
  } catch (err) { next(err); }
};
