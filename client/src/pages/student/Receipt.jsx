import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import html2pdf from 'html2pdf.js';
import { Download, Shield, CheckCircle, XCircle, ArrowLeft, Printer } from 'lucide-react';
import api from '../../config/api.js';
import { PageSpinner } from '../../components/ui/Spinner.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';

const fmt = (p) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format((p || 0) / 100);

export default function StudentReceipt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const printRef = useRef(null);
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get(`/student/receipts/${id}`);
        setReceipt(res.data.data);
      } catch {
        toast.error('Receipt not found');
        navigate('/student/history');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleVerify = async () => {
    if (!receipt) return;
    setVerifying(true);
    try {
      const res = await api.get(`/student/receipts/${receipt.receiptNumber}/verify`);
      setVerified(res.data.data.valid);
      toast[res.data.data.valid ? 'success' : 'error'](
        res.data.data.valid ? '✅ Receipt is authentic' : '❌ Receipt integrity check failed'
      );
    } catch {
      toast.error('Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    const options = {
      margin: [10, 10],
      filename: `${receipt.receiptNumber}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };
    await html2pdf().from(printRef.current).set(options).save();
    toast.success('PDF downloaded!');
  };

  if (loading) return <PageSpinner />;
  if (!receipt) return null;

  const student = receipt.student;
  const demand = receipt.demand;
  const txn = receipt.transaction;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="btn-ghost btn-sm btn">
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex-1" />
        <Button variant="secondary" size="sm" onClick={handleVerify} loading={verifying} id="verify-receipt-btn">
          <Shield size={14} /> Verify SHA-256
        </Button>
        <Button variant="primary" size="sm" onClick={handleDownloadPDF} id="download-receipt-btn">
          <Download size={14} /> Download PDF
        </Button>
      </div>

      {verified !== null && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-2 p-3 rounded-xl text-sm ${verified ? 'bg-success-50 dark:bg-success-500/10 text-success-700' : 'bg-danger-50 dark:bg-danger-500/10 text-danger-600'}`}
        >
          {verified ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {verified ? 'This receipt is authentic and has not been tampered with.' : 'Hash mismatch — this receipt may have been altered.'}
        </motion.div>
      )}

      {/* Printable Receipt */}
      <div ref={printRef} className="card p-8 print:shadow-none">
        {/* Header */}
        <div className="flex items-start justify-between pb-6 border-b border-slate-200 dark:border-surface-700">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm flex items-center justify-center p-0.5 shrink-0">
                <img src="/floww-logo.png" alt="Floww" className="w-full h-full object-contain" />
              </div>
              <div>
                <p className="font-bold text-lg text-[var(--text-primary)]">Floww</p>
                <p className="text-xs text-[var(--text-muted)]">College Finance & Academic Treasury System</p>
              </div>
            </div>
            <p className="text-sm font-bold text-[var(--text-primary)]">OFFICIAL FEE RECEIPT</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-bold text-brand-500">{receipt.receiptNumber}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {new Date(receipt.issuedAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}
            </p>
            <Badge variant="success" className="mt-2">PAID</Badge>
          </div>
        </div>

        {/* Student Info */}
        <div className="grid grid-cols-2 gap-6 py-6 border-b border-slate-200 dark:border-surface-700">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Student Details</h3>
            <p className="font-semibold text-[var(--text-primary)]">{student?.name}</p>
            <p className="text-sm text-[var(--text-secondary)]">{student?.rollNumber}</p>
            <p className="text-sm text-[var(--text-secondary)]">{student?.email}</p>
            <p className="text-sm text-[var(--text-secondary)]">Batch: {student?.batch}</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Payment Details</h3>
            <p className="text-sm text-[var(--text-secondary)]"><strong>Semester:</strong> {receipt.semester}</p>
            <p className="text-sm text-[var(--text-secondary)]"><strong>Academic Year:</strong> {receipt.academicYear}</p>
            <p className="text-sm text-[var(--text-secondary)]"><strong>Method:</strong> {receipt.paymentMethod}</p>
            {receipt.paymentReference && (
              <p className="text-sm text-[var(--text-secondary)]"><strong>Reference:</strong> <span className="font-mono">{receipt.paymentReference}</span></p>
            )}
          </div>
        </div>

        {/* Fee Components */}
        <div className="py-6 border-b border-slate-200 dark:border-surface-700">
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-4">Fee Breakdown</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-surface-700">
                <th className="text-left py-2 font-medium text-[var(--text-secondary)]">Component</th>
                <th className="text-right py-2 font-medium text-[var(--text-secondary)]">Amount</th>
              </tr>
            </thead>
            <tbody>
              {receipt.components?.map((c) => (
                <tr key={c.name}>
                  <td className="py-2 text-[var(--text-primary)]">{c.name}</td>
                  <td className="py-2 text-right font-mono text-[var(--text-primary)]">{fmt(c.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 dark:border-surface-600">
                <td className="pt-3 font-bold text-[var(--text-primary)]">Total Amount Paid</td>
                <td className="pt-3 text-right font-bold text-xl text-success-600 font-mono">{fmt(receipt.amountPaid)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* SHA-256 Hash */}
        <div className="pt-6">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-surface-700">
            <Shield size={16} className="text-brand-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">SHA-256 Integrity Hash</p>
              <p className="font-mono text-xs text-[var(--text-muted)] break-all">{receipt.sha256Hash}</p>
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-3 text-center">
            This is a system-generated receipt. No signature required. Verify at: {receipt.verificationUrl}
          </p>
        </div>
      </div>
    </div>
  );
}
