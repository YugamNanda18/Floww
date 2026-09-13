import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Upload, CheckCircle, AlertCircle, Users, ArrowRight, FileText, TrendingUp, FileSpreadsheet } from 'lucide-react';
import api from '../../config/api.js';
import PageHeader from '../../components/shared/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import Input from '../../components/ui/Input.jsx';
import { Table, Th, EmptyRow } from '../../components/ui/Table.jsx';

const SEMESTERS = Array.from({ length: 7 }, (_, i) => ({ value: i + 1, label: `Semester ${i + 1} → ${i + 2}` }));

export default function BulkUpload() {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');

  // Semester promotion state
  const [fromSemester, setFromSemester] = useState(1);
  const [batch, setBatch] = useState('');
  const [promoting, setPromoting] = useState(false);
  const [promoteResult, setPromoteResult] = useState(null);

  // Bulk demands state
  const [departments, setDepartments] = useState([]);
  const [demandForm, setDemandForm] = useState({
    departmentId: '',
    batch: '',
    semester: 1,
    academicYear: '2024-25',
    dueDate: '',
  });
  const [raisingDemands, setRaisingDemands] = useState(false);
  const [demandResult, setDemandResult] = useState(null);

  React.useEffect(() => {
    api.get('/superuser/departments').then(res => setDepartments(res.data.data || [])).catch(() => {});
  }, []);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f || !f.name.endsWith('.csv')) { toast.error('Please upload a .csv file'); return; }
    setFile(f);
    setPreview(null);
    setResult(null);
  };

  const handlePreview = async () => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    try {
      const res = await api.post('/superuser/bulk-upload?preview=true', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Preview failed');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    try {
      const res = await api.post('/superuser/bulk-upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data.data);
      setPreview(null);
      toast.success(`✅ Created: ${res.data.data.created}, Skipped: ${res.data.data.skipped}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handlePromote = async () => {
    setPromoting(true);
    try {
      const res = await api.post('/superuser/bulk-promote', {
        fromSemester: parseInt(fromSemester),
        batch: batch || undefined,
      });
      setPromoteResult(res.data.data);
      toast.success(`Promoted ${res.data.data.promoted} students to Semester ${res.data.data.nextSemester}!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Promotion failed');
    } finally {
      setPromoting(false);
    }
  };

  const handleRaiseBulkDemands = async (e) => {
    e.preventDefault();
    setRaisingDemands(true);
    try {
      const res = await api.post('/superuser/raise-demands', {
        ...demandForm,
        semester: parseInt(demandForm.semester),
        departmentId: demandForm.departmentId || undefined,
        batch: demandForm.batch || undefined,
      });
      setDemandResult(res.data.data);
      toast.success(`✅ Demands generated for ${res.data.data.createdCount} students and posted to ledger!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk demand generation failed.');
    } finally {
      setRaisingDemands(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk Operations"
        subtitle="Register new student cohorts, promote semesters, or mass-generate fee demands"
        breadcrumbs={['Superuser', 'Bulk Operations']}
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--border-color)] pb-1">
        {[
          { id: 'upload', label: 'CSV Student Upload', icon: Upload },
          { id: 'promote', label: 'Semester Promotion', icon: TrendingUp },
          { id: 'demands', label: 'Bulk Fee Demand Raise', icon: FileSpreadsheet },
        ].map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-xl transition-colors ${
              activeTab === tab.id
                ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 border-b-2 border-brand-500'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <tab.icon size={15} /> {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'upload' ? (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* CSV format hint */}
            <div className="card p-4 text-sm">
              <p className="font-medium text-[var(--text-primary)] mb-2 flex items-center gap-2">
                <FileText size={15} /> Expected CSV columns:
              </p>
              <code className="text-xs text-brand-500 bg-brand-50 dark:bg-brand-500/10 px-3 py-1.5 rounded-lg block">
                name, email, rollNumber, department, batch, semester, phone
              </code>
            </div>

            {/* Dropzone */}
            <div
              className="border-2 border-dashed border-slate-200 dark:border-surface-600 rounded-2xl p-10 text-center cursor-pointer hover:border-brand-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={32} className="mx-auto text-slate-400 mb-3" />
              <p className="text-sm font-medium text-[var(--text-primary)]">Drop CSV file or click to browse</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Max 5MB · .csv files only</p>
              {file && <p className="mt-3 text-sm font-semibold text-brand-500">{file.name}</p>}
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" id="csv-file-input" />
            </div>

            {file && (
              <div className="flex gap-2">
                <Button id="preview-btn" variant="secondary" onClick={handlePreview} loading={uploading && !preview}>
                  Preview Data
                </Button>
                {preview && (
                  <Button id="confirm-upload-btn" variant="primary" onClick={handleConfirm} loading={uploading && !!preview}>
                    <CheckCircle size={14} /> Confirm Upload
                  </Button>
                )}
              </div>
            )}

            {/* Preview Table */}
            {preview && (
              <div className="card p-5">
                <p className="text-sm font-semibold mb-3">Preview ({preview.totalRows} rows)</p>
                <Table>
                  <thead>
                    <tr>
                      {Object.keys(preview.preview[0] || {}).map(k => <Th key={k}>{k}</Th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.preview.map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((v, j) => <td key={j} className="text-xs">{v}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}

            {/* Result */}
            {result && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
                <p className="font-semibold mb-3 flex items-center gap-2 text-success-600">
                  <CheckCircle size={18} /> Upload Complete
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-success-600">{result.created}</p>
                    <p className="text-xs text-[var(--text-muted)]">Created</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-warning-500">{result.skipped}</p>
                    <p className="text-xs text-[var(--text-muted)]">Skipped (exists)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-danger-500">{result.errors?.length || 0}</p>
                    <p className="text-xs text-[var(--text-muted)]">Errors</p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : activeTab === 'promote' ? (
          <motion.div key="promote" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="card p-6 space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Promote all students from one semester to the next. This will also auto-generate fee demands for the new semester if a published fee structure exists.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  id="from-semester-select"
                  label="Promote From"
                  value={fromSemester}
                  onChange={(e) => setFromSemester(e.target.value)}
                  options={SEMESTERS.map(s => ({ value: s.value, label: s.label }))}
                />
                <Input
                  id="batch-filter"
                  label="Batch (optional filter)"
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  placeholder="e.g. 2022-2026 (leave blank for all)"
                />
              </div>

              <Button id="promote-btn" variant="primary" loading={promoting} onClick={handlePromote}>
                <ArrowRight size={14} /> Promote Students
              </Button>
            </div>

            {promoteResult && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-5">
                <p className="font-semibold mb-3 flex items-center gap-2 text-success-600">
                  <CheckCircle size={18} /> Promotion Successful
                </p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-success-600">{promoteResult.promoted}</p>
                    <p className="text-xs text-[var(--text-muted)]">Students promoted</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-brand-500">{promoteResult.demandsCreated}</p>
                    <p className="text-xs text-[var(--text-muted)]">Fee demands created</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">Sem {promoteResult.nextSemester}</p>
                    <p className="text-xs text-[var(--text-muted)]">New semester</p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div key="demands" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="card p-6 space-y-4">
              <div className="border-b border-[var(--border-color)] pb-3">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Mass Fee Assessment & Demand Generation
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Generates individual semester fee demands for an entire cohort based on the published Fee Structure.
                  Automatically posts initial Double-Entry Debit (Student Fee Receivable) and Credit (Fee Income) for each student.
                </p>
              </div>

              <form onSubmit={handleRaiseBulkDemands} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold block mb-1">Target Department</label>
                    <select
                      value={demandForm.departmentId}
                      onChange={(e) => setDemandForm({ ...demandForm, departmentId: e.target.value })}
                      className="input text-xs w-full"
                    >
                      <option value="">All Departments (Institutional)</option>
                      {departments.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.code} — {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Academic Year</label>
                    <input
                      type="text"
                      required
                      value={demandForm.academicYear}
                      onChange={(e) => setDemandForm({ ...demandForm, academicYear: e.target.value })}
                      placeholder="e.g. 2024-25"
                      className="input text-xs w-full"
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Semester</label>
                    <select
                      value={demandForm.semester}
                      onChange={(e) => setDemandForm({ ...demandForm, semester: e.target.value })}
                      className="input text-xs w-full"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <option key={s} value={s}>
                          Semester {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Target Batch Filter (Optional)</label>
                    <input
                      type="text"
                      value={demandForm.batch}
                      onChange={(e) => setDemandForm({ ...demandForm, batch: e.target.value })}
                      placeholder="e.g. 2024-28 (leave blank for all enrolled)"
                      className="input text-xs w-full"
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Statutory Due Date (Optional override)</label>
                    <input
                      type="date"
                      value={demandForm.dueDate}
                      onChange={(e) => setDemandForm({ ...demandForm, dueDate: e.target.value })}
                      className="input text-xs w-full"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    loading={raisingDemands}
                    className="flex items-center gap-2"
                  >
                    <FileSpreadsheet size={15} /> Execute Mass Demand Generation & Post to Ledger
                  </Button>
                </div>
              </form>
            </div>

            {demandResult && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
                <p className="font-semibold mb-3 flex items-center gap-2 text-success-600">
                  <CheckCircle size={18} /> Cohort Demand Generation Succeeded
                </p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-success-600">{demandResult.createdCount}</p>
                    <p className="text-xs text-[var(--text-muted)]">New Demands Created & Posted</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-500">{demandResult.skippedCount}</p>
                    <p className="text-xs text-[var(--text-muted)]">Skipped (Already Raised)</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-brand-500">{demandResult.totalEligible}</p>
                    <p className="text-xs text-[var(--text-muted)]">Total Eligible Students</p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
