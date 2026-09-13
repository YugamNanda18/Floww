import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  // Idempotency
  idempotencyKey: { type: String, required: true, unique: true },

  // Razorpay fields
  razorpayOrderId: { type: String, unique: true, sparse: true },
  razorpayPaymentId: { type: String, unique: true, sparse: true },
  razorpaySignature: { type: String },

  // Payment details
  amount: { type: Number, required: true },   // paise
  currency: { type: String, default: 'INR' },
  method: {
    type: String,
    enum: ['upi', 'netbanking', 'card', 'wallet', 'offline_dd', 'offline_challan', 'offline_cash'],
    required: true,
  },

  status: {
    type: String,
    enum: ['created', 'captured', 'failed', 'refunded', 'pending_approval'],
    default: 'created',
  },

  // References
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  demand: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeDemand', required: true },

  // Offline payment fields
  offlineDetails: {
    ddNumber: { type: String },
    challanNo: { type: String },
    bankBranch: { type: String },
    bankName: { type: String },
    instrumentDate: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    remarks: { type: String },
  },

  // Webhook / callback metadata
  webhookVerified: { type: Boolean, default: false },
  gatewayResponse: { type: mongoose.Schema.Types.Mixed },

  capturedAt: { type: Date },
  failureReason: { type: String },
}, {
  timestamps: true,
});

transactionSchema.index({ student: 1, createdAt: -1 });
transactionSchema.index({ demand: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ razorpayOrderId: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
