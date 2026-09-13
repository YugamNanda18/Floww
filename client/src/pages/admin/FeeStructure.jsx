import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, Pencil, Send } from 'lucide-react';
import api from '../../config/api.js';
import PageHeader from '../../components/shared/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';
import { Table, Th, EmptyRow } from '../../components/ui/Table.jsx';

const fmt = (p) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format((p || 0) / 100);

const COMPONENTS = ['Tuition', 'CRT', 'Development', 'Lab', 'Exam', 'Library', 'Sports', 'Hostel'];
const SEMESTERS = Array.from({ length: 8 }, (_, i) => ({ value: i + 1, label: `Semester ${i + 1}` }));

export default function FeeStructurePage() {
  const [structures, setStructures] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [publishing, setPublishing] = useState(null);

  const [form, setForm] = useState({
    department: '',
    batch: '2022-2026',
    semester: 1,
    academicYear: '2024-25',
    dueDate: '',
    gracePeriodDays: 7,
    components: COMPONENTS.slice(0, 4).map(name => ({ name, amount: 0 })),
  });

  useEffect(() => {
    const fetch = async () => {
      try {
        const [fsRes, deptRes] = await Promise.all([
          api.get('/admin/fee-structures'),
          api.get('/admin/departments'),
        ]);
        setStructures(fsRes.data.data || []);
        const depts = deptRes.data.data || [];
        setDepartments(depts);
        if (depts.length > 0) {
          setForm(f => ({ ...f, department: f.department || depts[0]._id }));
        }
      } catch {
        toast.error('Failed to load fee structures');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.department) {
      toast.error('Please select a department');
      return;
    }
    if (!form.dueDate) {
      toast.error('Please specify a due date');
      return;
    }

    try {
      const components = form.components.map(c => ({
        name: c.name,
        amount: Math.round((parseFloat(c.amount) || 0) * 100),
      }));
      const totalAmount = components.reduce((s, c) => s + c.amount, 0);

      const res = await api.post('/admin/fee-structures', {
        ...form,
        components,
        totalAmount,
      });
      setStructures(prev => [res.data.data, ...prev]);
      setShowModal(false);
      toast.success('Fee structure created successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create fee structure');
    }
  };

  const handlePublish = async (id) => {
    setPublishing(id);
    try {
      await api.post(`/admin/fee-structures/${id}/publish`);
      setStructures(prev => prev.map(s => s._id === id ? { ...s, isPublished: true, publishedAt: new Date() } : s));
      toast.success('Fee structure published!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish');
    } finally {
      setPublishing(null);
    }
  };

  const updateComponent = (i, field, value) => {
    setForm(prev => ({
      ...prev,
      components: prev.components.map((c, idx) => idx === i ? { ...c, [field]: value } : c),
    }));
  };

  const totalAmount = form.components.reduce((s, c) => s + (parseInt(c.amount) || 0), 0);

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee Structures"
        subtitle="Define and publish fee schedules by branch, batch, and semester"
        breadcrumbs={['Admin', 'Fee Structures']}
        actions={
          <Button id="create-fee-structure-btn" onClick={() => setShowModal(true)} variant="primary" size="sm">
            <Plus size={14} /> Create Structure
          </Button>
        }
      />

      <div className="card p-5">
        {structures.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-muted)]">
            <p>No fee structures created yet.</p>
            <Button className="mt-4" onClick={() => setShowModal(true)}>Create first structure</Button>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Dept / Batch</Th>
                <Th>Semester</Th>
                <Th>Academic Year</Th>
                <Th>Total Amount</Th>
                <Th>Due Date</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {structures.map((s) => (
                <tr key={s._id}>
                  <td>
                    <p className="font-medium text-sm">{s.department?.name || '—'}</p>
                    <p className="text-xs text-[var(--text-muted)]">{s.batch}</p>
                  </td>
                  <td><Badge variant="brand">Sem {s.semester}</Badge></td>
                  <td className="text-sm">{s.academicYear}</td>
                  <td className="font-bold font-mono text-[var(--text-primary)]">{fmt(s.totalAmount)}</td>
                  <td className="text-xs text-[var(--text-muted)]">{s.dueDate ? new Date(s.dueDate).toLocaleDateString('en-IN') : '—'}</td>
                  <td>
                    <Badge variant={s.isPublished ? 'success' : 'warning'} dot>
                      {s.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                  </td>
                  <td>
                    {!s.isPublished && (
                      <Button
                        id={`publish-btn-${s._id}`}
                        size="sm"
                        variant="success"
                        loading={publishing === s._id}
                        onClick={() => handlePublish(s._id)}
                      >
                        <Send size={12} /> Publish
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      {/* Create Modal */}
      <Modal id="create-fee-structure-modal" open={showModal} onClose={() => setShowModal(false)} title="Create Fee Structure" size="lg">
        <form id="fee-structure-form" onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              id="dept-select"
              label="Department"
              value={form.department}
              onChange={(e) => setForm(f => ({ ...f, department: e.target.value }))}
              options={[{ value: '', label: 'Select dept...' }, ...departments.map(d => ({ value: d._id, label: `${d.name} (${d.code})` }))]}
              required
            />
            <Select
              id="semester-select-form"
              label="Semester"
              value={form.semester}
              onChange={(e) => setForm(f => ({ ...f, semester: parseInt(e.target.value) }))}
              options={SEMESTERS.map(s => ({ value: s.value, label: s.label }))}
            />
            <Input id="batch-input" label="Batch" value={form.batch} onChange={(e) => setForm(f => ({ ...f, batch: e.target.value }))} placeholder="2022-2026" />
            <Input id="year-input" label="Academic Year" value={form.academicYear} onChange={(e) => setForm(f => ({ ...f, academicYear: e.target.value }))} placeholder="2024-25" />
            <Input id="due-date-input" label="Due Date" type="date" value={form.dueDate} onChange={(e) => setForm(f => ({ ...f, dueDate: e.target.value }))} required />
            <Input id="grace-period-input" label="Grace Period (days)" type="number" value={form.gracePeriodDays} onChange={(e) => setForm(f => ({ ...f, gracePeriodDays: parseInt(e.target.value) }))} />
          </div>

          <div>
            <p className="label">Fee Components (amounts in ₹)</p>
            <div className="space-y-2">
              {form.components.map((comp, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-28 text-sm text-[var(--text-secondary)]">{comp.name}</span>
                  <input
                    type="number"
                    min="0"
                    className="input flex-1"
                    value={comp.amount}
                    onChange={(e) => updateComponent(i, 'amount', e.target.value)}
                    placeholder="Amount in ₹"
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">Total: ₹{totalAmount.toLocaleString('en-IN')}</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)} type="button">Cancel</Button>
            <Button id="submit-fee-structure-btn" type="submit" variant="primary">Create Structure</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
