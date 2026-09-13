import mongoose from 'mongoose';

const demandComponentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  demandedAmount: { type: Number, required: true }, // paise
  paidAmount: { type: Number, default: 0 },         // paise
  waivedAmount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'waived'],
    default: 'pending',
  },
}, { _id: false });

const feeDemandSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  feeStructure: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeStructure', required: true },

  semester: { type: Number, required: true, min: 1, max: 8 },
  academicYear: { type: String, required: true },
  dueDate: { type: Date, required: true },

  components: [demandComponentSchema],

  totalDemanded: { type: Number, required: true },   // paise
  totalPaid: { type: Number, default: 0 },           // paise
  totalWaived: { type: Number, default: 0 },         // paise
  outstandingAmount: { type: Number },               // computed: demanded - paid - waived

  // Late fee tracking
  lateFeeAccrued: { type: Number, default: 0 },      // paise, cumulative
  lateFeeRule: { type: mongoose.Schema.Types.ObjectId, ref: 'LateFeeRule' },
  lastLateFeeAppliedAt: { type: Date },

  // Scholarship
  scholarshipAmount: { type: Number, default: 0 },
  scholarshipAppliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  scholarshipReason: { type: String },

  status: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'overdue', 'waived'],
    default: 'pending',
  },

  installmentPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'InstallmentPlan' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Indexes
feeDemandSchema.index({ student: 1, semester: 1, academicYear: 1 });
feeDemandSchema.index({ status: 1, dueDate: 1 });

// Auto-compute outstanding and sync status
feeDemandSchema.pre('save', function (next) {
  this.outstandingAmount = Math.max(
    0,
    this.totalDemanded - this.totalPaid - this.totalWaived - (this.scholarshipAmount || 0)
  );

  if (this.outstandingAmount === 0 && (!this.lateFeeAccrued || this.lateFeeAccrued === 0)) {
    this.status = 'paid';
  } else if (this.status !== 'paid') {
    if (new Date() > new Date(this.dueDate) && (this.outstandingAmount > 0 || (this.lateFeeAccrued || 0) > 0)) {
      this.status = 'overdue';
    } else if (this.totalPaid > 0 || (this.scholarshipAmount || 0) > 0) {
      this.status = 'partial';
    } else {
      this.status = 'pending';
    }
  }

  next();
});

const FeeDemand = mongoose.model('FeeDemand', feeDemandSchema);
export default FeeDemand;
