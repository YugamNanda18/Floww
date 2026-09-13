import { getInstituteLedger, getStudentLedger } from '../services/ledger.service.js';
import FeeDemand from '../models/FeeDemand.js';

export const getInstituteLedgerHandler = async (req, res, next) => {
  try {
    const { page, limit, account, dateFrom, dateTo } = req.query;
    const result = await getInstituteLedger({ page: parseInt(page) || 1, limit: parseInt(limit) || 50, account, dateFrom, dateTo });
    return res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

export const getStudentLedgerHandler = async (req, res, next) => {
  try {
    const studentId = req.params.studentId || req.user._id;

    const { semester } = req.query;
    let demandIds = [];
    if (semester) {
      const demands = await FeeDemand.find({ student: studentId, semester: parseInt(semester) }).select('_id');
      demandIds = demands.map(d => d._id);
    }

    const entries = await getStudentLedger(studentId, { semester, demandIds });
    return res.json({ success: true, data: entries });
  } catch (err) { next(err); }
};
