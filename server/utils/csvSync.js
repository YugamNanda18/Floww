import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import '../models/index.js';
import User from '../models/User.js';
import FeeDemand from '../models/FeeDemand.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target CSV file path at the project root
const CSV_FILE_PATH = path.resolve(__dirname, '../../students_manual_test_roster.csv');

/**
 * Sync all student records and financial summaries from MongoDB to students_manual_test_roster.csv in real-time.
 */
export const syncStudentsToCsv = async () => {
  try {
    const students = await User.find({ role: 'student' })
      .populate('department', 'name code')
      .sort({ rollNumber: 1 })
      .lean();

    const studentIds = students.map((s) => s._id);

    const demands = await FeeDemand.find({ student: { $in: studentIds } }).lean();

    const demandsByStudent = {};
    for (const d of demands) {
      const sId = d.student.toString();
      if (!demandsByStudent[sId]) demandsByStudent[sId] = [];
      demandsByStudent[sId].push(d);
    }

    const headers = [
      'department',
      'year',
      'semester',
      'batch',
      'academicYear',
      'rollNumber',
      'name',
      'email',
      'password',
      'status',
      'totalDemanded',
      'totalPaid',
      'outstandingBalance',
      'lateFeeAccrued',
      'scholarshipConcession',
      'notes',
    ];

    const rows = [headers.join(',')];

    for (const s of students) {
      const sDemands = demandsByStudent[s._id.toString()] || [];
      const totalDemanded = sDemands.reduce((acc, d) => acc + (d.totalDemanded || 0), 0);
      const totalPaid = sDemands.reduce((acc, d) => acc + (d.totalPaid || 0), 0);
      const totalOutstanding = sDemands.reduce((acc, d) => acc + (d.outstandingAmount || 0), 0);
      const totalLateFee = sDemands.reduce((acc, d) => acc + (d.lateFeeAccrued || 0), 0);
      
      // Calculate scholarship concession across demands
      const scholarshipConcession = sDemands.reduce((acc, d) => {
        const dScholarship = (d.components || []).reduce((cAcc, comp) => cAcc + (comp.waivedAmount || 0), 0);
        return acc + dScholarship;
      }, 0);

      const isDefaulter = sDemands.some((d) => d.status === 'overdue');

      let statusStr = 'Pending';
      if (isDefaulter) {
        statusStr = 'Defaulter';
      } else if (totalOutstanding <= 0 && totalDemanded > 0) {
        statusStr = 'Paid';
      }

      const deptCode = s.department?.code || s.department?.name || 'CSE';
      const semesterVal = s.currentSemester || 1;
      const yearVal = Math.ceil(semesterVal / 2);
      const batchVal = s.batch || '2025-2029';
      
      // Derive Academic Year
      const acadYear = sDemands[0]?.academicYear || `20${25 - (yearVal - 1)}-${26 - (yearVal - 1)}`;

      const notesVal = s.bio || (totalOutstanding === 0 ? 'All Clear — Zero Dues Verified' : 'Standard Pending — Ready for Payment');

      const formatField = (val) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const formatRupee = (paise) => (paise ? Math.round(paise / 100) : 0);

      const row = [
        formatField(deptCode),
        formatField(yearVal),
        formatField(semesterVal),
        formatField(batchVal),
        formatField(acadYear),
        formatField(s.rollNumber),
        formatField(s.name),
        formatField(s.email),
        formatField('demo123'),
        formatField(statusStr),
        formatField(formatRupee(totalDemanded)),
        formatField(formatRupee(totalPaid)),
        formatField(formatRupee(totalOutstanding)),
        formatField(formatRupee(totalLateFee)),
        formatField(formatRupee(scholarshipConcession)),
        formatField(notesVal),
      ];

      rows.push(row.join(','));
    }

    const csvContent = rows.join('\n') + '\n';
    fs.writeFileSync(CSV_FILE_PATH, csvContent, 'utf8');
    console.log(`[CSV SYNC] Real-time updated ${students.length} student records into ${CSV_FILE_PATH}`);
  } catch (err) {
    console.error('[CSV SYNC ERROR] Failed to sync students to CSV:', err.message);
  }
};
