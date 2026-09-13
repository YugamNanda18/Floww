import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true }, // e.g. "CSE", "ECE"
  head: { type: String, trim: true },
  totalSeats: { type: Number, default: 60 },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

departmentSchema.index({ code: 1 });

const Department = mongoose.model('Department', departmentSchema);
export default Department;
