import mongoose from 'mongoose';

const feeComponentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['Tuition', 'CRT', 'Development', 'Lab', 'Exam', 'Library', 'Sports', 'Hostel', 'Other'],
  },
  amount: { type: Number, required: true, min: 0 }, // stored in paise
  isOptional: { type: Boolean, default: false },
  description: { type: String },
}, { _id: false });

const feeStructureSchema = new mongoose.Schema({
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  batch: { type: String, required: true }, // "2022-2026"
  semester: { type: Number, required: true, min: 1, max: 8 },
  academicYear: { type: String, required: true }, // "2024-25"

  components: [feeComponentSchema],
  totalAmount: { type: Number, default: 0 }, // auto-sum of components (paise)

  dueDate: { type: Date, required: true },
  gracePeriodDays: { type: Number, default: 7 },

  isPublished: { type: Boolean, default: false },
  publishedAt: { type: Date },
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

// Ensure uniqueness per dept+batch+semester+year
feeStructureSchema.index({ department: 1, batch: 1, semester: 1, academicYear: 1 }, { unique: true });

// Auto-calculate total before validate
feeStructureSchema.pre('validate', function (next) {
  if (this.components && Array.isArray(this.components)) {
    this.totalAmount = this.components.reduce((sum, c) => sum + (c.amount || 0), 0);
  }
  next();
});

const FeeStructure = mongoose.model('FeeStructure', feeStructureSchema);
export default FeeStructure;
