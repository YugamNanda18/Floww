import mongoose from 'mongoose';

const lateFeeRuleSchema = new mongoose.Schema({
  feeStructure: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeStructure', required: true },

  ruleType: {
    type: String,
    enum: ['flat', 'dailyPercentage'],
    required: true,
  },

  // Flat rule: charge a one-time fixed late fee
  flatAmount: { type: Number, default: 0 }, // paise

  // Daily percentage rule: charge X% of outstanding per day
  dailyRate: { type: Number, default: 0 }, // e.g., 0.5 = 0.5%

  // Cap the maximum late fee
  maxCap: { type: Number, default: 0 }, // paise, 0 = no cap

  // Days after due date to start charging
  effectiveAfterDays: { type: Number, default: 0 },

  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

const LateFeeRule = mongoose.model('LateFeeRule', lateFeeRuleSchema);
export default LateFeeRule;
