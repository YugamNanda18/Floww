import mongoose from 'mongoose';

const installmentSlotSchema = new mongoose.Schema({
  slotNumber: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  amount: { type: Number, required: true }, // paise
  paidAmount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue'],
    default: 'pending',
  },
  paidAt: { type: Date },
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
}, { _id: false });

const installmentPlanSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g. "2-Part BNPL Plan"
  demand: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeDemand', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  installments: [installmentSlotSchema],

  totalAmount: { type: Number, required: true },   // paise
  paidSoFar: { type: Number, default: 0 },

  status: {
    type: String,
    enum: ['active', 'completed', 'defaulted', 'cancelled'],
    default: 'active',
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

installmentPlanSchema.index({ student: 1, status: 1 });
installmentPlanSchema.index({ demand: 1 });

const InstallmentPlan = mongoose.model('InstallmentPlan', installmentPlanSchema);
export default InstallmentPlan;
