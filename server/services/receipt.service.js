import crypto from 'crypto';
import Receipt from '../models/Receipt.js';

/**
 * generateReceiptNumber — Sequential receipt number with prefix
 * Format: LGX-YYYY-XXXXXXXX
 */
export const generateReceiptNumber = async () => {
  const year = new Date().getFullYear();
  const count = await Receipt.countDocuments();
  const seq = String(count + 1).padStart(8, '0');
  return `LGX-${year}-${seq}`;
};

/**
 * generateSHA256Hash — Tamper-proof receipt integrity hash
 */
export const generateSHA256Hash = (receiptNumber, studentId, amountPaid, issuedAt) => {
  const salt = process.env.RECEIPT_HASH_SALT || 'ledgerx_default_salt';
  const payload = `${receiptNumber}|${studentId}|${amountPaid}|${issuedAt.toISOString()}|${salt}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
};

/**
 * issueReceipt — Creates and persists a verifiable receipt.
 */
export const issueReceipt = async ({
  transaction,
  student,
  demand,
  amountPaid,
  components,
  academicYear,
  semester,
  paymentMethod,
  paymentReference,
}, session) => {
  const receiptNumber = await generateReceiptNumber();
  const issuedAt = new Date();
  const sha256Hash = generateSHA256Hash(
    receiptNumber,
    student._id.toString(),
    amountPaid,
    issuedAt
  );

  const verificationUrl = `/api/receipts/${receiptNumber}/verify`;

  const receipt = await Receipt.create([{
    receiptNumber,
    transaction: transaction._id,
    student: student._id,
    demand: demand._id,
    amountPaid,
    components,
    paymentMethod,
    paymentReference,
    academicYear,
    semester,
    sha256Hash,
    verificationUrl,
    issuedAt,
  }], { session });

  return receipt[0];
};

/**
 * verifyReceiptHash — Checks if a receipt's hash is valid.
 */
export const verifyReceiptHash = async (receiptNumber) => {
  const receipt = await Receipt.findOne({ receiptNumber })
    .populate('student', '_id');

  if (!receipt) return { valid: false, reason: 'Receipt not found' };

  const expectedHash = generateSHA256Hash(
    receipt.receiptNumber,
    receipt.student._id.toString(),
    receipt.amountPaid,
    receipt.issuedAt
  );

  const valid = expectedHash === receipt.sha256Hash;
  return {
    valid,
    receipt: valid ? receipt : null,
    reason: valid ? null : 'Hash mismatch — receipt may have been tampered with',
  };
};
