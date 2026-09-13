import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Plus, AlertTriangle, TrendingUp, Edit2, CheckCircle, Power } from 'lucide-react';
import api from '../../config/api.js';
import PageHeader from '../../components/shared/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';
import { Table, Th, EmptyRow } from '../../components/ui/Table.jsx';

const fmt = (p) => p ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(p / 100) : '—';

export default function LateFeeRules() {
  const [rules, setRules] = useState([]);
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [form, setForm] = useState({
    feeStructure: '',
    ruleType: 'dailyPercentage',
    flatAmount: 0,
    dailyRate: 0.5,
    maxCap: 0,
    effectiveAfterDays: 0,
  });

  const fetchRules = async () => {
    try {
      const [rulesRes, structRes] = await Promise.all([
        api.get('/admin/late-fee-rules'),
        api.get('/admin/fee-structures'),
      ]);
      setRules(rulesRes.data.data);
      setStructures(structRes.data.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleOpenCreate = () => {
    setEditingRule(null);
    setForm({
      feeStructure: structures[0]?._id || '',
      ruleType: 'dailyPercentage',
      flatAmount: 0,
      dailyRate: 0.5,
      maxCap: 0,
      effectiveAfterDays: 7,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (rule) => {
    setEditingRule(rule);
    setForm({
      feeStructure: rule.feeStructure?._id || rule.feeStructure || '',
      ruleType: rule.ruleType || 'dailyPercentage',
      flatAmount: (rule.flatAmount || 0) / 100,
      dailyRate: rule.dailyRate || 0,
      maxCap: (rule.maxCap || 0) / 100,
      effectiveAfterDays: rule.effectiveAfterDays || 0,
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        flatAmount: Math.round(parseFloat(form.flatAmount || 0) * 100),
        maxCap: Math.round(parseFloat(form.maxCap || 0) * 100),
        dailyRate: parseFloat(form.dailyRate || 0),
      };

      if (editingRule) {
        const res = await api.patch(`/admin/late-fee-rules/${editingRule._id}`, payload);
        toast.success('Late fee rule updated successfully!');
        setRules(prev => prev.map(r => r._id === editingRule._id ? res.data.data : r));
      } else {
        const res = await api.post('/admin/late-fee-rules', payload);
        toast.success('Late fee rule created successfully!');
        setRules(prev => [res.data.data, ...prev]);
      }
      setShowModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save rule');
    }
  };

  const handleToggleStatus = async (rule) => {
    try {
      const res = await api.patch(`/admin/late-fee-rules/${rule._id}`, { isActive: !rule.isActive });
      toast.success(`Rule marked as ${!rule.isActive ? 'Active' : 'Inactive'}`);
      setRules(prev => prev.map(r => r._id === rule._id ? { ...r, isActive: !r.isActive } : r));
    } catch (err) {
      toast.error('Failed to update rule status');
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Late Fee Rules"
        subtitle="Configure automatic penalty rules for overdue payments"
        breadcrumbs={['Admin', 'Late Fee Rules']}
        actions={
          <Button id="create-rule-btn" onClick={handleOpenCreate} variant="primary" size="sm">
            <Plus size={14} /> Add Rule
          </Button>
        }
      />

      <div className="card p-5">
        {loading ? <PageSpinner /> : (
          <Table>
            <thead>
              <tr>
                <Th>Fee Structure</Th>
                <Th>Rule Type</Th>
                <Th>Flat Amount</Th>
                <Th>Daily Rate</Th>
                <Th>Max Cap</Th>
                <Th>Effective After</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 && <EmptyRow colSpan={8} message="No late fee rules configured" />}
              {rules.map((r) => (
                <tr key={r._id}>
                  <td className="text-sm">
                    <p className="font-medium">{r.feeStructure?.department?.name || 'All'}</p>
                    <p className="text-xs text-[var(--text-muted)]">Sem {r.feeStructure?.semester} · {r.feeStructure?.batch}</p>
                  </td>
                  <td>
                    <Badge variant={r.ruleType === 'dailyPercentage' ? 'warning' : 'danger'}>
                      {r.ruleType === 'dailyPercentage' ? <TrendingUp size={10} /> : <AlertTriangle size={10} />}
                      {r.ruleType === 'dailyPercentage' ? 'Daily %' : 'Flat'}
                    </Badge>
                  </td>
                  <td>{r.ruleType === 'flat' ? fmt(r.flatAmount) : '—'}</td>
                  <td>{r.ruleType === 'dailyPercentage' ? `${r.dailyRate}%` : '—'}</td>
                  <td>{r.maxCap > 0 ? fmt(r.maxCap) : 'No cap'}</td>
                  <td>{r.effectiveAfterDays} days</td>
                  <td><Badge variant={r.isActive ? 'success' : 'neutral'} dot>{r.isActive ? 'Active' : 'Inactive'}</Badge></td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => handleOpenEdit(r)}
                        className="flex items-center gap-1 text-[11px]"
                      >
                        <Edit2 size={11} /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleToggleStatus(r)}
                        className={`text-[11px] ${r.isActive ? 'text-danger-500 hover:text-danger-600' : 'text-success-500 hover:text-success-600'}`}
                      >
                        <Power size={11} /> {r.isActive ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      <Modal
        id="create-rule-modal"
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingRule ? 'Edit Late Fee Rule' : 'Add Late Fee Rule'}
        size="md"
      >
        <form id="late-fee-form" onSubmit={handleSave} className="space-y-4">
          <Select
            id="rule-structure"
            label="Fee Structure"
            value={form.feeStructure}
            onChange={(e) => setForm(f => ({ ...f, feeStructure: e.target.value }))}
            options={[{ value: '', label: 'Select structure...' }, ...structures.map(s => ({ value: s._id, label: `${s.department?.name} · Sem ${s.semester} · ${s.batch}` }))]}
            required
          />
          <Select
            id="rule-type"
            label="Rule Type"
            value={form.ruleType}
            onChange={(e) => setForm(f => ({ ...f, ruleType: e.target.value }))}
            options={[{ value: 'flat', label: 'Flat (one-time)' }, { value: 'dailyPercentage', label: 'Daily Percentage (compounding)' }]}
          />
          {form.ruleType === 'flat' && (
            <Input id="flat-amount" label="Flat Amount (₹)" type="number" min="0" value={form.flatAmount} onChange={(e) => setForm(f => ({ ...f, flatAmount: e.target.value }))} />
          )}
          {form.ruleType === 'dailyPercentage' && (
            <Input id="daily-rate" label="Daily Rate (%)" type="number" step="0.01" min="0" value={form.dailyRate} onChange={(e) => setForm(f => ({ ...f, dailyRate: e.target.value }))} />
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input id="max-cap" label="Max Cap (₹, 0 = no cap)" type="number" min="0" value={form.maxCap} onChange={(e) => setForm(f => ({ ...f, maxCap: e.target.value }))} />
            <Input id="effective-after" label="Effective After (days)" type="number" min="0" value={form.effectiveAfterDays} onChange={(e) => setForm(f => ({ ...f, effectiveAfterDays: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button id="submit-rule-btn" type="submit" variant="primary">
              {editingRule ? 'Update Rule' : 'Create Rule'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
