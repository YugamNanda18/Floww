import { GoogleGenerativeAI } from '@google/generative-ai';
import FeeDemand from '../models/FeeDemand.js';
import LedgerEntry from '../models/LedgerEntry.js';
import Receipt from '../models/Receipt.js';

const getGenAI = () => new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * buildStudentContext — Assembles structured financial context for the student.
 */
const buildStudentContext = async (student) => {
  const [demands, entries, receipts] = await Promise.all([
    FeeDemand.find({ student: student._id })
      .sort({ semester: -1 })
      .populate('feeStructure', 'components')
      .populate('lateFeeRule')
      .lean(),
    LedgerEntry.find({ relatedStudent: student._id })
      .sort({ postedAt: -1 })
      .limit(20)
      .lean(),
    Receipt.find({ student: student._id })
      .sort({ issuedAt: -1 })
      .limit(10)
      .lean(),
  ]);

  return `
You are Floww AI, an expert financial concierge for ${student.name} (Roll: ${student.rollNumber || 'N/A'}).
Today is ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}.

=== STUDENT FEE DEMANDS ===
${demands.map(d => `
Semester ${d.semester} (${d.academicYear}):
  Status: ${d.status.toUpperCase()}
  Total Demanded: ₹${(d.totalDemanded / 100).toFixed(2)}
  Total Paid: ₹${(d.totalPaid / 100).toFixed(2)}
  Outstanding: ₹${(d.outstandingAmount / 100).toFixed(2)}
  Late Fee Accrued: ₹${(d.lateFeeAccrued / 100).toFixed(2)}
  Due Date: ${new Date(d.dueDate).toLocaleDateString('en-IN')}
  Components: ${d.components.map(c => `${c.name}: ₹${(c.demandedAmount/100).toFixed(2)} (Paid: ₹${(c.paidAmount/100).toFixed(2)})`).join(', ')}
`).join('\n')}

=== RECENT LEDGER ENTRIES (last 20) ===
${entries.map(e => `${e.type.toUpperCase()} | ${e.account} | ₹${(e.amount/100).toFixed(2)} | ${e.narration} | ${new Date(e.postedAt).toLocaleDateString('en-IN')}`).join('\n')}

=== RECENT RECEIPTS ===
${receipts.map(r => `Receipt ${r.receiptNumber}: ₹${(r.amountPaid/100).toFixed(2)} | Sem ${r.semester} | ${new Date(r.issuedAt).toLocaleDateString('en-IN')}`).join('\n')}

=== INSTRUCTIONS ===
Answer only questions related to this student's fee account. Be concise, accurate, and empathetic.
If asked to explain a late fee, cite the exact days overdue and the rule applied.
Format amounts as ₹X,XX,XXX.XX (Indian format). Never make up data not shown above.
  `.trim();
};

/**
 * chatWithGemini — Sends student context + user message to Gemini.
 */
export const chatWithGemini = async (student, userMessage) => {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const context = await buildStudentContext(student);

  const result = await model.generateContent({
    contents: [
      { role: 'user', parts: [{ text: context }] },
      { role: 'model', parts: [{ text: 'I understand. I have your complete fee account details. How can I help you?' }] },
      { role: 'user', parts: [{ text: userMessage }] },
    ],
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: 0.2,
    },
  });

  const response = result.response;
  return response.text();
};
