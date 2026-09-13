import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import api from '../../config/api.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Link to="/login" className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to login
        </Link>

        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Reset password</h2>
        <p className="text-[var(--text-secondary)] text-sm mb-8">Enter your email and we'll send a reset link.</p>

        {sent ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-success-50 dark:bg-success-500/10 flex items-center justify-center">
              <CheckCircle size={32} className="text-success-500" />
            </div>
            <p className="font-semibold text-[var(--text-primary)]">Reset link sent!</p>
            <p className="text-sm text-[var(--text-secondary)]">Check your email at <strong>{email}</strong>.</p>
            <Link to="/login" className="btn-primary btn mt-4">Back to Login</Link>
          </motion.div>
        ) : (
          <form id="forgot-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="forgot-email" className="label">Email address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-9"
                  placeholder="you@college.edu"
                />
              </div>
            </div>
            {error && <p className="text-xs text-danger-500">{error}</p>}
            <button
              id="forgot-submit-btn"
              type="submit"
              disabled={loading}
              className="btn-primary btn w-full justify-center py-3"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
