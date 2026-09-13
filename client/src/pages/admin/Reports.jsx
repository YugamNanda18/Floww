import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../config/api.js';
import PageHeader from '../../components/shared/PageHeader.jsx';
import Select from '../../components/ui/Select.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';

const fmt = (p) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format((p || 0) / 100);

const BalanceSheetSection = ({ title, items, total, totalLabel, indent = false }) => (
  <div className={`${indent ? 'pl-6' : ''} mb-4`}>
    <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">{title}</h3>
    {items?.map((item) => (
      <div key={item.label} className={`flex items-center justify-between py-1.5 text-sm ${item.amount < 0 ? 'text-danger-500' : 'text-[var(--text-primary)]'}`}>
        <span className="text-[var(--text-secondary)] pl-4">{item.label}</span>
        <span className={`font-mono font-semibold ${item.amount < 0 ? '' : ''}`}>{fmt(Math.abs(item.amount))}</span>
      </div>
    ))}
    <div className="flex items-center justify-between py-2 border-t border-[var(--border-color)] mt-1">
      <span className="font-semibold text-sm text-[var(--text-primary)]">{totalLabel}</span>
      <span className="font-bold font-mono text-base text-[var(--text-primary)]">{fmt(Math.abs(total))}</span>
    </div>
  </div>
);

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.get('/reports/balance-sheet', { params: { academicYear: academicYear || undefined } });
        setData(res.data.data);
      } catch { toast.error('Failed to load balance sheet'); }
      finally { setLoading(false); }
    };
    fetch();
  }, [academicYear]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Balance Sheet"
        subtitle="Vertical Capital-Employed format financial statement"
        breadcrumbs={['Admin', 'Reports']}
      />

      <div className="card p-4">
        <Select
          id="bs-year-select"
          label="Academic Year"
          value={academicYear}
          onChange={(e) => setAcademicYear(e.target.value)}
          options={[
            { value: '', label: 'All Years' },
            { value: '2024-25', label: '2024-25' },
            { value: '2023-24', label: '2023-24' },
            { value: '2022-23', label: '2022-23' },
          ]}
          className="w-44"
        />
      </div>

      {loading ? <PageSpinner /> : data && (
        <div className="max-w-2xl mx-auto">
          <div className="card overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-brand p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-1">LedgerX Financial Statement</p>
              <h2 className="text-xl font-bold">Balance Sheet</h2>
              <p className="text-sm text-white/70 mt-1">
                {data.academicYear} · As at {new Date(data.generatedAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* SOURCES OF FUNDS */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-px flex-1 bg-[var(--border-color)]" />
                  <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] px-2">
                    {data.sourcesOfFunds.label}
                  </h2>
                  <div className="h-px flex-1 bg-[var(--border-color)]" />
                </div>

                {data.sourcesOfFunds.items.map((item) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between py-2 text-sm border-b border-dashed border-[var(--border-color)]"
                  >
                    <span className="text-[var(--text-secondary)] pl-4">{item.label}</span>
                    <span className={`font-mono font-semibold ${item.amount < 0 ? 'text-danger-500' : 'text-[var(--text-primary)]'}`}>
                      {item.amount < 0 ? `(${fmt(Math.abs(item.amount))})` : fmt(item.amount)}
                    </span>
                  </motion.div>
                ))}

                <div className="flex items-center justify-between pt-3 mt-2 border-t-2 border-[var(--border-color)]">
                  <span className="font-bold text-base text-[var(--text-primary)]">
                    {data.sourcesOfFunds.total.label}
                  </span>
                  <span className="font-extrabold text-xl text-brand-500 font-mono">
                    {fmt(data.sourcesOfFunds.total.amount)}
                  </span>
                </div>
              </div>

              {/* APPLICATION OF FUNDS */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-px flex-1 bg-[var(--border-color)]" />
                  <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] px-2">
                    {data.applicationOfFunds.label}
                  </h2>
                  <div className="h-px flex-1 bg-[var(--border-color)]" />
                </div>

                {/* Current Assets */}
                <p className="text-xs font-semibold text-[var(--text-muted)] pl-2 mb-1">
                  {data.applicationOfFunds.currentAssets.label}
                </p>
                {data.applicationOfFunds.currentAssets.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-1.5 text-sm border-b border-dashed border-[var(--border-color)]">
                    <span className="text-[var(--text-secondary)] pl-6">{item.label}</span>
                    <span className="font-mono text-[var(--text-primary)]">{fmt(item.amount)}</span>
                  </div>
                ))}

                {/* Less: Current Liabilities */}
                <p className="text-xs font-semibold text-[var(--text-muted)] pl-2 mt-3 mb-1">
                  {data.applicationOfFunds.currentLiabilities.label}
                </p>
                {data.applicationOfFunds.currentLiabilities.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-1.5 text-sm border-b border-dashed border-[var(--border-color)]">
                    <span className="text-[var(--text-secondary)] pl-6">{item.label}</span>
                    <span className="font-mono text-danger-500">({fmt(Math.abs(item.amount))})</span>
                  </div>
                ))}

                <div className="flex items-center justify-between py-2 mt-2 border-t border-[var(--border-color)]">
                  <span className="font-semibold text-sm text-[var(--text-primary)]">{data.applicationOfFunds.netCurrentAssets.label}</span>
                  <span className="font-bold font-mono text-[var(--text-primary)]">{fmt(data.applicationOfFunds.netCurrentAssets.amount)}</span>
                </div>

                <div className="flex items-center justify-between pt-3 mt-2 border-t-2 border-[var(--border-color)]">
                  <span className="font-bold text-base text-[var(--text-primary)]">{data.applicationOfFunds.total.label}</span>
                  <span className="font-extrabold text-xl text-brand-500 font-mono">{fmt(data.applicationOfFunds.total.amount)}</span>
                </div>
              </div>

              <p className="text-xs text-[var(--text-muted)] text-center pt-2 border-t border-[var(--border-color)]">
                System-generated balance sheet · LedgerX · {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
