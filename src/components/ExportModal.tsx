import React, { useState } from 'react';
import { Copy, Check, Download, Package, X, Code2, Layers, Cpu } from 'lucide-react';
import { cn } from '../lib/utils';
import { useToast } from '../hooks/useToast';

interface ExportModalProps {
  code: { html: string; css: string; js: string };
  title: string;
  onClose: () => void;
}

export default function ExportModal({ code, title, onClose }: ExportModalProps) {
  const [activeTab, setActiveTab] = useState<'react' | 'vue' | 'standalone'>('react');
  const [isCopied, setIsCopied] = useState(false);
  const { addToast } = useToast();

  const generateReactComponent = () => {
    const componentName = title.replace(/\s+/g, '') || 'MyComponent';
    return `import React, { useEffect } from 'react';

export default function ${componentName}() {
  useEffect(() => {
    // Generated JavaScript logic
    ${code.js.split('\n').map(l => '    ' + l).join('\n')}
  }, []);

  return (
    <>
      <style>{\`
        ${code.css.split('\n').map(l => '        ' + l).join('\n')}
      \`}</style>
      <div className="nexnote-export-root">
        ${code.html.split('\n').map(l => '        ' + l).join('\n')}
      </div>
    </>
  );
}
`;
  };

  const generateStandalone = () => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title || 'NexNote Export'}</title>
  <style>
    body { margin: 0; padding: 0; background: #000; color: #fff; }
    ${code.css}
  </style>
</head>
<body>
  ${code.html}
  <script>
    ${code.js}
  </script>
</body>
</html>`;
  };

  const copyToClipboard = async () => {
    const text = activeTab === 'react' ? generateReactComponent() : generateStandalone();
    await navigator.clipboard.writeText(text);
    setIsCopied(true);
    addToast('Component copied to clipboard!', 'success');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const downloadFile = () => {
    const text = activeTab === 'react' ? generateReactComponent() : generateStandalone();
    const ext = activeTab === 'react' ? 'tsx' : 'html';
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_') || 'Export'}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    addToast('File download started!', 'success');
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-3xl bg-[#0B0D17] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Package className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight uppercase italic">{activeTab === 'react' ? 'React Export' : 'Pro Export'}</h2>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Component Library Suite</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1 p-4 bg-white/2">
          {(['react', 'standalone'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                activeTab === tab ? "bg-indigo-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
              )}
            >
              {tab === 'react' ? <div className="flex items-center justify-center gap-2"><Cpu size={14} /> React / Next.js</div> : <div className="flex items-center justify-center gap-2"><Layers size={14} /> HTML Standalone</div>}
            </button>
          ))}
        </div>

        {/* Code View */}
        <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-6">
          <div className="flex-1 bg-[#0E111C] border border-white/10 rounded-2xl p-4 overflow-y-auto no-scrollbar relative group">
            <pre className="text-[11px] text-indigo-300 font-mono leading-relaxed whitespace-pre-wrap">
              {activeTab === 'react' ? generateReactComponent() : generateStandalone()}
            </pre>
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex gap-2">
                <button onClick={copyToClipboard} className="p-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg shadow-xl"><Copy size={16} /></button>
                <button onClick={downloadFile} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg shadow-xl"><Download size={16} /></button>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={copyToClipboard}
              className="py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-xs font-black uppercase tracking-widest border border-white/10 flex items-center justify-center gap-3 transition-all"
            >
              {isCopied ? <><Check size={16} className="text-green-400" /> Copied!</> : <><Copy size={16} /> Copy to Clipboard</>}
            </button>
            <button
              onClick={downloadFile}
              className="py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-500/10"
            >
              <Download size={16} /> Download File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
