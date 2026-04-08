import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Eraser, Trash2, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface DrawingCanvasProps {
  onSave: (dataUrl: string) => void;
  onClose: () => void;
  isDark?: boolean;
}

export default function DrawingCanvas({ onSave, onClose, isDark = true }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#00F2FF');
  const [lineWidth, setLineWidth] = useState(5);
  const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil');
  const [paperColor, setPaperColor] = useState<'white' | 'black'>('black');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set internal canvas resolution
    canvas.width = 800;
    canvas.height = 500;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    // Scale coordinates based on canvas resolution and display size
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    return { x, y };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const { x, y } = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = tool === 'eraser' ? (paperColor === 'black' ? '#0a0a0f' : '#ffffff') : color;
      ctx.lineWidth = lineWidth;
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a temporary canvas to include the background color in the saved image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Draw the background color
    tempCtx.fillStyle = paperColor === 'black' ? '#0a0a0f' : '#ffffff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Draw the original canvas on top
    tempCtx.drawImage(canvas, 0, 0);

    const dataUrl = tempCanvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-4xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Sketchpad</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-zinc-800 rounded-lg p-1 border border-zinc-700">
              <button
                onClick={() => setPaperColor('black')}
                className={cn(
                  "px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all",
                  paperColor === 'black' ? "bg-black text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                Black
              </button>
              <button
                onClick={() => setPaperColor('white')}
                className={cn(
                  "px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all",
                  paperColor === 'white' ? "bg-white text-black shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                White
              </button>
            </div>
            <button onClick={onClose} className="p-1 text-zinc-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="p-3 border-b border-zinc-800 bg-zinc-900/30 flex items-center gap-6 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 p-1 bg-zinc-950/50 rounded-xl border border-white/5">
            {[
              { id: 'pencil', icon: <Pencil size={14} />, label: 'Draw' },
              { id: 'eraser', icon: <Eraser size={14} />, label: 'Erase' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTool(t.id as any)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  tool === t.id ? "bg-white text-black" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-zinc-800" />

          <div className="flex items-center gap-2">
            {[
              '#00F2FF', '#BC00FF', '#FF00E5', '#FF4D00',
              '#FFD600', '#00FF66', '#FFFFFF', '#000000'
            ].map(c => (
              <button
                key={c}
                onClick={() => { setColor(c); if (tool === 'eraser') setTool('pencil'); }}
                className={cn(
                  "w-6 h-6 rounded-full border-2 transition-all hover:scale-110",
                  color === c && tool === 'pencil' ? "border-white scale-110 shadow-lg" : "border-transparent"
                )}
                style={{ background: c }}
              />
            ))}
          </div>

          <div className="h-6 w-px bg-zinc-800" />

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Brush Size</span>
            <input
              type="range" min="1" max="20"
              value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))}
              className="w-24 h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          <button
            onClick={handleClear}
            className="ml-auto flex items-center gap-2 px-4 py-2 text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors uppercase tracking-widest"
          >
            <Trash2 size={14} /> Clear
          </button>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 bg-zinc-950 p-6 flex items-center justify-center overflow-hidden">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className={cn(
              "max-w-full max-h-full cursor-crosshair touch-none rounded-xl border border-white/5 shadow-2xl transition-all duration-300",
              paperColor === 'black' ? 'bg-[#0a0a0f]' : 'bg-white'
            )}
            style={{ width: '800px', height: '500px' }}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-xs font-bold text-zinc-400 hover:text-white transition-colors uppercase tracking-widest"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-8 py-2.5 bg-white text-black rounded-xl text-xs font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-lg"
          >
            Finish & Add
          </button>
        </div>
      </div>
    </div>
  );
}
