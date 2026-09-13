import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Plus, Building2, ShieldAlert, ShieldCheck } from 'lucide-react';
import api from '../../config/api.js';
import { useAuth } from '../../hooks/useAuth.js';
import PageHeader from '../../components/shared/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Input from '../../components/ui/Input.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';
import { motion } from 'framer-motion';

export default function Departments() {
  const { user } = useAuth();
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', head: '', totalSeats: 60 });

  // Main Superuser has employeeId SUP001, email super@demo.com, or no department assigned
  const isMainSuperuser = user && (user.employeeId === 'SUP001' || user.email === 'super@demo.com' || !user.department);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/superuser/departments');
        setDepts(res.data.data);
      } catch { toast.error('Failed to load departments'); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!isMainSuperuser) {
      toast.error('Access Denied: Only the Main Superuser can create departments.');
      return;
    }

    try {
      const res = await api.post('/superuser/departments', form);
      setDepts(prev => [...prev, res.data.data]);
      setShowModal(false);
      toast.success(`Department ${res.data.data.name} (${res.data.data.code}) created successfully!`);
      setForm({ name: '', code: '', head: '', totalSeats: 60 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create department');
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Departments"
        subtitle="Manage academic departments, branches, and seat quotas"
        breadcrumbs={['Superuser', 'Departments']}
        actions={
          isMainSuperuser ? (
            <Button id="add-dept-btn" variant="primary" size="sm" onClick={() => setShowModal(true)}>
              <Plus size={14} /> Add Department
            </Button>
          ) : (
            <span className="badge badge-info flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold">
              <ShieldAlert size={14} /> Read-Only Directory (Sub-Superuser)
            </span>
          )
        }
      />

      {/* Governance Banner */}
      {!isMainSuperuser ? (
        <div className="card p-4 bg-amber-500/10 border border-amber-500/25 flex items-center justify-between rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Institutional Governance: Centralized Department Administration
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Department creation, quota expansion, and institutional structure are strictly reserved for the Main Superuser (Institutional Dean). Departmental superusers hold read-only directory privileges.
              </p>
            </div>
          </div>
          <span className="badge badge-warning text-xs font-semibold">Central Master Protected</span>
        </div>
      ) : (
        <div className="card p-3.5 bg-brand-500/5 border border-brand-500/20 flex items-center justify-between rounded-xl">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={18} className="text-brand-600" />
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              Main Institutional Dean Authority Active: You have full authority to register and configure academic branches.
            </span>
          </div>
          <span className="badge badge-brand text-[11px]">SUP001 Master Authority</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {depts.map((d, i) => (
          <motion.div
            key={d._id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="card p-5 hover:shadow-card-hover hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center">
                <Building2 size={18} className="text-white" />
              </div>
              <span className="badge badge-brand">{d.code}</span>
            </div>
            <p className="font-semibold text-[var(--text-primary)]">{d.name}</p>
            {d.head && <p className="text-xs text-[var(--text-muted)] mt-1">Head: {d.head}</p>}
            <p className="text-xs text-[var(--text-muted)] mt-1">Approved Seats: {d.totalSeats || 60}</p>
          </motion.div>
        ))}
      </div>

      {isMainSuperuser && (
        <Modal id="add-dept-modal" open={showModal} onClose={() => setShowModal(false)} title="Add Department" size="sm">
          <form id="dept-form" onSubmit={handleCreate} className="space-y-3">
            <Input id="dept-name" label="Department Name" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Computer Science & Engineering" required />
            <Input id="dept-code" label="Code" value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="CSE" required />
            <Input id="dept-head" label="Head (optional)" value={form.head} onChange={(e) => setForm(f => ({ ...f, head: e.target.value }))} placeholder="Dr. Sharma" />
            <Input id="dept-seats" label="Total Seats" type="number" value={form.totalSeats} onChange={(e) => setForm(f => ({ ...f, totalSeats: parseInt(e.target.value) }))} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button id="submit-dept-btn" type="submit" variant="primary">Create Department</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

