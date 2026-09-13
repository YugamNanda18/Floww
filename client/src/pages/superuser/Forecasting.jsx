import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import api from '../../config/api.js';
import PageHeader from '../../components/shared/PageHeader.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';

const fmtShort = (p) => `₹${(p / 100000).toFixed(1)}L`;

export default function Forecasting() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/superuser/forecasting');
        setData(res.data.data.map(d => ({
          name: `Sem ${d._id.semester} (${d._id.academicYear})`,
          projected: d.projected / 100,
          actual: d.actual / 100,
          outstanding: d.outstanding / 100,
        })));
      } catch { toast.error('Failed to load forecasting data'); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue Forecasting"
        subtitle="Projected vs actual collections by semester"
        breadcrumbs={['Superuser', 'Forecasting']}
      />

      {data.length === 0 ? (
        <div className="card p-12 text-center text-[var(--text-muted)]">No data available yet.</div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-5">
          <ResponsiveContainer width="100%" height={380}>
            <ComposedChart data={data} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={fmtShort} />
              <Tooltip
                formatter={(v, n) => [`₹${v.toLocaleString('en-IN')}`, n]}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 10, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="projected" name="Projected (₹)" fill="#e0e7ff" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" name="Collected (₹)" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="outstanding" name="Outstanding (₹)" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </div>
  );
}
