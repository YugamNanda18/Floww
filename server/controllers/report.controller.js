import LedgerEntry from '../models/LedgerEntry.js';
import FeeDemand from '../models/FeeDemand.js';
import CautionMoney from '../models/CautionMoney.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

/**
 * getBalanceSheet — Vertical Capital Employed format balance sheet.
 *
 * SOURCES OF FUNDS
 *   Corpus / Reserves                X
 *   Long-Term Liabilities            X
 *                              ─────────
 *   Total Capital Employed           X
 *                              ═════════
 * APPLICATION OF FUNDS
 *   Fixed Assets                     X
 *   Current Assets
 *     Fee Receivables                X
 *     Bank Balance                   X
 *     Caution Money Held             X
 *   Less: Current Liabilities
 *     Refunds Payable               (X)
 *     Unearned Income               (X)
 *                              ─────────
 *   Net Current Assets               X
 *   Total Assets Employed            X
 *                              ═════════
 */
export const getBalanceSheet = async (req, res, next) => {
  try {
    const { academicYear } = req.query;
    const matchYear = academicYear ? { academicYear } : {};

    // Aggregate ledger account balances
    const accountTotals = await LedgerEntry.aggregate([
      {
        $group: {
          _id: { account: '$account', type: '$type' },
          total: { $sum: '$amount' },
        },
      },
    ]);

    const balances = {};
    for (const row of accountTotals) {
      const acc = row._id.account;
      if (!balances[acc]) balances[acc] = { debit: 0, credit: 0 };
      balances[acc][row._id.type] += row.total;
    }

    const net = (account) => {
      const b = balances[account] || { debit: 0, credit: 0 };
      return b.debit - b.credit;
    };

    // Fee receivables = outstanding balances
    const feeReceivables = await FeeDemand.aggregate([
      { $group: { _id: null, total: { $sum: '$outstandingAmount' } } },
    ]);

    // Bank balance = net credit to "Bank / Cash"
    const bankBalance = Math.abs(net('Bank / Cash'));

    // Caution money held
    const cautionHeld = await CautionMoney.aggregate([
      { $match: { status: 'held' } },
      { $group: { _id: null, total: { $sum: '$depositAmount' } } },
    ]);

    // Total fee income (collections)
    const feeIncome = await Transaction.aggregate([
      { $match: { status: 'captured' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // Late fee income
    const lateFeeIncome = await FeeDemand.aggregate([
      { $group: { _id: null, total: { $sum: '$lateFeeAccrued' } } },
    ]);

    // Caution money liability = all held deposits
    const cautionLiability = cautionHeld[0]?.total || 0;

    // Scholarship expense
    const scholarshipExpense = await FeeDemand.aggregate([
      { $group: { _id: null, total: { $sum: '$scholarshipAmount' } } },
    ]);

    const feeReceivablesAmt = feeReceivables[0]?.total || 0;
    const bankBalanceAmt = bankBalance;
    const cautionHeldAmt = cautionHeld[0]?.total || 0;
    const feeIncomeAmt = feeIncome[0]?.total || 0;
    const lateFeeIncomeAmt = lateFeeIncome[0]?.total || 0;
    const scholarshipExpAmt = scholarshipExpense[0]?.total || 0;
    const refundPayable = Math.abs(net('Refund Payable'));

    // SOURCES OF FUNDS
    const reserves = feeIncomeAmt + lateFeeIncomeAmt - scholarshipExpAmt;
    const longTermLiabilities = cautionLiability;
    const totalCapitalEmployed = reserves + longTermLiabilities;

    // APPLICATION OF FUNDS
    const currentAssets = feeReceivablesAmt + bankBalanceAmt + cautionHeldAmt;
    const currentLiabilities = refundPayable + cautionLiability;
    const netCurrentAssets = currentAssets - currentLiabilities;
    const totalAssetsEmployed = netCurrentAssets; // simplified (no fixed assets in demo)

    return res.json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        academicYear: academicYear || 'All Years',
        sourcesOfFunds: {
          label: 'SOURCES OF FUNDS',
          items: [
            { label: 'Fee Income Collected (Reserves & Surplus)', amount: feeIncomeAmt },
            { label: 'Late Fee Income', amount: lateFeeIncomeAmt },
            { label: 'Less: Scholarship Expense', amount: -scholarshipExpAmt },
            { label: 'Long-Term Liabilities (Caution Money)', amount: longTermLiabilities },
          ],
          total: { label: 'Total Capital Employed', amount: totalCapitalEmployed },
        },
        applicationOfFunds: {
          label: 'APPLICATION OF FUNDS',
          currentAssets: {
            label: 'Current Assets',
            items: [
              { label: 'Fee Receivables (Outstanding)', amount: feeReceivablesAmt },
              { label: 'Bank / Cash Balance', amount: bankBalanceAmt },
              { label: 'Caution Money Held', amount: cautionHeldAmt },
            ],
            total: currentAssets,
          },
          currentLiabilities: {
            label: 'Less: Current Liabilities',
            items: [
              { label: 'Refunds Payable', amount: -refundPayable },
              { label: 'Caution Money Liability', amount: -cautionLiability },
            ],
            total: -currentLiabilities,
          },
          netCurrentAssets: { label: 'Net Current Assets', amount: netCurrentAssets },
          total: { label: 'Total Assets Employed', amount: totalAssetsEmployed },
        },
      },
    });
  } catch (err) { next(err); }
};

export const getCollectionReport = async (req, res, next) => {
  try {
    const { academicYear, semester } = req.query;
    const filter = {};
    if (academicYear) filter.academicYear = academicYear;
    if (semester) filter.semester = parseInt(semester);

    const report = await FeeDemand.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { semester: '$semester', status: '$status' },
          totalDemanded: { $sum: '$totalDemanded' },
          totalPaid: { $sum: '$totalPaid' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.semester': 1 } },
    ]);

    return res.json({ success: true, data: report });
  } catch (err) { next(err); }
};

export const getRevenueReport = async (req, res, next) => {
  try {
    const report = await Transaction.aggregate([
      { $match: { status: 'captured' } },
      {
        $group: {
          _id: {
            year: { $year: '$capturedAt' },
            month: { $month: '$capturedAt' },
          },
          totalRevenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    return res.json({ success: true, data: report });
  } catch (err) { next(err); }
};
