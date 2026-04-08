import React from 'react';
import { Home, Plus, Search, Globe, UserCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface MobileBottomNavProps {
  activeNoteId: string | null;
  searchQuery: string;
  onGoHome: () => void;
  onCreateNote: () => void;
  onSearch: () => void;
  onCommunity: () => void;
  onProfile: () => void;
}

export default function MobileBottomNav({
  activeNoteId, searchQuery, onGoHome, onCreateNote, onSearch, onCommunity, onProfile
}: MobileBottomNavProps) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-white/5 safe-area-bottom">
      <div className="flex items-center justify-around py-2 px-2">
        <button onClick={onGoHome}
          className={cn('flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[56px]',
            !activeNoteId ? 'text-cyan-400' : 'text-[var(--text-secondary)]'
          )}>
          <Home size={20} />
          <span className="text-[9px] font-bold">Home</span>
        </button>

        <button onClick={onSearch}
          className={cn('flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[56px]',
            searchQuery ? 'text-cyan-400' : 'text-[var(--text-secondary)]'
          )}>
          <Search size={20} />
          <span className="text-[9px] font-bold">Search</span>
        </button>

        <button onClick={onCreateNote}
          className="flex flex-col items-center justify-center -mt-4">
          <div className="w-14 h-14 bg-white text-black rounded-2xl flex items-center justify-center shadow-lg shadow-white/10 active:scale-90 transition-transform">
            <Plus size={24} />
          </div>
        </button>

        <button onClick={onCommunity}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[var(--text-secondary)] transition-colors min-w-[56px]">
          <Globe size={20} />
          <span className="text-[9px] font-bold">Community</span>
        </button>

        <button onClick={onProfile}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[var(--text-secondary)] transition-colors min-w-[56px]">
          <UserCircle size={20} />
          <span className="text-[9px] font-bold">Profile</span>
        </button>
      </div>
    </div>
  );
}
