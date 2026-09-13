import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Calendar,
  Clock,
  Coffee,
  Building2,
  User,
  MapPin,
  Edit2,
  Save,
  Plus,
  X,
  CheckCircle2,
  BookOpen,
  Copy,
  RotateCcw,
  Trash2,
  Sparkles,
} from 'lucide-react';
import api from '../../config/api.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import PageHeader from '../../components/shared/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SuperuserTimetable() {
  const { user } = useAuth();
  const isCentralized = !user?.department;

  const [loading, setLoading] = useState(true);
  const [timetable, setTimetable] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(1);
  const [selectedDay, setSelectedDay] = useState('ALL');

  // Centralized Superuser Department Switcher
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');

  // Edit / Add Slot Modal State
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [targetDay, setTargetDay] = useState(null);
  const [targetSlot, setTargetSlot] = useState(null);
  const [slotForm, setSlotForm] = useState({
    slotNumber: 1,
    startTime: '08:00 AM',
    endTime: '09:00 AM',
    subjectCode: '',
    subjectName: '',
    facultyName: '',
    room: 'LH-101',
    type: 'lecture',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isCentralized) {
      fetchDepartments();
    }
  }, [isCentralized]);

  useEffect(() => {
    fetchTimetable();
  }, [selectedSemester, selectedDeptId]);

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/admin/departments');
      const depts = res.data.data?.departments || res.data.data || [];
      setDepartments(depts);
      if (depts.length > 0 && !selectedDeptId) {
        setSelectedDeptId(depts[0]._id);
      }
    } catch (err) {
      console.error('Failed to load departments:', err.message);
    }
  };

  const fetchTimetable = async () => {
    setLoading(true);
    try {
      const params = { semester: selectedSemester };
      if (selectedDeptId) params.departmentId = selectedDeptId;

      const res = await api.get('/superuser/timetable', { params });
      setTimetable(res.data.data?.timetable || null);
    } catch (err) {
      toast.error('Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  // Open modal to EDIT slot
  const openEditSlotModal = (dayName, slot) => {
    setIsAddingNew(false);
    setTargetDay(dayName);
    setTargetSlot(slot);
    setSlotForm({
      slotNumber: slot.slotNumber,
      startTime: slot.startTime,
      endTime: slot.endTime,
      subjectCode: slot.subjectCode,
      subjectName: slot.subjectName,
      facultyName: slot.facultyName,
      room: slot.room,
      type: slot.type || 'lecture',
    });
    setShowSlotModal(true);
  };

  // Open modal to ADD new slot to a day
  const openAddSlotModal = (dayName) => {
    setIsAddingNew(true);
    setTargetDay(dayName);
    const dayObj = timetable?.weeklySchedule?.find(d => d.day === dayName);
    const nextSlotNum = (dayObj?.slots?.length || 0) + 1;

    setTargetSlot(null);
    setSlotForm({
      slotNumber: nextSlotNum,
      startTime: '03:00 PM',
      endTime: '04:00 PM',
      subjectCode: `${timetable?.department?.code || 'CSE'}-${nextSlotNum}01`,
      subjectName: 'Elective Specialization',
      facultyName: 'Dr. Academic Faculty',
      room: 'CR-105',
      type: 'lecture',
    });
    setShowSlotModal(true);
  };

  // Save slot (either update existing or add new)
  const handleSaveSlot = async (e) => {
    e.preventDefault();
    if (!timetable || !targetDay) return;

    setSaving(true);
    try {
      const updatedSchedule = timetable.weeklySchedule.map((dayObj) => {
        if (dayObj.day !== targetDay) return dayObj;

        let updatedSlots;
        if (isAddingNew) {
          updatedSlots = [...dayObj.slots, { ...slotForm }];
        } else {
          updatedSlots = dayObj.slots.map((s) => {
            if (s.slotNumber === targetSlot.slotNumber) {
              return { ...slotForm };
            }
            return s;
          });
        }
        return { ...dayObj, slots: updatedSlots };
      });

      const res = await api.post('/superuser/timetable', {
        semester: selectedSemester,
        departmentId: selectedDeptId || user?.department?._id || user?.department,
        weeklySchedule: updatedSchedule,
      });

      toast.success(isAddingNew ? 'New class session added!' : 'Timetable slot updated successfully!');
      setTimetable(res.data.data?.timetable || res.data.data);
      setShowSlotModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save timetable slot');
    } finally {
      setSaving(false);
    }
  };

  // Delete a slot from a day
  const handleDeleteSlot = async (dayName, slotNumber) => {
    if (!timetable) return;
    if (!window.confirm(`Delete period #${slotNumber} from ${dayName}?`)) return;

    setSaving(true);
    try {
      const updatedSchedule = timetable.weeklySchedule.map((dayObj) => {
        if (dayObj.day !== dayName) return dayObj;
        const filtered = dayObj.slots.filter((s) => s.slotNumber !== slotNumber);
        // Re-index remaining slots
        const reindexed = filtered.map((s, idx) => ({ ...s, slotNumber: idx + 1 }));
        return { ...dayObj, slots: reindexed };
      });

      const res = await api.post('/superuser/timetable', {
        semester: selectedSemester,
        departmentId: selectedDeptId || user?.department?._id || user?.department,
        weeklySchedule: updatedSchedule,
      });

      toast.success(`Period #${slotNumber} deleted from ${dayName}`);
      setTimetable(res.data.data?.timetable || res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete slot');
    } finally {
      setSaving(false);
    }
  };

  // Quick Copy: copy one day's schedule to all other days
  const handleApplyDayToAll = async (sourceDayName) => {
    if (!timetable) return;
    const sourceDay = timetable.weeklySchedule.find(d => d.day === sourceDayName);
    if (!sourceDay) return;

    if (!window.confirm(`Apply ${sourceDayName}'s full schedule to all days (Mon–Sat) for Semester ${selectedSemester}?`)) return;

    setSaving(true);
    try {
      const updatedSchedule = DAYS.map((day) => ({
        day,
        slots: sourceDay.slots.map(s => ({ ...s })),
      }));

      const res = await api.post('/superuser/timetable', {
        semester: selectedSemester,
        departmentId: selectedDeptId || user?.department?._id || user?.department,
        weeklySchedule: updatedSchedule,
      });

      toast.success(`Applied ${sourceDayName}'s routine to all 6 days!`);
      setTimetable(res.data.data?.timetable || res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to replicate schedule');
    } finally {
      setSaving(false);
    }
  };

  // Reset current semester to standard institutional defaults
  const handleResetSemesterSchedule = async () => {
    if (!timetable) return;
    if (!window.confirm(`Reset Semester ${selectedSemester} schedule to default 6-period institutional routine?`)) return;

    setSaving(true);
    try {
      const deptCode = timetable?.department?.code || 'GEN';
      const defaultSlots = [
        { slotNumber: 1, startTime: '08:00 AM', endTime: '09:00 AM', subjectCode: `${deptCode}-101`, subjectName: 'Core Foundations I', facultyName: 'Prof. A. Sharma', room: 'LH-101', type: 'lecture' },
        { slotNumber: 2, startTime: '09:05 AM', endTime: '10:05 AM', subjectCode: `${deptCode}-102`, subjectName: 'Advanced Principles', facultyName: 'Dr. R. Verma', room: 'LH-101', type: 'lecture' },
        { slotNumber: 3, startTime: '10:10 AM', endTime: '11:15 AM', subjectCode: `${deptCode}-103`, subjectName: 'Laboratory Practicals', facultyName: 'Er. S. Nanda', room: 'LAB-2', type: 'lab' },
        { slotNumber: 4, startTime: '12:00 PM', endTime: '01:00 PM', subjectCode: `${deptCode}-104`, subjectName: 'Systems Engineering', facultyName: 'Prof. V. Rao', room: 'LH-102', type: 'lecture' },
        { slotNumber: 5, startTime: '01:05 PM', endTime: '02:00 PM', subjectCode: `${deptCode}-105`, subjectName: 'Applied Technology', facultyName: 'Dr. K. Patel', room: 'LH-102', type: 'lecture' },
        { slotNumber: 6, startTime: '02:05 PM', endTime: '03:00 PM', subjectCode: `${deptCode}-106`, subjectName: 'Seminar & Tutorials', facultyName: 'Prof. M. Gupta', room: 'CR-204', type: 'tutorial' },
      ];

      const weeklySchedule = DAYS.map((day) => ({
        day,
        slots: defaultSlots,
      }));

      const res = await api.post('/superuser/timetable', {
        semester: selectedSemester,
        departmentId: selectedDeptId || user?.department?._id || user?.department,
        weeklySchedule,
      });

      toast.success(`Semester ${selectedSemester} timetable reset to standard routine!`);
      setTimetable(res.data.data?.timetable || res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset timetable');
    } finally {
      setSaving(false);
    }
  };

  const schedule = timetable?.weeklySchedule || [];
  const daysToRender = selectedDay === 'ALL'
    ? schedule
    : schedule.filter((d) => d.day === selectedDay);

  const getSlotTypeBadge = (type) => {
    switch (type) {
      case 'lab':
        return <Badge variant="warning">Practical Lab</Badge>;
      case 'tutorial':
        return <Badge variant="info">Tutorial</Badge>;
      default:
        return <Badge variant="brand">Lecture</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title={
          timetable?.department?.name
            ? `${timetable.department.name} (${timetable.department.code}) — Semester ${selectedSemester} Timetable`
            : `Semester ${selectedSemester} Academic Timetable`
        }
        subtitle="Weekly academic class routine (Mon–Sat, 08:00 AM – 03:00 PM) with 11:15 AM - 12:00 PM Lunch Break."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleResetSemesterSchedule}
              loading={saving}
              className="flex items-center gap-1.5"
            >
              <RotateCcw size={14} /> Reset to Default Routine
            </Button>
          </div>
        }
      />

      {/* Centralized Superuser Department Switcher */}
      {isCentralized && departments.length > 0 && (
        <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-brand-500/30 bg-brand-500/5">
          <div className="flex items-center gap-2.5">
            <Building2 size={18} className="text-brand-500" />
            <div>
              <p className="text-xs font-bold text-[var(--text-primary)]">
                Centralized Superuser Oversight (Dean Mode)
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                Select department to inspect or modify their academic schedule
              </p>
            </div>
          </div>

          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="input text-xs font-semibold py-1.5 px-3 min-w-[220px]"
          >
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                🏢 {d.name} ({d.code})
              </option>
            ))}
          </select>
        </Card>
      )}

      {/* Institutional Hours & Lunch Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3.5 border-brand-500/20">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-semibold">Institutional Hours</p>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              08:00 AM – 03:00 PM (Mon–Sat)
            </p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3.5 border-amber-500/20">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Coffee size={20} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-semibold">Mandatory Lunch Break</p>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              11:15 AM – 12:00 PM (45 Mins)
            </p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3.5 border-emerald-500/20">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Calendar size={20} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-semibold">Selected Roster</p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              Semester {selectedSemester} · Complete 6-Day Schedule
            </p>
          </div>
        </div>
      </div>

      {/* Semester Selector Tabs */}
      <div className="card p-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
            <BookOpen size={14} className="text-brand-500" />
            Select Semester to View or Modify Class Routine
          </p>
          <Badge variant="brand">Semesters 1 – 8</Badge>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
            <button
              key={sem}
              onClick={() => setSelectedSemester(sem)}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
                selectedSemester === sem
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25 scale-[1.02]'
                  : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-brand-500/40'
              }`}
            >
              <span className="text-[10px] uppercase font-mono opacity-80">Year {Math.ceil(sem / 2)}</span>
              <span>Sem {sem}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Day Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedDay('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
            selectedDay === 'ALL'
              ? 'bg-brand-500/20 text-brand-600 dark:text-brand-400 font-bold'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
          }`}
        >
          All Days (Mon–Sat)
        </button>
        {DAYS.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              selectedDay === day
                ? 'bg-brand-500/20 text-brand-600 dark:text-brand-400 font-bold'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Timetable Days List */}
      {loading ? (
        <PageSpinner />
      ) : (
        <div className="space-y-6">
          {daysToRender.map((daySchedule) => {
            const morningSlots = daySchedule.slots.filter((s) => s.slotNumber <= 3);
            const afternoonSlots = daySchedule.slots.filter((s) => s.slotNumber > 3);

            return (
              <Card key={daySchedule.day} className="p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-brand-500 text-white flex items-center justify-center font-bold text-xs">
                      {daySchedule.day.substring(0, 3)}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-[var(--text-primary)]">
                        {daySchedule.day}
                      </h3>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {daySchedule.slots.length} Sessions Scheduled
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApplyDayToAll(daySchedule.day)}
                      title="Replicate this day's sessions across all other weekdays"
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-brand-500 flex items-center gap-1 transition-colors"
                    >
                      <Copy size={12} /> Copy to All Days
                    </button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openAddSlotModal(daySchedule.day)}
                      className="flex items-center gap-1 text-[11px] py-1 px-2.5 h-auto"
                    >
                      <Plus size={13} /> Add Period
                    </Button>
                  </div>
                </div>

                {/* Morning Sessions */}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2.5">
                    Morning Sessions (08:00 AM – 11:15 AM)
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {morningSlots.map((slot) => (
                      <div
                        key={slot.slotNumber}
                        className="p-3.5 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-color)] hover:border-brand-500/40 transition-all flex flex-col justify-between group relative"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400">
                              #{slot.slotNumber} · {slot.startTime} – {slot.endTime}
                            </span>
                            {getSlotTypeBadge(slot.type)}
                          </div>
                          <p className="font-bold text-sm text-[var(--text-primary)] group-hover:text-brand-500 transition-colors">
                            {slot.subjectName}
                          </p>
                          <p className="text-[11px] font-mono text-[var(--text-muted)]">
                            {slot.subjectCode}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-[var(--border-color)]/60 flex items-center justify-between text-[11px] text-[var(--text-secondary)] mt-2">
                          <span className="flex items-center gap-1 truncate max-w-[120px]">
                            <User size={11} className="text-brand-500 shrink-0" />
                            {slot.facultyName}
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <MapPin size={11} className="text-amber-500 shrink-0" />
                            {slot.room}
                          </span>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-[var(--border-color)]/60 flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditSlotModal(daySchedule.day, slot)}
                            className="p-1 rounded text-[var(--text-muted)] hover:text-brand-500 hover:bg-brand-500/10 transition-colors"
                            title="Edit Slot"
                          >
                            <Edit2 size={13} />
                          </button>
                          {daySchedule.slots.length > 1 && (
                            <button
                              onClick={() => handleDeleteSlot(daySchedule.day, slot.slotNumber)}
                              className="p-1 rounded text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                              title="Delete Slot"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lunch Break Ribbon */}
                <div className="my-4 p-3 rounded-xl bg-amber-500/10 border border-dashed border-amber-500/30 flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 font-semibold">
                  <div className="flex items-center gap-2">
                    <Coffee size={16} className="text-amber-500" />
                    <span>INSTITUTIONAL LUNCH BREAK · 11:15 AM – 12:00 PM (45 MINUTES)</span>
                  </div>
                  <span className="text-[11px] font-mono text-amber-600 dark:text-amber-500">
                    Dining Hall & Cafeteria
                  </span>
                </div>

                {/* Afternoon Sessions */}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2.5">
                    Afternoon Sessions (12:00 PM – 03:00 PM)
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {afternoonSlots.map((slot) => (
                      <div
                        key={slot.slotNumber}
                        className="p-3.5 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-color)] hover:border-brand-500/40 transition-all flex flex-col justify-between group relative"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400">
                              #{slot.slotNumber} · {slot.startTime} – {slot.endTime}
                            </span>
                            {getSlotTypeBadge(slot.type)}
                          </div>
                          <p className="font-bold text-sm text-[var(--text-primary)] group-hover:text-brand-500 transition-colors">
                            {slot.subjectName}
                          </p>
                          <p className="text-[11px] font-mono text-[var(--text-muted)]">
                            {slot.subjectCode}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-[var(--border-color)]/60 flex items-center justify-between text-[11px] text-[var(--text-secondary)] mt-2">
                          <span className="flex items-center gap-1 truncate max-w-[120px]">
                            <User size={11} className="text-brand-500 shrink-0" />
                            {slot.facultyName}
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <MapPin size={11} className="text-amber-500 shrink-0" />
                            {slot.room}
                          </span>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-[var(--border-color)]/60 flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditSlotModal(daySchedule.day, slot)}
                            className="p-1 rounded text-[var(--text-muted)] hover:text-brand-500 hover:bg-brand-500/10 transition-colors"
                            title="Edit Slot"
                          >
                            <Edit2 size={13} />
                          </button>
                          {daySchedule.slots.length > 1 && (
                            <button
                              onClick={() => handleDeleteSlot(daySchedule.day, slot.slotNumber)}
                              className="p-1 rounded text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                              title="Delete Slot"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── EDIT / ADD SLOT MODAL ────────────────────────────────────────── */}
      <AnimatePresence>
        {showSlotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-6 text-[var(--text-primary)] my-8 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                    {isAddingNew ? <Plus size={16} /> : <Edit2 size={16} />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      {isAddingNew ? `Add Period #${slotForm.slotNumber}` : `Edit Period #${slotForm.slotNumber}`} ({targetDay})
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Semester {selectedSemester} Schedule
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSlotModal(false)}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveSlot} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Subject Name *</label>
                  <input
                    type="text"
                    required
                    value={slotForm.subjectName}
                    onChange={(e) => setSlotForm({ ...slotForm, subjectName: e.target.value })}
                    className="input text-xs mt-1 w-full"
                    placeholder="e.g. Data Structures & Algorithms"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Subject Code</label>
                    <input
                      type="text"
                      required
                      value={slotForm.subjectCode}
                      onChange={(e) => setSlotForm({ ...slotForm, subjectCode: e.target.value.toUpperCase() })}
                      className="input text-xs mt-1 w-full font-mono uppercase"
                      placeholder="e.g. CSE-301"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Session Type</label>
                    <select
                      value={slotForm.type}
                      onChange={(e) => setSlotForm({ ...slotForm, type: e.target.value })}
                      className="input text-xs mt-1 w-full"
                    >
                      <option value="lecture">Lecture</option>
                      <option value="lab">Practical Lab</option>
                      <option value="tutorial">Tutorial</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Start Time</label>
                    <input
                      type="text"
                      value={slotForm.startTime}
                      onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })}
                      className="input text-xs mt-1 w-full font-mono"
                      placeholder="08:00 AM"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">End Time</label>
                    <input
                      type="text"
                      value={slotForm.endTime}
                      onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })}
                      className="input text-xs mt-1 w-full font-mono"
                      placeholder="09:00 AM"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Faculty In-Charge</label>
                    <input
                      type="text"
                      value={slotForm.facultyName}
                      onChange={(e) => setSlotForm({ ...slotForm, facultyName: e.target.value })}
                      className="input text-xs mt-1 w-full"
                      placeholder="e.g. Dr. K. Patel"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Lecture Hall / Lab</label>
                    <input
                      type="text"
                      value={slotForm.room}
                      onChange={(e) => setSlotForm({ ...slotForm, room: e.target.value })}
                      className="input text-xs mt-1 w-full font-mono"
                      placeholder="e.g. LH-101"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowSlotModal(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={saving}
                    className="flex items-center gap-1.5"
                  >
                    <Save size={14} />
                    {isAddingNew ? 'Add Session' : 'Update Slot'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
