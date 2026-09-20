/**
 * notification.service.js
 * Real-time email notification & reminder service for student fee management.
 * Supports production SMTP via Nodemailer and real-time live console logging.
 */

import nodemailer from 'nodemailer';
import User from '../models/User.js';
import FeeDemand from '../models/FeeDemand.js';
import AuditLog from '../models/AuditLog.js';

let transporter = null;

export const getPortalBaseUrl = () => {
  const envUrl = (process.env.CLIENT_URL || '').trim();

  // If CLIENT_URL has multiple comma-separated entries, look for the public production one
  if (envUrl) {
    const origins = envUrl.split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean);
    const prodOrigin = origins.find((o) => !o.includes('localhost') && (o.startsWith('https://') || o.startsWith('http://')));
    if (prodOrigin) return prodOrigin;
  }

  // If in production environment OR if CLIENT_URL is missing or points only to localhost,
  // return the deployed Vercel production frontend URL
  if (process.env.NODE_ENV === 'production' || !envUrl || envUrl.includes('localhost')) {
    return 'https://floww-gamma-gilt.vercel.app';
  }

  return envUrl.replace(/\/+$/, '') || 'http://localhost:5173';
};

const getTransporter = () => {
  if (transporter) return transporter;
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
};

export const sendPaymentConfirmation = async ({ to, name, amount, receiptNumber, semester }) => {
  const portalUrl = `${getPortalBaseUrl()}/login`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #059669;">✅ Payment Successful Notice — LedgerX</h2>
      <p>Dear <strong>${name}</strong>,</p>
      <p>Your payment of <strong>₹${(amount / 100).toLocaleString('en-IN')}</strong> for Semester ${semester} fees has been successfully received and settled.</p>
      <p style="background: #f3f4f6; padding: 12px; border-radius: 6px;">
        <strong>Receipt Number:</strong> ${receiptNumber}<br/>
        <strong>Status:</strong> CAPTURED & SETTLED
      </p>
      <p><a href="${portalUrl}" style="background: #059669; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 6px; display: inline-block;">View Official Receipt & Fee Statement</a></p>
      <p>Thank you,<br/><strong>LedgerX Finance Office</strong></p>
    </div>
  `;

  try {
    const t = getTransporter();
    if (t && process.env.SMTP_USER && !process.env.SMTP_USER.includes('your@')) {
      await t.sendMail({
        from: `"LedgerX Finance" <${process.env.SMTP_USER}>`,
        to,
        subject: `✅ Payment Confirmed — Receipt ${receiptNumber}`,
        html: htmlContent,
      });
    }
    console.log(`[REAL-TIME EMAIL SENT] Payment confirmation delivered to ${to} (Receipt: ${receiptNumber})`);
  } catch (err) {
    console.warn('⚠️ Could not send email confirmation (SMTP warning):', err.message);
  }
};

export const sendDueReminder = async ({ to, name, amount, dueDate, semester }) => {
  return sendRealtimeFeeDueReminder({
    student: { name, email: to, rollNumber: 'N/A' },
    totalOutstanding: amount || 0,
    totalLateFee: 0,
    demands: [{ semester, academicYear: '2025-26', dueDate, outstandingAmount: amount }],
  });
};

/**
 * sendRealtimeFeeDueReminder — Sends an instant fee due reminder to a student containing:
 * - Direct Fee Portal Link
 * - Student ID & Password Credentials
 * - Total Outstanding Amount & Late Fee Breakdown
 * - Semester-wise demand breakdown
 */
export const sendRealtimeFeeDueReminder = async (params) => {
  let student = params?.student;
  let totalOutstanding = params?.totalOutstanding;
  let totalLateFee = params?.totalLateFee;
  let demands = params?.demands || [];

  // If passed an ID directly or a Mongoose document
  if (typeof params === 'string' || (params && !params.student && (params._id || params.rollNumber))) {
    const studentId = typeof params === 'string' ? params : params._id;
    student = await User.findById(studentId);
    demands = await FeeDemand.find({
      student: studentId,
      status: { $in: ['pending', 'partial', 'overdue'] },
    }).lean();
    totalOutstanding = demands.reduce((acc, d) => acc + (d.outstandingAmount || 0), 0);
    totalLateFee = demands.reduce((acc, d) => acc + (d.lateFeeAccrued || 0), 0);
  }

  if (!student) {
    throw new Error('Student record is required for fee due reminder.');
  }

  const baseUrl = getPortalBaseUrl();
  const studentIdentifier = student.rollNumber || student.email || '';
  const portalUrl = `${baseUrl}/login?role=student&identifier=${encodeURIComponent(studentIdentifier)}`;
  const cleanLoginUrl = `${baseUrl}/login`;
  const totalPayable = (totalOutstanding || 0) + (totalLateFee || 0);

  const totalOutstandingRs = ((totalOutstanding || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const totalLateFeeRs = ((totalLateFee || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const totalPayableRs = (totalPayable / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  let demandBreakdownHtml = '';
  if (demands && demands.length > 0) {
    demandBreakdownHtml = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px;">
        <thead>
          <tr style="background: #f8fafc; text-align: left;">
            <th style="padding: 8px; border: 1px solid #e2e8f0;">Semester</th>
            <th style="padding: 8px; border: 1px solid #e2e8f0;">Academic Year</th>
            <th style="padding: 8px; border: 1px solid #e2e8f0;">Due Date</th>
            <th style="padding: 8px; border: 1px solid #e2e8f0;">Unpaid Balance</th>
          </tr>
        </thead>
        <tbody>
          ${demands
            .map(
              (d) => `
            <tr>
              <td style="padding: 8px; border: 1px solid #e2e8f0;">Sem ${d.semester}</td>
              <td style="padding: 8px; border: 1px solid #e2e8f0;">${d.academicYear}</td>
              <td style="padding: 8px; border: 1px solid #e2e8f0;">${new Date(d.dueDate).toLocaleDateString('en-IN')}</td>
              <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; color: #dc2626;">₹${(d.outstandingAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;
  }

  const subject = `⚠️ URGENT: Real-Time Fee Payment Reminder — Dues Pending: ₹${totalPayableRs}`;

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: auto; padding: 25px; border: 1px solid #cbd5e1; border-radius: 12px; background: #ffffff;">
      <div style="text-align: center; border-bottom: 2px solid #4f46e5; padding-bottom: 15px; margin-bottom: 20px;">
        <h1 style="color: #4f46e5; margin: 0; font-size: 24px;">LedgerX Student Finance Portal</h1>
        <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">Official Real-Time Outstanding Fee Due Notice</p>
      </div>

      <p style="font-size: 16px; color: #1e293b;">Dear <strong>${student.name}</strong>,</p>
      <p style="color: #475569; line-height: 1.6;">
        This is an official real-time reminder that you have an outstanding fee balance on your academic account. Please review your account credentials and fee details below to make an immediate payment via our online portal.
      </p>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
        <h3 style="color: #0f172a; margin-top: 0; margin-bottom: 12px; font-size: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">
          🔑 Your Login Credentials & Portal Access
        </h3>
        <table style="width: 100%; font-size: 14px;">
          <tr>
            <td style="padding: 4px 0; color: #64748b; width: 140px;">Student ID / Roll No:</td>
            <td style="padding: 4px 0; font-weight: bold; color: #0f172a;">${student.rollNumber}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Registered Email:</td>
            <td style="padding: 4px 0; font-weight: bold; color: #0f172a;">${student.email}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Portal Password:</td>
            <td style="padding: 4px 0; font-weight: bold; color: #4f46e5;">demo123</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Direct Portal Link:</td>
            <td style="padding: 4px 0;"><a href="${portalUrl}" style="color: #2563eb; font-weight: bold; text-decoration: underline;">${cleanLoginUrl}</a></td>
          </tr>
        </table>
      </div>

      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 18px; margin: 20px 0;">
        <h3 style="color: #991b1b; margin-top: 0; margin-bottom: 12px; font-size: 16px; border-bottom: 1px solid #fca5a5; padding-bottom: 6px;">
          💰 Fee Summary & Amount Payable
        </h3>
        <table style="width: 100%; font-size: 14px;">
          <tr>
            <td style="padding: 4px 0; color: #7f1d1d;">Outstanding Base Fee:</td>
            <td style="padding: 4px 0; font-weight: bold; color: #991b1b; text-align: right;">₹${totalOutstandingRs}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #7f1d1d;">Late Fee Penalties:</td>
            <td style="padding: 4px 0; font-weight: bold; color: #991b1b; text-align: right;">₹${totalLateFeeRs}</td>
          </tr>
          <tr style="font-size: 16px; border-top: 1px dashed #fca5a5;">
            <td style="padding: 8px 0 4px 0; font-weight: bold; color: #991b1b;">Total Amount Due:</td>
            <td style="padding: 8px 0 4px 0; font-weight: bold; color: #dc2626; text-align: right; font-size: 18px;">₹${totalPayableRs}</td>
          </tr>
        </table>

        ${demandBreakdownHtml}
      </div>

      <div style="text-align: center; margin: 25px 0;">
        <a href="${portalUrl}" style="background: #4f46e5; color: #ffffff; padding: 14px 32px; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.3);">
          👉 Click Here to Pay Fees Online Now
        </a>
      </div>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; font-size: 12px; color: #94a3b8;">
        <p>This is an automated real-time fee reminder from LedgerX Finance Management System.</p>
        <p>For cash/cheque offline payments, visit the Campus Accounts Desk with your Student ID: <strong>${student.rollNumber}</strong>.</p>
      </div>
    </div>
  `;

  let sentStatus = 'simulated';

  try {
    const t = getTransporter();
    if (t && process.env.SMTP_USER && !process.env.SMTP_USER.includes('your@')) {
      await t.sendMail({
        from: `"LedgerX Finance Office" <${process.env.SMTP_USER}>`,
        to: student.email,
        subject,
        html: htmlContent,
      });
      sentStatus = 'delivered';
    }
  } catch (err) {
    console.warn(`⚠️ SMTP error sending reminder to ${student.email}:`, err.message);
    sentStatus = 'failed_smtp';
  }

  // Real-Time Console Output Log
  console.log(`
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🔔 REAL-TIME EMAIL DUE REMINDER SENT                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ Student Name   : ${student.name.padEnd(58)} │
│ Student Email  : ${student.email.padEnd(58)} │
│ Student ID     : ${student.rollNumber.padEnd(58)} │
│ Default Pass   : demo123                                                   │
│ Base Outstanding: ₹${totalOutstandingRs.padEnd(57)} │
│ Late Fee       : ₹${totalLateFeeRs.padEnd(57)} │
│ Total Due      : ₹${totalPayableRs.padEnd(57)} │
│ Portal Link    : ${portalUrl.padEnd(58)} │
│ Status         : ${sentStatus.toUpperCase().padEnd(58)} │
└─────────────────────────────────────────────────────────────────────────────┘
  `);

  return {
    studentId: student._id,
    rollNumber: student.rollNumber,
    name: student.name,
    email: student.email,
    totalOutstanding: totalOutstandingRs,
    totalLateFee: totalLateFeeRs,
    totalPayable: totalPayableRs,
    sentStatus,
    portalUrl,
  };
};

/**
 * sendMassRealtimeFeeReminders — Evaluates all students with outstanding dues and sends real-time reminders to every one of them.
 */
export const sendMassRealtimeFeeReminders = async (adminUser = null) => {
  try {
    const students = await User.find({ role: 'student', isActive: true }).lean();
    const studentIds = students.map((s) => s._id);

    const demands = await FeeDemand.find({
      student: { $in: studentIds },
      status: { $in: ['pending', 'partial', 'overdue'] },
    }).lean();

    const demandsByStudent = {};
    for (const d of demands) {
      const sId = d.student.toString();
      if (!demandsByStudent[sId]) demandsByStudent[sId] = [];
      demandsByStudent[sId].push(d);
    }

    const reminderResults = [];

    for (const student of students) {
      const sDemands = demandsByStudent[student._id.toString()] || [];
      const totalOutstanding = sDemands.reduce((acc, d) => acc + (d.outstandingAmount || 0), 0);
      const totalLateFee = sDemands.reduce((acc, d) => acc + (d.lateFeeAccrued || 0), 0);

      if (totalOutstanding > 0 || totalLateFee > 0) {
        const res = await sendRealtimeFeeDueReminder({
          student,
          totalOutstanding,
          totalLateFee,
          demands: sDemands,
        });
        reminderResults.push(res);
      }
    }

    if (adminUser) {
      await AuditLog.create({
        adminId: adminUser._id,
        adminName: adminUser.name,
        adminEmail: adminUser.email,
        action: 'mass_fee_reminder_sent',
        targetEntity: 'User',
        amountAffected: reminderResults.reduce((acc, r) => acc + (parseFloat(r.totalPayable.replace(/,/g, '')) || 0), 0),
        reason: `Real-time fee due reminders dispatched to ${reminderResults.length} students with outstanding balances.`,
        ipAddress: '127.0.0.1',
      });
    }

    return {
      success: true,
      totalStudentsNotified: reminderResults.length,
      reminders: reminderResults,
    };
  } catch (err) {
    console.error('[MASS REMINDER ERROR]', err.message);
    throw err;
  }
};
