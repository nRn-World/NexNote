import React from 'react';
import { Lock, LockOpen, X, Check } from 'lucide-react';

interface LockModalProps {
  open: boolean;
  onClose: () => void;
  onUnlock: (password: string) => void;
  onSetLock: (password: string) => void;
  isLocked: boolean;
  password: string;
  setPassword: (p: string) => void;
}

export default function LockModal({
  open, onClose, onUnlock, onSetLock, isLocked, password, setPassword,
}: LockModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-panel rounded-2xl p-8 w-full max-w-sm shadow-2xl border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {isLocked ? <Lock size={24} className="text-yellow-400" /> : <LockOpen size={24} className="text-cyan-400" />}
            <h3 className="text-lg font-bold text-white">
              {isLocked ? 'Lås upp anteckning' : 'Lås anteckning'}
            </h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
            {isLocked ? 'Ange lösenord' : 'Ställ in lösenord'}
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={isLocked ? 'Lösenord...' : 'Välj lösenord...'}
            className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
          />

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-transparent border border-white/10 text-zinc-300 hover:bg-white/5 transition-all"
            >
              Avbryt
            </button>
            <button
              onClick={() => (isLocked ? onUnlock(password) : onSetLock(password))}
              disabled={!password}
              className={`flex-1 py-3 rounded-xl font-bold text-white transition-all disabled:opacity-50 ${
                isLocked
                  ? 'bg-cyan-500 hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                  : 'bg-yellow-500 hover:bg-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.3)]'
              }`}
            >
              {isLocked ? 'Lås upp' : 'Sätt lås'}
              {!isLocked && <Check size={16} className="ml-2" />}
            </button>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-[10px] text-zinc-500 text-center">
            {isLocked
              ? 'Lösenordet sparas lokalt. Glömt lösenord = förlorad åtkomst.'
              : 'Anteckningen kommer att vara låst med detta lösenord.'}
          </p>
        </div>
      </div>
    </div>
  );
}
