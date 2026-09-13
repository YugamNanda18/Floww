import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import LedgerEntry from '../models/LedgerEntry.js';
import FeeDemand from '../models/FeeDemand.js';
import { getSession } from '../config/db.js';

/**
 * postDoubleEntry — Posts a debit/credit pair in a single ACID transaction.
 *
 * @param {object} opts
 * @param {string} opts.debitAccount    - Account to debit
 * @param {string} opts.creditAccount   - Account to credit
 * @param {number} opts.amount          - Amount in paise
 * @param {string} opts.narration       - Description of the entry
 * @param {ObjectId} opts.studentId
 * @param {ObjectId} opts.demandId
 * @param {ObjectId} opts.transactionId
 * @param {ObjectId|null} opts.postedBy  - null for SYSTEM
 * @param {string} opts.postedByLabel
 * @param {ClientSession} [opts.session] - existing session (optional)
 */
export const postDoubleEntry = async ({
  debitAccount,
  creditAccount,
  amount,
  narration,
  studentId,
  demandId,
  transactionId,
  postedBy = null,
  postedByLabel = 'SYSTEM',
  session: existingSession = null,
}) => {
  const journalId = uuidv4();
  const useSession = existingSession || (await getSession());
  let ownSession = !existingSession;

  const run = async (session) => {
    const entries = await LedgerEntry.insertMany([
      {
        journalId,
        type: 'debit',
        account: debitAccount,
        amount,
        narration,
        relatedStudent: studentId,
        relatedDemand: demandId,
        relatedTransaction: transactionId,
        postedBy,
        postedByLabel,
        isMutable: false,
      },
      {
        journalId,
        type: 'credit',
        account: creditAccount,
        amount,
        narration,
        relatedStudent: studentId,
        relatedDemand: demandId,
        relatedTransaction: transactionId,
        postedBy,
        postedByLabel,
        isMutable: false,
      },
    ], session ? { session } : {});

    return entries;
  };

  if (ownSession) {
    let entries;
    try {
      await useSession.withTransaction(async () => {
        entries = await run(useSession);
      });
    } catch (txErr) {
      if (txErr.message?.includes('replica set member') || txErr.message?.includes('standalone')) {
        entries = await run(null);
      } else {
        throw txErr;
      }
    }
    await useSession.endSession();
    return entries;
  } else {
    return run(existingSession);
  }
};

/**
 * settleFeePayment — Full ACID payment settlement:
 * 1. Posts DR Student Fee Receivable / CR Bank:Cash
 * 2. Updates FeeDemand paid totals and status
 * Both ops in one session with standalone fallback.
 */
