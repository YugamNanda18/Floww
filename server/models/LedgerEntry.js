import mongoose from 'mongoose';

/**
 * LedgerEntry — Core Double-Entry Bookkeeping Model
 *
 * Every financial event posts TWO entries sharing the same journalId:
 *   DR  Account A  (amount)
 *   CR  Account B  (amount)
 *
 * Accounts used in LedgerX:
 *   - "Student Fee Receivable"   (asset — DR increases, CR decreases)
 *   - "Bank / Cash"              (asset — DR increases)
 *   - "Late Fee Receivable"      (asset)
 *   - "Late Fee Income"          (income — CR increases)
 *   - "Caution Money Liability"  (liability — CR increases on deposit)
 *   - "Scholarship Expense"      (expense — DR increases)
 *   - "Fee Income"               (income — CR increases)
 *   - "Refund Payable"           (liability)
 */

const ledgerEntrySchema = new mongoose.Schema({
  journalId: { type: String, required: true, index: true }, // groups debit + credit pair
  type: { type: String, required: true, enum: ['debit', 'credit'] },

  account: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 }, // paise
  currency: { type: String, default: 'INR' },

  // References
  relatedStudent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  relatedDemand: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeDemand' },
  relatedTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },

  narration: { type: String, required: true },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // null = SYSTEM (automated)
  },
  postedByLabel: { type: String, default: 'SYSTEM' }, // "SYSTEM" or admin name

  // Immutability flag — enforced at app layer
  isMutable: { type: Boolean, default: false },
  postedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

ledgerEntrySchema.index({ relatedStudent: 1, postedAt: -1 });
ledgerEntrySchema.index({ relatedDemand: 1 });
ledgerEntrySchema.index({ account: 1, postedAt: -1 });
ledgerEntrySchema.index({ journalId: 1, type: 1 });

// Block mutations on posted entries
ledgerEntrySchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], async function (next) {
  const doc = await this.model.findOne(this.getQuery());
  if (doc && !doc.isMutable) {
    return next(new Error('LedgerEntry is immutable and cannot be modified.'));
  }
  next();
});

const LedgerEntry = mongoose.model('LedgerEntry', ledgerEntrySchema);
export default LedgerEntry;
