import mongoose from 'mongoose';

const timeSlotSchema = new mongoose.Schema({
  slotNumber: { type: Number, required: true }, // 1 to 6
  startTime: { type: String, required: true },  // e.g. "08:00"
  endTime: { type: String, required: true },    // e.g. "09:00"
  subjectCode: { type: String, required: true },
  subjectName: { type: String, required: true },
  facultyName: { type: String, required: true },
  room: { type: String, required: true },       // e.g. "LH-201" or "CS-Lab 3"
  type: { type: String, enum: ['lecture', 'lab', 'tutorial'], default: 'lecture' },
}, { _id: false });

const dayScheduleSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: true,
  },
  slots: [timeSlotSchema],
}, { _id: false });

const timetableSchema = new mongoose.Schema({
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  semester: { type: Number, required: true, min: 1, max: 8 },
  academicYear: { type: String, required: true },
  collegeHours: {
    type: String,
    default: '08:00 AM - 03:00 PM',
  },
  lunchBreak: {
    type: String,
    default: '11:15 AM - 12:00 PM',
  },
  weeklySchedule: [dayScheduleSchema],
}, {
  timestamps: true,
});

timetableSchema.index({ department: 1, semester: 1, academicYear: 1 }, { unique: true });

const Timetable = mongoose.model('Timetable', timetableSchema);
export default Timetable;
