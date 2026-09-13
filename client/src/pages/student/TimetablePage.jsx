import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Calendar, Clock, BookOpen, User, MapPin, Coffee,
  Sparkles, Layers, CheckCircle2, ChevronRight, Filter
} from 'lucide-react';
import api from '../../config/api.js';
import PageHeader from '../../components/shared/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TimetablePage() {
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('ALL'); // 'ALL' or Day name

  const currentDayIndex = new Date().getDay();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = dayNames[currentDayIndex];
  const activeToday = todayName === 'Sunday' ? 'Monday' : todayName;

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        const res = await api.get('/student/timetable');
        setTimetable(res.data.data);
      } catch (err) {
        toast.error('Failed to load academic timetable');
      } finally {
        setLoading(false);
      }
    };
    fetchTimetable();
  }, []);

  if (loading) return <PageSpinner />;

  const schedule = timetable?.weeklySchedule || [];
  const daysToRender = selectedDay === 'ALL'
    ? schedule
    : schedule.filter(d => d.day === selectedDay);

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
    <div className="space-y-6">
      <PageHeader
        title="Institutional Academic Timetable"
        subtitle="Weekly lecture schedule (Mon–Sat, 08:00 AM – 03:00 PM) with scheduled lunch break"
        breadcrumbs={['Student Portal', 'Timetable']}
      />

      {/* Schedule Meta Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3.5 border-brand-500/20">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">Institutional Hours</p>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              {timetable?.collegeHours || '08:00 AM - 03:00 PM'} (Mon–Sat)
            </p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3.5 border-amber-500/20">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Coffee size={20} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">Mandatory Lunch Break</p>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              {timetable?.lunchBreak || '11:15 AM - 12:00 PM'} (45 Mins)
            </p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3.5 border-emerald-500/20">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Calendar size={20} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">Today's Academic Status</p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {activeToday} · In Session
            </p>
          </div>
        </div>
      </div>

      {/* Day Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedDay('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            selectedDay === 'ALL'
              ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
              : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          All Days (Mon–Sat)
        </button>

        {DAYS.map(day => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              selectedDay === day
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {day}
            {day === activeToday && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1" title="Today" />
            )}
          </button>
        ))}
      </div>

      {/* Timetable Schedule Cards */}
      <div className="space-y-6">
        {daysToRender.map((daySchedule, dIdx) => {
          const isToday = daySchedule.day === activeToday;

          // Split slots into pre-lunch (slots 1, 2, 3) and post-lunch (slots 4, 5, 6)
          const morningSlots = daySchedule.slots.filter(s => s.slotNumber <= 3);
          const afternoonSlots = daySchedule.slots.filter(s => s.slotNumber > 3);

          return (
            <motion.div
              key={daySchedule.day}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: dIdx * 0.05 }}
              className={`card p-6 border ${
                isToday
                  ? 'border-brand-500/40 ring-1 ring-brand-500/20 shadow-md'
                  : 'border-[var(--border-color)]'
              }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)] mb-5">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                    isToday ? 'bg-brand-500 text-white shadow-sm' : 'bg-[var(--bg-card-hover)] text-[var(--text-secondary)]'
                  }`}>
                    {daySchedule.day.substring(0, 3)}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                      {daySchedule.day}
                      {isToday && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Today
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">6 Sessions · 08:00 AM to 03:00 PM</p>
                  </div>
                </div>

                <span className="text-xs font-mono font-medium text-[var(--text-secondary)]">
                  Sem {timetable?.semester} · {timetable?.academicYear}
                </span>
              </div>

              {/* Morning Sessions (08:00 AM - 11:15 AM) */}
              <div className="mb-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                  Morning Sessions (08:00 AM – 11:15 AM)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {morningSlots.map(slot => (
                    <div
                      key={slot.slotNumber}
                      className="p-4 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-color)] flex flex-col justify-between hover:border-brand-500/30 transition-colors"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400">
                            {slot.startTime} – {slot.endTime}
                          </span>
                          {getSlotTypeBadge(slot.type)}
                        </div>

                        <p className="font-bold text-sm text-[var(--text-primary)] leading-tight mb-1">
                          {slot.subjectName}
                        </p>
                        <p className="text-xs font-mono text-[var(--text-muted)] mb-3">
                          {slot.subjectCode}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-[var(--border-color)]/60 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                        <span className="flex items-center gap-1">
                          <User size={12} className="text-brand-500" />
                          <span className="truncate max-w-[120px]">{slot.facultyName}</span>
                        </span>
                        <span className="flex items-center gap-1 font-mono font-semibold">
                          <MapPin size={12} className="text-amber-500" />
                          {slot.room}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ─── MANDATORY LUNCH BREAK RIBBON ───────────────────────── */}
              <div className="my-5 p-3.5 rounded-xl bg-amber-500/10 border border-dashed border-amber-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-400 font-semibold">
                  <Coffee size={18} className="text-amber-500" />
                  <span>INSTITUTIONAL LUNCH BREAK · 11:15 AM TO 12:00 PM (45 MINUTES)</span>
                </div>
                <span className="hidden sm:inline-block font-mono text-amber-600 dark:text-amber-500 text-[11px]">
                  Campus Dining & Student Cafeteria
                </span>
              </div>

              {/* Afternoon Sessions (12:00 PM - 03:00 PM) */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                  Afternoon Sessions (12:00 PM – 03:00 PM)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {afternoonSlots.map(slot => (
                    <div
                      key={slot.slotNumber}
                      className="p-4 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-color)] flex flex-col justify-between hover:border-brand-500/30 transition-colors"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400">
                            {slot.startTime} – {slot.endTime}
                          </span>
                          {getSlotTypeBadge(slot.type)}
                        </div>

                        <p className="font-bold text-sm text-[var(--text-primary)] leading-tight mb-1">
                          {slot.subjectName}
                        </p>
                        <p className="text-xs font-mono text-[var(--text-muted)] mb-3">
                          {slot.subjectCode}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-[var(--border-color)]/60 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                        <span className="flex items-center gap-1">
                          <User size={12} className="text-brand-500" />
                          <span className="truncate max-w-[120px]">{slot.facultyName}</span>
                        </span>
                        <span className="flex items-center gap-1 font-mono font-semibold">
                          <MapPin size={12} className="text-amber-500" />
                          {slot.room}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
