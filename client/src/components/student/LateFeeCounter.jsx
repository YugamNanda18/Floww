import React, { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';

const fmt = (paise) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);

/**
 * LateFeeCounter — Shows the real-time daily penalty accrual.
 * Ticks every second to simulate real-time accumulation.
 */
export default function LateFeeCounter({ outstanding, dailyRate }) {
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSecondsElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const dailyPenalty = outstanding * (dailyRate / 100);
  const perSecond = dailyPenalty / (24 * 60 * 60);
  const accruing = perSecond * secondsElapsed;

  return (
    <span className="flex items-center gap-1 text-amber-300 font-medium">
      <TrendingUp size={13} />
      +{fmt(accruing)} accruing today
    </span>
  );
}