export const settleFeePayment = async ({
  studentId,
  demandId,
  transactionId,
  amountPaid, // paise
  postedBy = null,
  postedByLabel = 'SYSTEM',
}) => {
  const session = await getSession();

  const executeSettlement = async (sess) => {
    const journalId = uuidv4();

    // 1. Post double-entry
    await LedgerEntry.insertMany([
      {
        journalId,
        type: 'debit',
        account: 'Bank / Cash',
        amount: amountPaid,
        narration: `Fee payment received for demand ${demandId}`,
        relatedStudent: studentId,
        relatedDemand: demandId,
        relatedTransaction: transactionId,
        postedBy,
        postedByLabel,
      },
      {
        journalId,
        type: 'credit',
        account: 'Student Fee Receivable',
        amount: amountPaid,
        narration: `Fee payment received for demand ${demandId}`,
        relatedStudent: studentId,
        relatedDemand: demandId,
        relatedTransaction: transactionId,
        postedBy,
        postedByLabel,
      },
    ], sess ? { session: sess } : {});

    // 2. Update FeeDemand
    const demandQuery = FeeDemand.findById(demandId);
    if (sess) demandQuery.session(sess);
    const demand = await demandQuery;
    if (!demand) throw new Error('FeeDemand not found');

    // If late fee exists, absorb late fee first
    if (demand.lateFeeAccrued > 0) {
      const lateFeePayment = Math.min(demand.lateFeeAccrued, amountPaid);
      demand.lateFeeAccrued = Math.max(0, demand.lateFeeAccrued - lateFeePayment);
    }

    demand.totalPaid += amountPaid;
    demand.outstandingAmount = Math.max(
      0,
      demand.totalDemanded - demand.totalPaid - demand.totalWaived - (demand.scholarshipAmount || 0)
    );

    if (demand.outstandingAmount <= 0) {
      demand.status = 'paid';
      demand.lateFeeAccrued = 0;
    } else {
      demand.status = 'partial';
      // Flexi payment compliance: extend due date by 30 days so student is unblocked
      const graceExt = new Date();
      graceExt.setDate(graceExt.getDate() + 30);
      demand.dueDate = graceExt;
      demand.lateFeeAccrued = 0;
    }

    // Update individual component payments proportionally
    let remaining = amountPaid;
    for (const comp of demand.components) {
      if (remaining <= 0) break;
      const compOwed = comp.demandedAmount - comp.paidAmount - comp.waivedAmount;
      const pay = Math.min(compOwed, remaining);
      comp.paidAmount += pay;
      remaining -= pay;
      comp.status = comp.paidAmount >= comp.demandedAmount ? 'paid' : 'partial';
    }

    if (sess) {
      await demand.save({ session: sess });
    } else {
      await demand.save();
    }
    return demand;
  };

  try {
    let result;
    try {
      await session.withTransaction(async () => {
        result = await executeSettlement(session);
      });
    } catch (txErr) {
      if (txErr.message?.includes('replica set member') || txErr.message?.includes('standalone')) {
        result = await executeSettlement(null);
      } else {
        throw txErr;
      }
    }
    return result;
  } finally {
    await session.endSession();
  }
};

/**
 * postLateFeeEntry — Posts late fee DR/CR pair.
 */
export const postLateFeeEntry = async ({
  studentId,
  demandId,
  lateFeeAmount,
  session,
}) => {
  const journalId = uuidv4();

  await LedgerEntry.insertMany([
    {
      journalId,
      type: 'debit',
      account: 'Late Fee Receivable',
      amount: lateFeeAmount,
      narration: 'Automated late fee penalty accrual',
      relatedStudent: studentId,
      relatedDemand: demandId,
      postedBy: null,
      postedByLabel: 'SYSTEM',
    },
    {
      journalId,
      type: 'credit',
      account: 'Late Fee Income',
      amount: lateFeeAmount,
      narration: 'Automated late fee penalty accrual',
      relatedStudent: studentId,
      relatedDemand: demandId,
      postedBy: null,
      postedByLabel: 'SYSTEM',
    },
  ], { session });
};

/**
 * getStudentLedger — All ledger entries for a student.
 */
export const getStudentLedger = async (studentId, filters = {}) => {
  const query = { relatedStudent: studentId };
  if (filters.semester) query['relatedDemand'] = { $in: filters.demandIds || [] };

  return LedgerEntry.find(query)
    .sort({ postedAt: -1 })
    .populate('relatedTransaction', 'razorpayPaymentId method capturedAt offlineDetails')
    .populate('relatedDemand', 'semester academicYear');
};

/**
 * getInstituteLedger — Full double-entry ledger for admin view.
 */
export const getInstituteLedger = async ({ page = 1, limit = 50, account, dateFrom, dateTo }) => {
  const query = {};
  if (account) query.account = account;
  if (dateFrom || dateTo) {
    query.postedAt = {};
    if (dateFrom) query.postedAt.$gte = new Date(dateFrom);
    if (dateTo) query.postedAt.$lte = new Date(dateTo);
  }

  const [entries, total] = await Promise.all([
    LedgerEntry.find(query)
      .sort({ postedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('relatedStudent', 'name rollNumber')
      .populate('relatedDemand', 'semester academicYear'),
    LedgerEntry.countDocuments(query),
  ]);

  return { entries, total, page, pages: Math.ceil(total / limit) };
};
