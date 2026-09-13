import mongoose from 'mongoose';

const cautionMoneySchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

  depositAmount: { type: Number, required: true }, // paise
  depositDate: { type: Date, required: true },
  depositReceipt: { type: mongoose.Schema.Types.ObjectId, ref: 'Receipt' },

  status: {
    type: String,
    enum: ['held', 'refunded', 'forfeited'],
    default: 'held',
  },

  // Refund details
  refundAmount: { type: Number, default: 0 },
  refundDate: { type: Date },
  refundApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  refundTransactionRef: { type: String },
  refundMode: { type: String, enum: ['bank_transfer', 'cheque', 'cash', ''] },
  forfeitureReason: { type: String },

  notes: { type: String },
}, {
  timestamps: true,
});

cautionMoneySchema.index({ student: 1 });
cautionMoneySchema.index({ status: 1 });

const CautionMoney = mongoose.model('CautionMoney', cautionMoneySchema);
export default CautionMoney;
