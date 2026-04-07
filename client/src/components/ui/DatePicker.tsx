import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar, X } from "lucide-react";

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
// Week starting Monday
const DAYS_FR = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

interface DatePickerProps {
  value: string;                    // "YYYY-MM-DD" or ""
  onChange: (v: string) => void;
  placeholder?: string;
  minDate?: string;                 // "YYYY-MM-DD"
  maxDate?: string;                 // "YYYY-MM-DD"
  className?: string;
}

function parseLocal(iso: string): Date {
  // Parse as local midnight to avoid timezone shifts
  return new Date(iso + "T00:00:00");
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "Sélectionner…",
  minDate,
  maxDate,
  className = "",
}: DatePickerProps) {
  const [open, setOpen]           = useState(false);
  const ref                       = useRef<HTMLDivElement>(null);

  const todayRaw                  = new Date();
  const today                     = new Date(todayRaw.getFullYear(), todayRaw.getMonth(), todayRaw.getDate());
  const selectedDate              = value ? parseLocal(value) : null;

  const [viewYear,  setViewYear]  = useState(selectedDate?.getFullYear()  ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate?.getMonth()     ?? today.getMonth());

  // Sync view when value changes externally
  useEffect(() => {
    if (selectedDate) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const displayLabel = selectedDate
    ? selectedDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  // ── Month navigation ───────────────────────────────────────────────────────
  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  // ── Build calendar grid ────────────────────────────────────────────────────
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  // getDay(): 0=Sun → convert to Mon-based: (dow + 6) % 7
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  // ── Day state helpers ──────────────────────────────────────────────────────
  const dayDate = (d: number) => new Date(viewYear, viewMonth, d);

  const isDisabled = (d: number) => {
    const dt = dayDate(d);
    if (minDate && dt < parseLocal(minDate)) return true;
    if (maxDate && dt > parseLocal(maxDate)) return true;
    return false;
  };

  const isToday    = (d: number) => dayDate(d).getTime() === today.getTime();
  const isSelected = (d: number) =>
    !!selectedDate && dayDate(d).getTime() === selectedDate.getTime();

  const select = (d: number) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  };

  const goToday = () => {
    const yyyy = today.getFullYear();
    const mm   = String(today.getMonth() + 1).padStart(2, "0");
    const dd   = String(today.getDate()).padStart(2, "0");
    onChange(`${yyyy}-${mm}-${dd}`);
    setViewYear(yyyy);
    setViewMonth(today.getMonth());
    setOpen(false);
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  return (
    <div ref={ref} className={`relative ${className}`}>

      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-xl border border-[#CACAC4] dark:border-white/[0.06] bg-white dark:bg-[#2A2A2E] hover:bg-[#F2F2F2] dark:hover:bg-white/[0.04] transition-colors w-full justify-between ${
          displayLabel ? "text-[#0D0D0D] dark:text-white" : "text-[#9E9EA3]"
        }`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Calendar className="w-4 h-4 text-[#9E9EA3] shrink-0" />
          <span className="truncate font-medium">{displayLabel ?? placeholder}</span>
        </span>
        {displayLabel ? (
          <span onClick={clear} className="text-[#9E9EA3] hover:text-red-500 transition-colors shrink-0">
            <X className="w-3.5 h-3.5" />
          </span>
        ) : (
          <ChevronLeft className={`w-3.5 h-3.5 text-[#9E9EA3] transition-transform -rotate-90 ${open ? "rotate-90" : ""}`} />
        )}
      </button>

      {/* ── Popover ── */}
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 bg-white dark:bg-[#1A1A1D] rounded-2xl border border-[#CACAC4] dark:border-white/[0.08] shadow-2xl overflow-hidden">

          {/* Month / year navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#CACAC4] dark:border-white/[0.06]">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-[#F2F2F2] dark:hover:bg-white/[0.06] text-[#6B6B6F] dark:text-[#9E9EA3] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-sm font-bold text-[#0D0D0D] dark:text-white select-none">
              {MONTHS_FR[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-[#F2F2F2] dark:hover:bg-white/[0.06] text-[#6B6B6F] dark:text-[#9E9EA3] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 px-3 pt-3 pb-1">
            {DAYS_FR.map((d) => (
              <div
                key={d}
                className="text-center text-[10px] font-bold uppercase tracking-wide text-[#9E9EA3] py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 px-3 pb-3 gap-y-1">
            {cells.map((day, idx) =>
              day === null ? (
                <div key={idx} />
              ) : (
                <button
                  key={idx}
                  type="button"
                  disabled={isDisabled(day)}
                  onClick={() => select(day)}
                  className={`w-full aspect-square rounded-lg text-xs font-medium flex items-center justify-center transition-all ${
                    isSelected(day)
                      ? "bg-[#FFD600] text-[#0D0D0D] font-bold shadow-sm"
                      : isToday(day)
                      ? "ring-2 ring-[#FFD600]/70 text-[#0D0D0D] dark:text-white font-semibold"
                      : isDisabled(day)
                      ? "text-[#CACAC4] dark:text-white/20 cursor-not-allowed"
                      : "text-[#0D0D0D] dark:text-white hover:bg-[#FFD600]/20 dark:hover:bg-[#FFD600]/10"
                  }`}
                >
                  {day}
                </button>
              )
            )}
          </div>

          {/* Footer */}
          <div className="px-3 pb-3 pt-1 border-t border-[#CACAC4] dark:border-white/[0.06]">
            <button
              type="button"
              onClick={goToday}
              className="w-full py-2 rounded-xl text-xs font-semibold text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-[#F2F2F2] dark:hover:bg-white/[0.04] transition-colors border border-[#CACAC4] dark:border-white/[0.06]"
            >
              Aujourd'hui
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
