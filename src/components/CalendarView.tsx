import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, subMonths, addMonths } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, X, Plus } from 'lucide-react';
import { Note } from '../types';

interface CalendarViewProps {
  open: boolean;
  onClose: () => void;
  notes: Note[];
  onSelectNote: (id: string) => void;
}

export default function CalendarView({
  open, onClose, notes, onSelectNote,
}: CalendarViewProps) {
  const [viewDate, setViewDate] = useState(new Date());

  if (!open) return null;

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Group notes by date
  const notesByDate: Record<string, Note[]> = {};
  notes.forEach(n => {
    const d = new Date(n.updatedAt);
    const key = format(d, 'yyyy-MM-dd');
    if (!notesByDate[key]) notesByDate[key] = [];
    notesByDate[key].push(n);
  });

  const prevMonth = () => setViewDate(subMonths(viewDate, 1));
  const nextMonth = () => setViewDate(addMonths(viewDate, 1));

  const monthName = format(viewDate, 'MMMM yyyy', { locale: enUS });
  const weekdays = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];

  // Find first day of week for the first day of month
  const firstDayOfMonth = days[0];
  const firstDayIndex = firstDayOfMonth.getDay(); // 0 = Sun

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-panel rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-white/10 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Calendar size={24} className="text-cyan-400" />
            <h3 className="text-lg font-bold text-white">Kalender</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <ChevronLeft size={18} />
          </button>
          <h4 className="text-base font-bold text-white">{monthName}</h4>
          <button onClick={nextMonth} className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekdays.map(day => (
            <div key={day} className="text-center text-[10px] font-bold text-zinc-500 uppercase">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="h-12" />
          ))}

          {days.map(day => {
            const dayNotes = notesByDate[format(day, 'yyyy-MM-dd')] || [];
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, viewDate);

            return (
              <div
                key={format(day, 'yyyy-MM-dd')}
                className={`
                  h-12 rounded-xl flex flex-col items-center justify-center p-1 cursor-pointer transition-all
                  ${isToday ? 'bg-cyan-500/20 border border-cyan-500/50' : 'hover:bg-white/5'}
                  ${!isCurrentMonth ? 'text-zinc-600' : ''}
                `}
                onClick={() => {
                  if (dayNotes.length === 1) {
                    onSelectNote(dayNotes[0].id);
                    onClose();
                  } else if (dayNotes.length > 1) {
                    // Could show a day picker, for now just open first
                    onSelectNote(dayNotes[0].id);
                    onClose();
                  }
                }}
              >
                <div className="text-[11px] font-bold {isToday ? 'text-cyan-400' : isCurrentMonth ? 'text-white' : 'text-zinc-500'}">
                  {format(day, 'd')}
                </div>
                {dayNotes.length > 0 && (
                  <div className="flex gap-0.5 mt-1">
                    {dayNotes.slice(0, 3).map((n, idx) => (
                      <div
                        key={idx}
                        className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_4px_rgba(6,182,212,0.6)]"
                        title={n.title}
                      />
                    ))}
                    {dayNotes.length > 3 && (
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 text-[9px] text-white flex items-center justify-center">+</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-white/10">
          <p className="text-[10px] text-zinc-500 mb-2">Anteckningar denna månad</p>
          <div className="space-y-1">
            {days.flatMap(day => notesByDate[format(day, 'yyyy-MM-dd')] || []).slice(0, 10).map(n => (
              <div key={n.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors" onClick={() => { onSelectNote(n.id); onClose(); }}>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-white truncate">{n.title || 'Namnlös'}</div>
                  <div className="text-[9px] text-zinc-500">{format(new Date(n.updatedAt), 'd MMM HH:mm', { locale: enUS })}</div>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
