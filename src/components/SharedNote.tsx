import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Note } from '../types';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

interface SharedNoteProps {
  shareId: string;
}

export default function SharedNote({ shareId }: SharedNoteProps) {
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const q = query(collection(db, 'notes'), where('shareId', '==', shareId), where('isShared', '==', true));
        const snap = await getDocs(q);
        if (snap.empty) { setNotFound(true); return; }
        const data = snap.docs[0].data();
        setNote({
          id: snap.docs[0].id, uid: data.uid, title: data.title, content: data.content,
          attachments: data.attachments ? JSON.parse(data.attachments) : [],
          tags: data.tags || [], createdAt: data.createdAt, updatedAt: data.updatedAt,
        });
      } catch { setNotFound(true); }
      finally { setLoading(false); }
    };
    load();
  }, [shareId]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-zinc-50 text-zinc-500">Loading...</div>
  );

  if (notFound || !note) return (
    <div className="flex h-screen items-center justify-center bg-zinc-50">
      <div className="text-center">
        <p className="text-2xl font-bold text-zinc-900 mb-2">Note not found</p>
        <p className="text-zinc-500">The link may have been disabled by the owner.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-zinc-200 p-8 md:p-12">
        <div className="flex items-center justify-between mb-8">
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">NexNote</span>
          <span className="text-xs text-zinc-400">{format(note.updatedAt, 'MMM d, yyyy', { locale: enUS })}</span>
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 mb-4">{note.title || 'Untitled note'}</h1>
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {note.tags.map(t => (
              <span key={t} className="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-full text-xs">{t}</span>
            ))}
          </div>
        )}
        <div
          className="prose prose-zinc max-w-none text-zinc-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: note.content }}
        />
      </div>
    </div>
  );
}
