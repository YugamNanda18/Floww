import { getRedis } from '../config/redis.js';
import User from '../models/User.js';
import FeeDemand from '../models/FeeDemand.js';

/**
 * syncStudentToRedis — Writes full student profile and financial snapshot to Redis in real time.
 */
export const syncStudentToRedis = async (studentOrId) => {
  try {
    const redis = getRedis();
    if (!redis) return null;

    let student = studentOrId;
    if (typeof studentOrId === 'string' || studentOrId._bsontype || !student.email) {
      student = await User.findById(studentOrId).populate('department', 'name code annualFee');
    }

    if (!student || student.role !== 'student') return null;

    // Fetch financial snapshot
    const demands = await FeeDemand.find({ student: student._id }).lean();
    const totalDemanded = demands.reduce((acc, d) => acc + (d.totalDemanded || 0), 0);
    const totalPaid = demands.reduce((acc, d) => acc + (d.totalPaid || 0), 0);
    const outstandingAmount = demands.reduce((acc, d) => acc + (d.outstandingAmount || 0), 0);
    const lateFeeAccrued = demands.reduce((acc, d) => acc + (d.lateFeeAccrued || 0), 0);
    const isDefaulter = demands.some(
      (d) => d.status === 'overdue' || (d.outstandingAmount > 0 && new Date(d.dueDate) < new Date())
    );

    const sem = parseInt(student.currentSemester) || 1;
    const year = student.year || Math.ceil(sem / 2);
    const deptCode = student.department?.code || 'CSE';
    const deptName = student.department?.name || 'Computer Science and Engineering';
    const batch = student.batch || `20${25 - (year - 1)}-20${29 - (year - 1)}`;
    const academicYear = student.academicYear || `20${25 - (year - 1)}-${26 - (year - 1)}`;

    const cachePayload = {
      _id: student._id.toString(),
      name: student.name,
      email: student.email,
      rollNumber: student.rollNumber,
      department: {
        _id: student.department?._id?.toString() || '',
        code: deptCode,
        name: deptName,
      },
      branch: deptCode,
      currentSemester: sem,
      year: year,
      batch: batch,
      academicYear: academicYear,
      financials: {
        totalDemanded,
        totalPaid,
        outstandingAmount,
        lateFeeAccrued,
        isDefaulter,
        status: isDefaulter ? 'Defaulter' : outstandingAmount === 0 && totalDemanded > 0 ? 'Paid' : 'Pending',
      },
      phone: student.phone || '',
      guardianName: student.guardianName || '',
      updatedAt: new Date().toISOString(),
    };

    const sId = student._id.toString();

    // Redis Pipeline for atomic multi-key real-time update
    const pipeline = redis.pipeline();

    // 1. Primary Student Key (24hr TTL or permanent)
    pipeline.set(`student:${sId}`, JSON.stringify(cachePayload), 'EX', 86400 * 7);

    // 2. Roll number lookup
    if (student.rollNumber) {
      pipeline.set(`student:roll:${student.rollNumber.toUpperCase()}`, sId, 'EX', 86400 * 7);
    }

    // 3. Email lookup
    if (student.email) {
      pipeline.set(`student:email:${student.email.toLowerCase()}`, sId, 'EX', 86400 * 7);
    }

    // 4. Sets for Branch / Year / Semester
    pipeline.sadd('students:all', sId);
    pipeline.sadd(`dept:${deptCode}:students`, sId);
    pipeline.sadd(`dept:${deptCode}:sem:${sem}:students`, sId);
    pipeline.sadd(`dept:${deptCode}:year:${year}:students`, sId);
    pipeline.sadd(`batch:${batch}:students`, sId);

    // 5. Invalidate roster cache
    pipeline.del('cache:roster:summary');

    // 6. Real-time Pub/Sub broadcast
    pipeline.publish(
      'floww:realtime:students',
      JSON.stringify({
        event: 'student_updated',
        studentId: sId,
        rollNumber: student.rollNumber,
        branch: deptCode,
        semester: sem,
        year: year,
        timestamp: new Date().toISOString(),
      })
    );

    await pipeline.exec();
    return cachePayload;
  } catch (err) {
    console.warn('[RedisSync] Warning: Failed to sync student to Redis:', err.message);
    return null;
  }
};

/**
 * syncAllStudentsToRedis — Warms and synchronizes all MongoDB students to Redis.
 */
export const syncAllStudentsToRedis = async () => {
  try {
    const students = await User.find({ role: 'student' }).populate('department', 'name code');
    let synced = 0;
    for (const student of students) {
      await syncStudentToRedis(student);
      synced++;
    }
    console.log(`✅ [RedisSync] Real-time synced ${synced} students to Redis.`);
    return synced;
  } catch (err) {
    console.warn('[RedisSync] Bulk sync error:', err.message);
    return 0;
  }
};

/**
 * getStudentFromRedis — Fast memory-speed lookup from Redis with MongoDB fallback.
 */
export const getStudentFromRedis = async (studentId) => {
  try {
    const redis = getRedis();
    if (!redis) return null;
    const data = await redis.get(`student:${studentId}`);
    if (data) return JSON.parse(data);
  } catch (e) {
    // ignore
  }
  return null;
};
