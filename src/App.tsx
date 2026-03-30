import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Plus, Trash2, File as FileIcon, X, Code, Play, Camera, Clock, Copy, Check } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Note, Attachment, Category } from './types';
import { cn, handleFirestoreError, OperationType } from './lib/utils';
import { auth, db, storage, signInWithGoogle, logout } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection, doc, setDoc, deleteDoc, onSnapshot,
  query, where, getDocs
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import Sidebar from './components/Sidebar';
import NoteHeader from './components/NoteHeader';
import AttachmentList from './components/AttachmentList';
import RichEditor from './components/RichEditor';
import CodeEditor from './components/CodeEditor';
import Toast from './components/Toast';
import ConfirmDialog from './components/ConfirmDialog';
import ShareModal from './components/ShareModal';
import SharedNote from './components/SharedNote';
import { useToast } from './hooks/useToast';
import { useDarkMode } from './hooks/useDarkMode';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

interface ConfirmState {
  open: boolean; title: string; message: string; danger?: boolean; onConfirm: () => void;
}

export default function App() {
  const { isDark, toggle: toggleDark } = useDarkMode();
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTitleCopied, setIsTitleCopied] = useState(false);
  const [isContentCopied, setIsContentCopied] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'html' | 'css' | 'js' | 'preview'>('html');
  const [previewDoc, setPreviewDoc] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false, title: '', message: '', onConfirm: () => {} });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const saveTimeoutRef = useRef<Record<string, any>>({});
  const { toasts, addToast, removeToast } = useToast();

  // Check for shared note in URL
  const shareId = new URLSearchParams(window.location.search).get('share');
  if (shareId) return <SharedNote shareId={shareId} />;

  const activeNote = notes.find(n => n.id === activeNoteId);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setIsAuthReady(true); });
    return () => unsub();
  }, []);

  // Notes listener
  useEffect(() => {
    if (!isAuthReady || !user) { setNotes([]); return; }
    const q = query(collection(db, 'notes'), where('uid', '==', user.uid));
    const unsub = onSnapshot(q, snapshot => {
      const loaded: Note[] = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id, uid: data.uid, title: data.title, content: data.content,
          attachments: data.attachments ? JSON.parse(data.attachments) : [],
          code: data.code ? JSON.parse(data.code) : undefined,
          coverImage: data.coverImage, isPinned: data.isPinned || false,
          tags: data.tags || [], categoryId: data.categoryId,
          isShared: data.isShared || false, shareId: data.shareId,
          history: data.history ? JSON.parse(data.history) : [],
          order: data.order ?? 0,
          createdAt: data.createdAt, updatedAt: data.updatedAt,
        };
      });
      setNotes(loaded.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        if ((a.order ?? 0) !== (b.order ?? 0)) return (a.order ?? 0) - (b.order ?? 0);
        return b.updatedAt - a.updatedAt;
      }));
    }, err => handleFirestoreError(err, OperationType.LIST, 'notes'));
    return () => unsub();
  }, [user, isAuthReady]);

  // Categories listener
  useEffect(() => {
    if (!isAuthReady || !user) { setCategories([]); return; }
    const q = query(collection(db, 'categories'), where('uid', '==', user.uid));
    const unsub = onSnapshot(q, snapshot => {
      const loaded: Category[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Category));
      setCategories(loaded.sort((a, b) => a.order - b.order));
    }, err => handleFirestoreError(err, OperationType.LIST, 'categories'));
    return () => unsub();
  }, [user, isAuthReady]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); createNote(); }
      if (e.key === 'Escape') { setActiveNoteId(null); setShowHistory(false); setShowShare(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [user]);

  const handleSave = async (note: Note) => {
    if (!user) return;
    try {
      const noteData: any = {
        uid: note.uid, title: note.title, content: note.content,
        isPinned: note.isPinned || false, tags: note.tags || [],
        isShared: note.isShared || false,
        order: note.order ?? 0,
        createdAt: note.createdAt, updatedAt: note.updatedAt,
      };
      if (note.categoryId) noteData.categoryId = note.categoryId;
      if (note.shareId) noteData.shareId = note.shareId;
      if (note.attachments.length > 0) noteData.attachments = JSON.stringify(note.attachments);
      if (note.code) noteData.code = JSON.stringify(note.code);
      if (note.coverImage) noteData.coverImage = note.coverImage;
      if (note.history && note.history.length > 0) noteData.history = JSON.stringify(note.history);
      await setDoc(doc(db, 'notes', note.id), noteData);
    } catch (error) {
      addToast('Kunde inte spara anteckningen.', 'error');
      handleFirestoreError(error, OperationType.WRITE, `notes/${note.id}`);
    }
  };

  const debouncedSave = useCallback((note: Note) => {
    if (saveTimeoutRef.current[note.id]) clearTimeout(saveTimeoutRef.current[note.id]);
    saveTimeoutRef.current[note.id] = setTimeout(() => {
      handleSave(note);
      delete saveTimeoutRef.current[note.id];
    }, 1000);
  }, []);

  const createNote = () => {
    if (!user) return;
    const n: Note = {
      id: uuidv4(), uid: user.uid, title: '', content: '', attachments: [],
      categoryId: activeCategoryId || undefined,
      order: notes.length,
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    handleSave(n);
    setActiveNoteId(n.id);
  };

  const updateActiveNote = (updates: Partial<Note>) => {
    if (!activeNoteId || !user) return;
    const note = notes.find(n => n.id === activeNoteId);
    if (!note) return;
    const updated = { ...note, ...updates, updatedAt: Date.now() };
    if ('content' in updates) {
      const now = Date.now();
      const last = note.history?.[0];
      const timeDiff = last ? now - last.updatedAt : Infinity;
      const charDiff = Math.abs((updates.content?.length || 0) - note.content.length);
      if (timeDiff > 300000 || charDiff > 50) {
        updated.history = [
          { title: note.title, content: note.content, updatedAt: note.updatedAt },
          ...(note.history || []).slice(0, 9),
        ];
      }
    }
    setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
    const isMinor = 'title' in updates || 'content' in updates;
    if (isMinor) {
      debouncedSave(updated);
    } else {
      if (saveTimeoutRef.current[updated.id]) { clearTimeout(saveTimeoutRef.current[updated.id]); delete saveTimeoutRef.current[updated.id]; }
      handleSave(updated);
    }
  };

  // Category CRUD
  const createCategory = async (name: string, color: string) => {
    if (!user) return;
    const id = uuidv4();
    const cat: Category = { id, uid: user.uid, name, color, order: categories.length, createdAt: Date.now() };
    await setDoc(doc(db, 'categories', id), cat);
    addToast(`Kategori "${name}" skapad.`, 'success');
  };

  const renameCategory = async (id: string, name: string) => {
    await setDoc(doc(db, 'categories', id), { name }, { merge: true });
  };

  const deleteCategory = (id: string) => {
    const cat = categories.find(c => c.id === id);
    setConfirm({
      open: true, title: 'Ta bort kategori', danger: true,
      message: `Ta bort "${cat?.name}"? Anteckningar i kategorin påverkas inte.`,
      onConfirm: async () => {
        setConfirm(c => ({ ...c, open: false }));
        await deleteDoc(doc(db, 'categories', id));
        if (activeCategoryId === id) setActiveCategoryId(null);
        addToast('Kategori borttagen.', 'success');
      },
    });
  };

  // Share
  const enableShare = async () => {
    if (!activeNote) return;
    const shareId = uuidv4();
    updateActiveNote({ isShared: true, shareId });
    addToast('Delningslänk aktiverad.', 'success');
  };

  const disableShare = () => {
    if (!activeNote) return;
    updateActiveNote({ isShared: false, shareId: undefined });
    addToast('Delning inaktiverad.', 'info');
  };

  const shareUrl = activeNote?.isShared && activeNote.shareId
    ? `${window.location.origin}${window.location.pathname}?share=${activeNote.shareId}`
    : null;

  // Reorder notes (drag & drop)
  const handleReorderNotes = (reordered: Note[]) => {
    setNotes(prev => {
      const ids = new Set(reordered.map(n => n.id));
      const rest = prev.filter(n => !ids.has(n.id));
      return [...reordered, ...rest];
    });
    reordered.forEach(n => handleSave(n));
  };

  const deleteNote = (id: string) => {
    const noteToDelete = notes.find(n => n.id === id);
    if (!noteToDelete || !user) return;
    setConfirm({
      open: true, title: 'Ta bort anteckning', danger: true,
      message: 'Är du säker? Anteckningen och alla bifogade filer tas bort permanent.',
      onConfirm: async () => {
        setConfirm(c => ({ ...c, open: false }));
        try {
          if (noteToDelete.attachments.length > 0) {
            await Promise.all(noteToDelete.attachments.map(async a => {
              if (a.data.includes('firebasestorage')) {
                try { await deleteObject(ref(storage, `users/${user.uid}/notes/${id}/${a.id}_${a.name}`)); } catch {}
              }
            }));
          }
          await deleteDoc(doc(db, 'notes', id));
          if (activeNoteId === id) setActiveNoteId(null);
          addToast('Anteckning borttagen.', 'success');
        } catch (err) {
          addToast('Kunde inte ta bort anteckningen.', 'error');
          handleFirestoreError(err, OperationType.DELETE, `notes/${id}`);
        }
      },
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !activeNoteId || !user) return;
    const note = notes.find(n => n.id === activeNoteId);
    if (!note) return;
    const newAttachments: Attachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > MAX_FILE_SIZE) { addToast(`${file.name} är för stor. Max 5MB.`, 'error'); continue; }
      try {
        const fileId = uuidv4();
        const storageRef = ref(storage, `users/${user.uid}/notes/${activeNoteId}/${fileId}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        newAttachments.push({ id: fileId, name: file.name, type: file.type, size: file.size, data: url });
      } catch { addToast(`Kunde inte ladda upp ${file.name}.`, 'error'); }
    }
    if (newAttachments.length > 0) {
      updateActiveNote({ attachments: [...note.attachments, ...newAttachments] });
      addToast(`${newAttachments.length} fil(er) uppladdade.`, 'success');
    }
    e.target.value = '';
  };

  const removeAttachment = async (attachmentId: string) => {
    const note = notes.find(n => n.id === activeNoteId);
    if (!note || !user) return;
    const a = note.attachments.find(x => x.id === attachmentId);
    if (a?.data.includes('firebasestorage')) {
      try { await deleteObject(ref(storage, `users/${user.uid}/notes/${activeNoteId}/${a.id}_${a.name}`)); } catch {}
    }
    updateActiveNote({ attachments: note.attachments.filter(x => x.id !== attachmentId) });
  };

  const downloadAttachment = (a: Attachment) => {
    const link = document.createElement('a');
    link.href = a.data; link.download = a.name;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const togglePin = () => { if (!activeNote) return; updateActiveNote({ isPinned: !activeNote.isPinned }); };
  const addTag = (tag: string) => {
    if (!activeNote || !tag.trim()) return;
    const clean = tag.trim().toLowerCase();
    if (activeNote.tags?.includes(clean)) return;
    updateActiveNote({ tags: [...(activeNote.tags || []), clean] });
    setNewTag('');
  };
  const removeTag = (tag: string) => { if (!activeNote) return; updateActiveNote({ tags: activeNote.tags?.filter(t => t !== tag) }); };
  const restoreVersion = (v: { title: string; content: string }) => {
    if (!activeNote) return;
    updateActiveNote({ title: v.title, content: v.content });
    setShowHistory(false);
    addToast('Version återställd.', 'success');
  };
  const toggleCodeEditor = () => {
    const note = notes.find(n => n.id === activeNoteId);
    if (!note) return;
    if (note.code) {
      setConfirm({ open: true, title: 'Ta bort kod', danger: true, message: 'Ta bort all kod?',
        onConfirm: () => { setConfirm(c => ({ ...c, open: false })); updateActiveNote({ code: undefined }); } });
    } else { updateActiveNote({ code: { html: '', css: '', js: '' } }); setActiveCodeTab('html'); }
  };
  const updateCode = (type: 'html' | 'css' | 'js', value: string) => {
    const note = notes.find(n => n.id === activeNoteId);
    if (!note?.code) return;
    updateActiveNote({ code: { ...note.code, [type]: value } });
  };
  const generatePreview = () => {
    const note = notes.find(n => n.id === activeNoteId);
    if (!note?.code) return;
    const { html, css, js } = note.code;
    setPreviewDoc(`<!DOCTYPE html><html><head><style>html,body{margin:0;padding:0;width:100%;height:100%;background:#fff;overflow:hidden;}${css}</style></head><body>${html}<script>${js}<\/script></body></html>`);
    setActiveCodeTab('preview');
  };
  const handleCopyTitle = async () => {
    if (!activeNote) return;
    await navigator.clipboard.writeText(activeNote.title);
    setIsTitleCopied(true); setTimeout(() => setIsTitleCopied(false), 2000);
  };
  const handleCopyContent = async () => {
    if (!activeNote) return;
    await navigator.clipboard.writeText(activeNote.content);
    setIsContentCopied(true); setTimeout(() => setIsContentCopied(false), 2000);
  };
  const capturePreview = async () => {
    const iframe = iframeRef.current;
    if (!iframe) { addToast('Kunde inte hitta förhandsgranskningen.', 'error'); return; }
    try {
      setIsCapturing(true);
      let dataUrl = '';
      await new Promise(r => setTimeout(r, 800));
      let body: HTMLElement; let isTemp = false;
      if (iframe.contentDocument?.body) { body = iframe.contentDocument.body; }
      else {
        body = document.createElement('div');
        body.style.cssText = `position:absolute;left:-9999px;width:${iframe.clientWidth}px;height:${iframe.clientHeight}px;background:#fff`;
        body.innerHTML = activeNote?.code?.html || '';
        const s = document.createElement('style'); s.textContent = activeNote?.code?.css || '';
        body.appendChild(s); document.body.appendChild(body); isTemp = true;
      }
      try {
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(body, { backgroundColor: '#fff', useCORS: true, scale: 1, width: iframe.clientWidth || 800, height: iframe.clientHeight || 600 });
        dataUrl = canvas.toDataURL('image/png');
      } catch {
        const { toPng } = await import('html-to-image');
        dataUrl = await toPng(body, { backgroundColor: '#fff', width: iframe.clientWidth || 800, height: iframe.clientHeight || 600, pixelRatio: 1 });
      }
      if (isTemp && body.parentNode) body.parentNode.removeChild(body);
      if (!dataUrl || dataUrl === 'data:,') throw new Error('Tom bild');
      updateActiveNote({ coverImage: dataUrl });
      addToast('Bild sparad som omslagsbild.', 'success');
    } catch { addToast('Kunde inte ta skärmdump.', 'error'); }
    finally { setIsCapturing(false); }
  };
  const handleAiAction = async (action: 'summarize' | 'fix') => {
    if (!activeNote?.content) return;
    const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') { addToast('Lägg till VITE_GEMINI_API_KEY i .env för att använda AI.', 'error'); return; }
    try {
      setIsAiProcessing(true);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = action === 'summarize'
        ? `Summarize this note in a few sentences in Swedish: ${activeNote.content}`
        : `Fix grammatical errors and improve the structure of this Swedish text. Return only the improved text: ${activeNote.content}`;
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (action === 'summarize') { alert('Sammanfattning:\n\n' + text); }
      else { updateActiveNote({ content: text }); addToast('Text förbättrad med AI.', 'success'); }
    } catch { addToast('Kunde inte köra AI-tjänsten.', 'error'); }
    finally { setIsAiProcessing(false); }
  };

  if (!isAuthReady) return <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-500">Laddar...</div>;

  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 max-w-sm w-full text-center">
          <h1 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">NexNote</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mb-6">Logga in för att spara dina anteckningar säkert i molnet.</p>
          <button onClick={signInWithGoogle} className="w-full py-2 px-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-md hover:opacity-90 transition-opacity">
            Logga in med Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans overflow-hidden">
      <Sidebar
        notes={notes} activeNoteId={activeNoteId} searchQuery={searchQuery}
        onSearchChange={setSearchQuery} onSelectNote={setActiveNoteId}
        onCreateNote={createNote} onDeleteNote={deleteNote}
        onLogout={logout} onImageClick={setSelectedImage}
        onReorderNotes={handleReorderNotes}
        isDark={isDark} onToggleDark={toggleDark}
        categories={categories} activeCategoryId={activeCategoryId}
        onSelectCategory={setActiveCategoryId}
        onCreateCategory={createCategory} onRenameCategory={renameCategory} onDeleteCategory={deleteCategory}
      />

      <div className={cn(
        'flex-1 flex flex-col h-full bg-white dark:bg-zinc-900 relative transition-transform duration-300 ease-in-out w-full',
        !activeNoteId ? 'translate-x-full md:translate-x-0 hidden md:flex' : 'translate-x-0 flex'
      )}>
        {activeNote ? (
          <>
            <NoteHeader
              note={activeNote} isAiProcessing={isAiProcessing} showHistory={showHistory}
              categories={categories}
              onBack={() => setActiveNoteId(null)} onTogglePin={togglePin}
              onToggleHistory={() => setShowHistory(s => !s)}
              onAiFix={() => handleAiAction('fix')} onAiSummarize={() => handleAiAction('summarize')}
              onImageClick={() => imageInputRef.current?.click()}
              onFileClick={() => fileInputRef.current?.click()}
              onToggleCode={toggleCodeEditor}
              onShare={() => setShowShare(true)}
              onCategoryChange={categoryId => updateActiveNote({ categoryId })}
            />

            <input type="file" ref={imageInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" multiple />
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />

            <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-12 max-w-4xl mx-auto w-full flex flex-col relative">
              {showHistory && (
                <div className="absolute right-4 top-4 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-30 flex flex-col max-h-[80%] overflow-hidden">
                  <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800">
                    <span className="text-xs font-bold uppercase text-zinc-500 flex items-center gap-1.5"><Clock size={14} /> Historik</span>
                    <button onClick={() => setShowHistory(false)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white"><X size={16} /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {(!activeNote.history || activeNote.history.length === 0) ? (
                      <div className="text-center py-8 text-xs text-zinc-400">Ingen historik än</div>
                    ) : activeNote.history.map((v, i) => (
                      <div key={i} className="p-2 rounded-md border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 group transition-colors">
                        <div className="text-[10px] text-zinc-400 font-mono mb-1">{format(v.updatedAt, 'd MMM HH:mm', { locale: sv })}</div>
                        <div className="text-xs font-medium truncate mb-1 text-zinc-700 dark:text-zinc-300">{v.title || 'Namnlös'}</div>
                        <button onClick={() => restoreVersion(v)} className="w-full py-1 bg-zinc-100 dark:bg-zinc-700 text-[10px] font-bold uppercase rounded hover:bg-zinc-900 dark:hover:bg-white hover:text-white dark:hover:text-zinc-900 transition-all opacity-0 group-hover:opacity-100">
                          Återställ
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="relative pl-10 md:pl-12 flex-1 flex flex-col">
                <div className="relative flex items-start group mb-2">
                  <button onClick={handleCopyTitle} className="absolute -left-10 md:-left-12 top-1/2 -translate-y-1/2 p-2 text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    {isTitleCopied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                  </button>
                  <input
                    type="text" value={activeNote.title}
                    onChange={e => updateActiveNote({ title: e.target.value })}
                    placeholder="Titel på anteckning"
                    className="w-full text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-600 border-none outline-none bg-transparent"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-6 text-sm">
                  {activeNote.tags?.map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-full text-xs font-medium border border-zinc-200 dark:border-zinc-700">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-red-500"><X size={12} /></button>
                    </span>
                  ))}
                  <input
                    type="text" placeholder="Lägg till tagg..." value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTag(newTag)}
                    className="bg-transparent border-none outline-none text-xs text-zinc-500 dark:text-zinc-400 placeholder:text-zinc-300 dark:placeholder:text-zinc-600 w-24 focus:w-32 transition-all"
                  />
                </div>

                <div className="relative flex-1 flex flex-col group">
                  <button onClick={handleCopyContent} className="absolute -left-10 md:-left-12 top-0 p-2 text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 z-10">
                    {isContentCopied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                  </button>
                  <RichEditor content={activeNote.content} onChange={val => updateActiveNote({ content: val })} />
                </div>

                {activeNote.code && (
                  <div className="mt-8 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden shadow-sm bg-zinc-900 text-zinc-100 flex flex-col">
                    <div className="flex items-center justify-between bg-zinc-950 px-2 border-b border-zinc-800 overflow-x-auto">
                      <div className="flex shrink-0">
                        {(['html', 'css', 'js'] as const).map(tab => (
                          <button key={tab} onClick={() => setActiveCodeTab(tab)}
                            className={cn('px-4 py-3 text-xs font-medium uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap',
                              activeCodeTab === tab ? 'border-blue-500 text-white bg-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-300'
                            )}>{tab}</button>
                        ))}
                        <button onClick={generatePreview}
                          className={cn('px-4 py-3 text-xs font-medium uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap',
                            activeCodeTab === 'preview' ? 'border-green-500 text-green-400 bg-zinc-900' : 'border-transparent text-zinc-500 hover:text-green-400'
                          )}>
                          <Play size={14} /> Preview
                        </button>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {activeCodeTab === 'preview' && (
                          <button onClick={capturePreview} disabled={isCapturing}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors disabled:opacity-50">
                            <Camera size={14} /> {isCapturing ? 'Sparar...' : 'Spara bild'}
                          </button>
                        )}
                        <button onClick={toggleCodeEditor} className="p-2 text-zinc-500 hover:text-red-400 transition-colors"><X size={16} /></button>
                      </div>
                    </div>
                    <div className="h-[400px] bg-zinc-900 relative">
                      {activeCodeTab !== 'preview' ? (
                        <CodeEditor key={activeCodeTab} value={activeNote.code[activeCodeTab]} language={activeCodeTab} onChange={val => updateCode(activeCodeTab, val)} />
                      ) : (
                        <div className="w-full h-full bg-white">
                          <iframe ref={iframeRef} title="Preview" srcDoc={previewDoc} className="w-full h-full border-none" sandbox="allow-scripts allow-same-origin" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <AttachmentList attachments={activeNote.attachments} onDownload={downloadAttachment} onRemove={removeAttachment} onImageClick={setSelectedImage} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex-col items-center justify-center text-zinc-400 p-8 hidden md:flex">
            <div className="w-16 h-16 mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <FileIcon size={32} className="text-zinc-300 dark:text-zinc-600" />
            </div>
            <p className="text-lg font-medium text-zinc-500 dark:text-zinc-400">Välj en anteckning</p>
            <p className="text-sm mt-1 text-zinc-400 dark:text-zinc-500">eller skapa en ny för att börja skriva</p>
            <button onClick={createNote} className="mt-6 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-md hover:opacity-90 transition-opacity flex items-center gap-2">
              <Plus size={18} /> Skapa ny anteckning
            </button>
            <p className="text-xs text-zinc-300 dark:text-zinc-600 mt-3">Ctrl+N för ny anteckning</p>
          </div>
        )}
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8" onClick={() => setSelectedImage(null)}>
          <button className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-all" onClick={e => { e.stopPropagation(); setSelectedImage(null); }}>
            <X size={24} />
          </button>
          <img src={selectedImage} alt="Full size" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {showShare && activeNote && (
        <ShareModal
          noteTitle={activeNote.title}
          isShared={activeNote.isShared || false}
          shareUrl={shareUrl}
          onEnable={enableShare}
          onDisable={disableShare}
          onClose={() => setShowShare(false)}
        />
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
      <ConfirmDialog
        open={confirm.open} title={confirm.title} message={confirm.message}
        danger={confirm.danger} confirmLabel="Ta bort"
        onConfirm={confirm.onConfirm} onCancel={() => setConfirm(c => ({ ...c, open: false }))}
      />
    </div>
  );
}
