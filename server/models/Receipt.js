import mongoose from 'mongoose';

const receiptComponentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: true }, // paise
}, { _id: false });

const receiptSchema = new mongoose.Schema({
  receiptNumber: { type: String, required: true, unique: true },

  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  demand: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeDemand', required: true },

  amountPaid: { type: Number, required: true },     // paise
  components: [receiptComponentSchema],

  paymentMethod: { type: String },
  paymentReference: { type: String },               // Razorpay payment ID or DD number

  academicYear: { type: String, required: true },
  semester: { type: Number, required: true },

  // Integrity
  sha256Hash: { type: String, required: true },
  verificationUrl: { type: String },

  issuedAt: { type: Date, default: Date.now },
  isVoid: { type: Boolean, default: false },
  voidReason: { type: String },
}, {
  timestamps: true,
});

receiptSchema.index({ student: 1, issuedAt: -1 });
receiptSchema.index({ receiptNumber: 1 });
receiptSchema.index({ sha256Hash: 1 });
receiptSchema.index({ transaction: 1 }, { unique: true });

const Receipt = mongoose.model('Receipt', receiptSchema);
export default Receipt;

