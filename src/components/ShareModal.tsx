import React, { useState } from 'react';
import { X, Link, Check, Globe, Lock } from 'lucide-react';
import { cn } from '../lib/utils';

interface ShareModalProps {
  noteTitle: string;
  isShared: boolean;
  shareUrl: string | null;
  onEnable: () => void;
  onDisable: () => void;
  onClose: () => void;
}

export default function ShareModal({ noteTitle, isShared, shareUrl, onEnable, onDisable, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-md w-full p-6 border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Share note</h2>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5 truncate">"{noteTitle || 'Untitled note'}"</p>

        <div className={cn(
          'flex items-center gap-3 p-4 rounded-lg border mb-4',
          isShared
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
        )}>
          {isShared
            ? <Globe size={20} className="text-green-600 dark:text-green-400 shrink-0" />
            : <Lock size={20} className="text-zinc-400 shrink-0" />
          }
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-900 dark:text-white">
              {isShared ? 'Public link active' : 'Private'}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {isShared ? 'Anyone with the link can read.' : 'Only you can see this note.'}
            </p>
          </div>
          <button
            onClick={isShared ? onDisable : onEnable}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors shrink-0',
              isShared
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90'
            )}
          >
            {isShared ? 'Disable' : 'Enable sharing'}
          </button>
        </div>

        {isShared && shareUrl && (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300 truncate font-mono">
              {shareUrl}
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-medium rounded-md hover:opacity-90 transition-opacity shrink-0"
            >
              {copied ? <Check size={14} /> : <Link size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
