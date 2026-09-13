import FeeDemand from '../models/FeeDemand.js';
import LateFeeRule from '../models/LateFeeRule.js';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * getDaysOverdue — Returns days past the due date (0 if not overdue)
 */
export const getDaysOverdue = (dueDate) => {
  const now = new Date();
  const due = new Date(dueDate);
  if (now <= due) return 0;
  return Math.floor((now - due) / MS_PER_DAY);
};

/**
 * calculateLateFee — Computes new late fee for a demand based on its rule.
 * Returns the incremental penalty to apply today (paise).
 */
export const isSameCalendarDay = (date1, date2) => {
  if (!date1 || !date2) return false;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export const calculateLateFee = (demand, rule) => {
  const daysOverdue = getDaysOverdue(demand.dueDate);

  if (daysOverdue <= rule.effectiveAfterDays) return 0;

  // Idempotency guard: If late fee was already accrued on this demand today, do not accrue twice on same calendar day
  if (demand.lastLateFeeAppliedAt && isSameCalendarDay(demand.lastLateFeeAppliedAt, new Date())) {
    return 0;
  }

  let penalty = 0;

  if (rule.ruleType === 'flat') {
    // Flat fee is one-time — only apply if no late fee has been accrued yet
    if (demand.lateFeeAccrued === 0) {
      penalty = rule.flatAmount;
    }
  } else if (rule.ruleType === 'dailyPercentage') {
    // Daily percentage on outstanding principal (1 day's worth for BullMQ midnight job)
    penalty = Math.round(demand.outstandingAmount * (rule.dailyRate / 100));
  }

  // Apply cap
  const totalAfterPenalty = demand.lateFeeAccrued + penalty;
  if (rule.maxCap > 0 && totalAfterPenalty > rule.maxCap) {
    penalty = Math.max(0, rule.maxCap - demand.lateFeeAccrued);
  }

  return penalty;
};

/**
 * processOverdueDemands — Called by the midnight BullMQ job.
 * Fetches all overdue demands, applies their penalty rules, and returns
 * an array of { demand, penalty } for the job to post ledger entries.
 */
export const getOverdueDemandsWithPenalties = async () => {
  const now = new Date();

  // Find demands past due date, not fully paid, with a late fee rule
  const demands = await FeeDemand.find({
    status: { $in: ['pending', 'partial', 'overdue'] },
    dueDate: { $lt: now },
    outstandingAmount: { $gt: 0 },
    lateFeeRule: { $exists: true, $ne: null },
  }).populate('lateFeeRule');

  const results = [];

  for (const demand of demands) {
    if (!demand.lateFeeRule) continue;
    // Skip if already processed today
    if (demand.lastLateFeeAppliedAt && isSameCalendarDay(demand.lastLateFeeAppliedAt, now)) {
      continue;
    }
    const penalty = calculateLateFee(demand, demand.lateFeeRule);
    if (penalty > 0) {
      results.push({ demand, penalty });
    }
  }

  return results;
};

/**
 * applyLateFeeToDemand — Updates the demand's lateFeeAccrued field.
 * Called after ledger entry is posted successfully.
 */
export const applyLateFeeToDemand = async (demandId, penalty, session) => {
  return FeeDemand.findByIdAndUpdate(
    demandId,
    {
      $inc: { lateFeeAccrued: penalty },
      status: 'overdue',
      lastLateFeeAppliedAt: new Date(),
    },
    { session, new: true }
  );
};

// Backwards compatibility alias for any legacy imports
export const applyLateFeeToDeamnd = applyLateFeeToDemand;

