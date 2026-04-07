import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Calendar } from "lucide-react";

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const MONTHS_SHORT = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
  "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc",
];

interface MonthPickerProps {
  value: string;                   // "YYYY-MM"
  onChange: (v: string) => void;
  className?: string;
}

export default function MonthPicker({ value, onChange, className = "" }: MonthPickerProps) {
  const [open, setOpen]         = useState(false);
  const ref                     = useRef<HTMLDivElement>(null);
  const today                   = new Date();
  const todayYear               = today.getFullYear();
  const todayMonth              = today.getMonth(); // 0-indexed

  const selectedYear  = value ? parseInt(value.slice(0, 4), 10) : null;
  const selectedMonth = value ? parseInt(value.slice(5, 7), 10) - 1 : null;

  const [viewYear, setViewYear] = useState(selectedYear ?? todayYear);

  // Sync view year when value changes externally
  useEffect(() => {
    if (value) setViewYear(parseInt(value.slice(0, 4), 10));
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const displayLabel = value
    ? `${MONTHS_FR[selectedMonth!]} ${selectedYear}`
    : "Sélectionner…";

  const isFuture   = (m: number) => viewYear > todayYear || (viewYear === todayYear && m > todayMonth);
  const isSelected = (m: number) => viewYear === selectedYear && m === selectedMonth;

  const select = (m: number) => {
    onChange(`${viewYear}-${String(m + 1).padStart(2, "0")}`);
    setOpen(false);
  };

  const goToToday = () => {
    onChange(`${todayYear}-${String(todayMonth + 1).padStart(2, "0")}`);
    setViewYear(todayYear);
    setOpen(false);
  };

  return (
    <div ref={ref} className={`relative ${className}`}>

      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl border border-[#CACAC4] dark:border-white/[0.06] bg-white dark:bg-[#2A2A2E] text-[#0D0D0D] dark:text-white hover:bg-[#F2F2F2] dark:hover:bg-white/[0.04] transition-colors w-full justify-between"
      >
        <span className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-teal-500 shrink-0" />
          <span className="font-medium">{displayLabel}</span>
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#9E9EA3] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* ── Popover ── */}
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 bg-white dark:bg-[#1A1A1D] rounded-2xl border border-[#CACAC4] dark:border-white/[0.08] shadow-2xl overflow-hidden">

          {/* Year navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#CACAC4] dark:border-white/[0.06]">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              className="p-1.5 rounded-lg hover:bg-[#F2F2F2] dark:hover:bg-white/[0.06] text-[#6B6B6F] dark:text-[#9E9EA3] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-sm font-bold text-[#0D0D0D] dark:text-white select-none">
              {viewYear}
            </span>

            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              disabled={viewYear >= todayYear}
              className="p-1.5 rounded-lg hover:bg-[#F2F2F2] dark:hover:bg-white/[0.06] text-[#6B6B6F] dark:text-[#9E9EA3] transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Month grid — 3 × 4 */}
          <div className="grid grid-cols-3 gap-1.5 p-3">
            {MONTHS_SHORT.map((label, i) => {
              const future   = isFuture(i);
              const selected = isSelected(i);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={future}
                  onClick={() => select(i)}
                  className={`py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    selected
                      ? "bg-[#FFD600] text-[#0D0D0D] shadow-sm scale-105"
                      : future
                      ? "text-[#CACAC4] dark:text-white/20 cursor-not-allowed"
                      : "text-[#0D0D0D] dark:text-white hover:bg-[#FFD600]/20 dark:hover:bg-[#FFD600]/10 hover:scale-105"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* "Mois en cours" shortcut */}
          <div className="px-3 pb-3">
            <button
              type="button"
              onClick={goToToday}
              className="w-full py-2 rounded-xl text-xs font-semibold text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-[#F2F2F2] dark:hover:bg-white/[0.04] transition-colors border border-[#CACAC4] dark:border-white/[0.06]"
            >
              Mois en cours
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
