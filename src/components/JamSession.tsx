import React, { useState } from 'react';
import { Copy, Check, Download, Code2, X, Globe } from 'lucide-react';
import { useToast } from '../hooks/useToast';

interface JamSessionProps {
  noteId: string;
  user: any;
  currentCode: { html: string; css: string; js: string };
  onUpdate: (newCode: { html: string; css: string; js: string }) => void;
  onClose: () => void;
}

function buildStandalone(code: JamSessionProps['currentCode']): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${code.css || ''}</style>
</head>
<body>
${code.html || ''}
<script>${code.js || ''}<\/script>
</body>
</html>`;
}

/**
 * Shares the current note's code as a standalone HTML file.
 * The previous version simulated a live session with fake participants, which
 * promised real-time editing the app does not have.
 */
export default function JamSession({ currentCode, onClose }: JamSessionProps) {
  const { addToast } = useToast();
  const [copied, setCopied] = useState(false);
  const html = buildStandalone(currentCode);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addToast('Färdig HTML kopierad.', 'success');
    } catch {
      addToast('Kunde inte kopiera till urklipp.', 'error');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nexnote-design.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('HTML-fil nedladdad.', 'success');
  };

  return (
    <div className="absolute inset-0 z-50 bg-[#0B0D17] border-t border-white/10 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-900/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Globe className="text-white" size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white italic uppercase tracking-widest">Dela kod</h3>
            <p className="text-[10px] text-zinc-500 font-bold">Exportera anteckningens kod som en färdig HTML-fil</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"><X size={18} /></button>
      </div>

      <div className="flex-1 p-6 space-y-6 overflow-y-auto no-scrollbar">
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-xl">
            <div className="text-[10px] text-cyan-400 font-mono mb-1">HTML</div>
            <div className="text-[10px] text-zinc-500 truncate">{currentCode.html ? `${currentCode.html.length} tecken` : 'Tom'}</div>
          </div>
          <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-xl">
            <div className="text-[10px] text-indigo-400 font-mono mb-1">CSS</div>
            <div className="text-[10px] text-zinc-500 truncate">{currentCode.css ? `${currentCode.css.length} tecken` : 'Tom'}</div>
          </div>
          <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-xl">
            <div className="text-[10px] text-yellow-400 font-mono mb-1">JS</div>
            <div className="text-[10px] text-zinc-500 truncate">{currentCode.js ? `${currentCode.js.length} tecken` : 'Tom'}</div>
          </div>
        </div>

        <pre className="max-h-64 overflow-auto rounded-2xl border border-white/10 bg-[#0E111C] p-4 text-[11px] leading-relaxed text-zinc-400 whitespace-pre-wrap font-mono">
          {html.slice(0, 1200)}{html.length > 1200 ? '\n…' : ''}
        </pre>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-black uppercase tracking-[0.2em] transition-all"
          >
            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
            {copied ? 'Kopierat' : 'Kopiera HTML'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 transition-all"
          >
            <Download size={16} /> Ladda ned .html
          </button>
        </div>

        <p className="text-[10px] text-zinc-600 leading-relaxed">
          <Code2 size={12} className="inline mr-1" />
          Filen är helt fristående och kan öppnas i vilken webbläsare som helst.
        </p>
      </div>
    </div>
  );
}
