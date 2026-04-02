import React from 'react';
import { Paperclip, File as FileIcon, Download, Trash2 } from 'lucide-react';
import { Attachment } from '../types';
import { cn } from '../lib/utils';

interface AttachmentListProps {
  attachments: Attachment[];
  onDownload: (a: Attachment) => void;
  onRemove: (id: string) => void;
  onImageClick: (url: string) => void;
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function AttachmentList({ attachments, onDownload, onRemove, onImageClick }: AttachmentListProps) {
  if (attachments.length === 0) return null;
  return (
    <div className="mt-12 pt-6 border-t border-zinc-100">
      <h4 className="text-sm font-medium text-zinc-500 mb-4 flex items-center gap-2">
        <Paperclip size={16} />
        Attachments ({attachments.length})
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {attachments.map(a => (
          <div key={a.id} className="flex items-center p-3 bg-zinc-50 border border-zinc-200 rounded-lg group">
            <div
              className={cn(
                'w-10 h-10 rounded bg-zinc-200 flex items-center justify-center text-zinc-500 shrink-0 overflow-hidden',
                a.type.startsWith('image/') && 'cursor-pointer hover:opacity-80 transition-opacity'
              )}
              onClick={() => a.type.startsWith('image/') && onImageClick(a.data)}
            >
              {a.type.startsWith('image/') ? (
                <img src={a.data} alt={a.name} className="w-full h-full object-cover" />
              ) : (
                <FileIcon size={20} />
              )}
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate" title={a.name}>{a.name}</p>
              <p className="text-xs text-zinc-500">{formatFileSize(a.size)}</p>
            </div>
            <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onDownload(a)} className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 rounded-md" title="Download">
                <Download size={16} />
              </button>
              <button onClick={() => onRemove(a.id)} className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-md" title="Delete">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
