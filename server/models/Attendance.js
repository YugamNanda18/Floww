import mongoose from 'mongoose';

const subjectAttendanceSchema = new mongoose.Schema({
  subjectCode: { type: String, required: true },
  subjectName: { type: String, required: true },
  facultyName: { type: String, required: true },
  credits: { type: Number, default: 4 },
  totalClasses: { type: Number, required: true, default: 0 },
  attendedClasses: { type: Number, required: true, default: 0 },
  percentage: { type: Number, default: 0 },
  isShortage: { type: Boolean, default: false }, // true if < 75%
  classesToAttendFor75: { type: Number, default: 0 }, // consecutive classes needed
  classesCanBunkFor75: { type: Number, default: 0 },   // classes safe to leave
}, { _id: false });

const attendanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  semester: { type: Number, required: true },
  academicYear: { type: String, required: true },
  overallPercentage: { type: Number, default: 0 },
  hasShortage: { type: Boolean, default: false }, // any subject < 75%
  subjects: [subjectAttendanceSchema],
  lastUpdated: { type: Date, default: Date.now },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

attendanceSchema.pre('save', function (next) {
  let totalAll = 0;
  let attendedAll = 0;
  let anyShortage = false;

  this.subjects.forEach(sub => {
    const total = sub.totalClasses || 0;
    const attended = sub.attendedClasses || 0;
    const pct = total > 0 ? parseFloat(((attended / total) * 100).toFixed(1)) : 0;
    sub.percentage = pct;
    sub.isShortage = pct < 75;
    if (pct < 75) anyShortage = true;

    // Smart 75% calculations:
    // If < 75%: classes to attend = ceil((0.75 * total - attended) / 0.25) = ceil(3*total - 4*attended)
    if (pct < 75) {
      const needed = Math.max(0, Math.ceil(3 * total - 4 * attended));
      sub.classesToAttendFor75 = needed;
      sub.classesCanBunkFor75 = 0;
    } else {
      // If >= 75%: classes can leave = floor((attended - 0.75 * total) / 0.75) = floor((4*attended - 3*total) / 3)
      const canLeave = Math.max(0, Math.floor((4 * attended - 3 * total) / 3));
      sub.classesCanBunkFor75 = canLeave;
      sub.classesToAttendFor75 = 0;
    }

    totalAll += total;
    attendedAll += attended;
  });

  this.overallPercentage = totalAll > 0 ? parseFloat(((attendedAll / totalAll) * 100).toFixed(1)) : 0;
  this.hasShortage = anyShortage;
  this.lastUpdated = new Date();
  next();
});

attendanceSchema.index({ student: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;
