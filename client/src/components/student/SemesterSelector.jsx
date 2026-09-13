import React from 'react';
import Select from '../ui/Select.jsx';

const SEMESTERS = Array.from({ length: 8 }, (_, i) => ({ value: i + 1, label: `Semester ${i + 1}` }));
const YEARS = ['2024-25', '2023-24', '2022-23', '2021-22', '2020-21'];

export default function SemesterSelector({ selectedSemester, selectedYear, onSemesterChange, onYearChange }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Select
        id="semester-select"
        label="Semester"
        value={selectedSemester}
        onChange={(e) => onSemesterChange(e.target.value)}
        options={[{ value: '', label: 'All Semesters' }, ...SEMESTERS.map(s => ({ value: s.value, label: s.label }))]}
        className="w-40"
      />
      <Select
        id="year-select"
        label="Academic Year"
        value={selectedYear}
        onChange={(e) => onYearChange(e.target.value)}
        options={[{ value: '', label: 'All Years' }, ...YEARS.map(y => ({ value: y, label: y }))]}
        className="w-36"
      />
    </div>
  );
}
