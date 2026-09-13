import AuditLog from '../models/AuditLog.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, action, adminId, targetId, dateFrom, dateTo } = req.query;
    const filter = {};

    if (action) filter.action = action;
    if (adminId) filter.adminId = adminId;
    if (targetId) filter.targetId = targetId;
    if (dateFrom || dateTo) {
      filter.timestamp = {};
      if (dateFrom) filter.timestamp.$gte = new Date(dateFrom);
      if (dateTo) filter.timestamp.$lte = new Date(dateTo);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .populate('adminId', 'name email role'),
      AuditLog.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: logs,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) { next(err); }
};
