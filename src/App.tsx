import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Plus, Trash2, File as FileIcon, X, Code, Play, Camera, Clock, Copy, Check, ClipboardCopy } from 'lucide-react';
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
import CommunityView from './components/CommunityView';
import PrivacyPolicy from './components/PrivacyPolicy';
import UserProfilePage from './components/UserProfilePage';
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
  const [showCommunity, setShowCommunity] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isCodeCopied, setIsCodeCopied] = useState(false);
  const [isCodeExpanded, setIsCodeExpanded] = useState(false);
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

  // Auto-generate preview when active note changes or code changes
  useEffect(() => {
    if (activeNote?.code) {
      const { html, css, js } = activeNote.code;
      setPreviewDoc(`<!DOCTYPE html><html><head><style>html,body{margin:0;padding:0;width:100%;height:100%;background:#fff;overflow:hidden;}${css}</style></head><body>${html}<script>${js}<\/script></body></html>`);
    } else {
      setPreviewDoc('');
    }
  }, [activeNoteId, activeNote?.code?.html, activeNote?.code?.css, activeNote?.code?.js]);

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
        // Updated sorting: always newest updated first
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
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleManualSave(); }
      if (e.key === 'Escape') { setActiveNoteId(null); setShowHistory(false); setShowShare(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [user, activeNoteId, notes]);

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
      addToast('Could not save the note.', 'error');
      handleFirestoreError(error, OperationType.WRITE, `notes/${note.id}`);
    }
  };

  const handleManualSave = async () => {
    let note = notes.find(n => n.id === activeNoteId);
    if (!note) return;

    // --- AUTO-DETECT CODE ON SAVE ---
    // If the note has no code section yet, check if the content looks like SVG/HTML
    if (!note.code && note.content) {
      const rawContent = note.content.replace(/<[^>]*>?/gm, (match) => {
        // Keep actual SVG/HTML tags, but remove the wrapping <p> or <div> from the editor
        const tag = match.toLowerCase();
        if (tag.startsWith('<p') || tag === '</p>' || tag.startsWith('<div') || tag === '</div>') return '';
        return match;
      }).trim();

      const hasSvg = /<svg/i.test(rawContent);
      const hasHtml = /<html|<!DOCTYPE/i.test(rawContent);

      if (hasSvg || hasHtml) {
        const updatedDate = Date.now();
        const updatedNote = { 
          ...note, 
          code: { html: rawContent, css: '', js: '' },
          content: '', // Move everything to code preview
          updatedAt: updatedDate
        };
        note = updatedNote;
        setNotes(prev => prev.map(n => n.id === note.id ? note : n));
        setIsCodeExpanded(false); // Ensure snippet view is visible
        setActiveCodeTab('html'); // Reset tab to html if it was something else
        addToast('Code detected! Moved to preview mode.', 'info');
      }
    }

    // Cancel any pending debounced save
    if (saveTimeoutRef.current[note.id]) {
      clearTimeout(saveTimeoutRef.current[note.id]);
      delete saveTimeoutRef.current[note.id];
    }
    setIsSaving(true);
    await handleSave(note);
    setIsSaving(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
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
    if ('content' in updates && updates.content) {
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
    addToast(`Category "${name}" created.`, 'success');
  };

  const renameCategory = async (id: string, name: string) => {
    await setDoc(doc(db, 'categories', id), { name }, { merge: true });
  };

  const onChangeColor = async (id: string, color: string) => {
    await setDoc(doc(db, 'categories', id), { color }, { merge: true });
  };

  const deleteCategory = (id: string) => {
    const cat = categories.find(c => c.id === id);
    setConfirm({
      open: true, title: 'Delete category', danger: true,
      message: `Delete "${cat?.name}"? Notes in this category will not be affected.`,
      onConfirm: async () => {
        setConfirm(c => ({ ...c, open: false }));
        await deleteDoc(doc(db, 'categories', id));
        if (activeCategoryId === id) setActiveCategoryId(null);
        addToast('Category removed.', 'success');
      },
    });
  };

  // Share
  const enableShare = async () => {
    if (!activeNote) return;
    const shareId = uuidv4();
    updateActiveNote({ isShared: true, shareId });
    addToast('Sharing link enabled.', 'success');
  };

  const disableShare = () => {
    if (!activeNote) return;
    updateActiveNote({ isShared: false, shareId: undefined });
    addToast('Sharing disabled.', 'info');
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
      open: true, title: 'Delete note', danger: true,
      message: 'Are you sure? The note and all attachments will be permanently deleted.',
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
          addToast('Note deleted.', 'success');
        } catch (err) {
          addToast('Could not delete the note.', 'error');
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
      if (file.size > MAX_FILE_SIZE) { addToast(`${file.name} is too large. Max 5MB.`, 'error'); continue; }
      try {
        const fileId = uuidv4();
        const storageRef = ref(storage, `users/${user.uid}/notes/${activeNoteId}/${fileId}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        newAttachments.push({ id: fileId, name: file.name, type: file.type, size: file.size, data: url });
      } catch { addToast(`Could not upload ${file.name}.`, 'error'); }
    }
    if (newAttachments.length > 0) {
      updateActiveNote({ attachments: [...note.attachments, ...newAttachments] });
      addToast(`${newAttachments.length} file(s) uploaded.`, 'success');
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

  const handleCopyCode = async () => {
    const note = notes.find(n => n.id === activeNoteId);
    if (!note?.code) return;
    const combined = `<!-- HTML -->\n${note.code.html}\n\n/* CSS */\n${note.code.css}\n\n// JS\n${note.code.js}`;
    await navigator.clipboard.writeText(combined);
    setIsCodeCopied(true);
    setTimeout(() => setIsCodeCopied(false), 2000);
  };

  const onMoveNote = (noteId: string, categoryId: string | undefined) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    const updated = { ...note, categoryId, updatedAt: Date.now() };
    setNotes(prev => prev.map(n => n.id === noteId ? updated : n));
    handleSave(updated);
    addToast(categoryId ? 'Note moved.' : 'Category removed from note.', 'success');
  };

  const onRenameNote = (noteId: string, title: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    const updated = { ...note, title, updatedAt: Date.now() };
    setNotes(prev => prev.map(n => n.id === noteId ? updated : n));
    debouncedSave(updated);
  };

  const onChangeCoverImage = (noteId: string) => {
    // Handled via custom event from Sidebar
  };

  const onMoveManyNotes = (noteIds: string[], categoryId: string | undefined) => {
    noteIds.forEach(id => onMoveNote(id, categoryId));
    addToast(`${noteIds.length} notes moved.`, 'success');
  };

  const onDeleteManyNotes = (noteIds: string[]) => {
    noteIds.forEach(id => {
      const note = notes.find(n => n.id === id);
      if (!note) return;
      deleteDoc(doc(db, 'notes', id));
    });
    setNotes(prev => prev.filter(n => !noteIds.includes(n.id)));
    if (noteIds.includes(activeNoteId || '')) setActiveNoteId(null);
    addToast(`${noteIds.length} notes deleted.`, 'success');
  };

  // Listen for cover image change from Sidebar
  useEffect(() => {
    const handler = (e: Event) => {
      const { noteId, dataUrl } = (e as CustomEvent).detail;
      const note = notes.find(n => n.id === noteId);
      if (!note) return;
      const updated = { ...note, coverImage: dataUrl, updatedAt: Date.now() };
      setNotes(prev => prev.map(n => n.id === noteId ? updated : n));
      handleSave(updated);
      addToast('Cover image updated.', 'success');
    };
    window.addEventListener('nexnote:coverimage', handler);
    return () => window.removeEventListener('nexnote:coverimage', handler);
  }, [notes]);
  const togglePin = () => { if (!activeNote) return; updateActiveNote({ isPinned: !activeNote.isPinned }); };

  const addTag = (tag: string) => {
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
    addToast('Version restored.', 'success');
  };
  const toggleCodeEditor = () => {
    const note = notes.find(n => n.id === activeNoteId);
    if (!note) return;
    if (note.code) {
      setConfirm({ open: true, title: 'Remove code', danger: true, message: 'Remove all code?',
        onConfirm: () => { setConfirm(c => ({ ...c, open: false })); updateActiveNote({ code: undefined }); } });
    } else { updateActiveNote({ code: { html: '', css: '', js: '' } }); setActiveCodeTab('html'); }
  };
  const updateCode = (type: 'html' | 'css' | 'js', value: string) => {
    const note = notes.find(n => n.id === activeNoteId);
    if (!note?.code) return;
    updateActiveNote({ code: { ...note.code, [type]: value } });
  };
  const generatePreview = (switchTab = true) => {
    const note = notes.find(n => n.id === activeNoteId);
    if (!note?.code) return;
    const { html, css, js } = note.code;
    setPreviewDoc(`<!DOCTYPE html><html><head><style>html,body{margin:0;padding:0;width:100%;height:100%;background:#fff;overflow:hidden;}${css}</style></head><body>${html}<script>${js}<\/script></body></html>`);
    if (switchTab) setActiveCodeTab('preview');
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
    if (!iframe) { addToast('Could not find the preview.', 'error'); return; }
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
      if (!dataUrl || dataUrl === 'data:,') throw new Error('Empty image');
      updateActiveNote({ coverImage: dataUrl });
      addToast('Cover image saved.', 'success');
    } catch { addToast('Could not take screenshot.', 'error'); }
    finally { setIsCapturing(false); }
  };
  const handleAiAction = async (action: 'summarize' | 'fix') => {
    if (!activeNote?.content) return;
    const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') { addToast('Add VITE_GEMINI_API_KEY to .env to use AI features.', 'error'); return; }
    try {
      setIsAiProcessing(true);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = action === 'summarize'
        ? `Summarize this note in a few sentences: ${activeNote.content}`
        : `Fix grammatical errors and improve the structure of this text. Return only the improved text: ${activeNote.content}`;
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (action === 'summarize') { alert('Summary:\n\n' + text); }
      else { updateActiveNote({ content: text }); addToast('Text improved with AI.', 'success'); }
    } catch { addToast('AI service call failed.', 'error'); }
    finally { setIsAiProcessing(false); }
  };

  if (!isAuthReady) return <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-500">Loading...</div>;

  if (!user) {
    return (
      <div className="flex flex-col md:flex-row h-screen w-full bg-[#FFFFFF]">
        {/* Left Side: Illustration / Branding */}
        <div className="hidden md:flex md:w-1/2 relative bg-[#0B0D17] overflow-hidden">
          <div className="absolute inset-0 z-0 opacity-90 overflow-hidden">
            <video 
              autoPlay 
              loop 
              muted 
              playsInline 
              className="w-full h-full object-cover"
            >
              <source src="/NexNote.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
          {/* Logo overlay on top-left */}
           <div className="absolute top-8 left-8 z-10 flex items-center gap-3">
              <img src="/favicon.png" alt="NexNote" className="w-10 h-10 rounded-xl shadow-lg shadow-blue-500/20" />
              <span className="text-2xl font-bold text-white tracking-tight">NexNote</span>
           </div>
          {/* Subtle gradient overlay to match image mood */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#0B0D17]/40 to-transparent pointer-events-none"></div>
        </div>

        {/* Right Side: Login Form */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-16 lg:p-24 relative overflow-hidden bg-white">

            <div className="w-full max-w-sm text-center z-10">
               <img src="/logoandtextWhite.png" alt="NexNote" className="mx-auto mb-12 w-64" />

              <button 
                onClick={signInWithGoogle} 
                className="group w-full py-4 px-6 bg-white border border-[#E0E4E8] rounded-2xl flex items-center justify-center gap-4 text-[#333] font-semibold transition-all duration-300 hover:border-blue-400/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.35)] relative overflow-hidden ring-1 ring-black/5"
              >
                <div className="w-8 h-8 flex items-center justify-center bg-white rounded-lg">
                  <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                  </svg>
                </div>
                <span>Sign in with Google</span>
                <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              </button>

              <div className="mt-24">
                <p className="text-sm text-zinc-400 font-medium tracking-wide">
                  By logging in you agree to our{' '}
                  <button onClick={() => setShowPrivacy(true)} className="underline hover:text-blue-500 transition-colors decoration-zinc-300 underline-offset-4">
                    privacy policy
                  </button>
                </p>
              </div>
           </div>
        </div>

        {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[var(--bg-deep)] font-sans overflow-hidden relative" style={{ color: 'var(--text-primary)' }}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px] pointer-events-none" />

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
        onMoveNote={onMoveNote} onMoveManyNotes={onMoveManyNotes}
        onDeleteManyNotes={onDeleteManyNotes}
        onRenameNote={onRenameNote} onChangeCoverImage={onChangeCoverImage}
        onChangeColor={onChangeColor}
        onOpenCommunity={() => setShowCommunity(true)}
        onOpenProfile={() => setShowProfile(true)}
        onOpenPrivacy={() => setShowPrivacy(true)}
        user={user}
      />

      <div className={cn(
        'flex-1 flex flex-col h-full bg-transparent relative transition-transform duration-300 ease-in-out w-full',
        !activeNoteId ? 'translate-x-full md:translate-x-0 hidden md:flex' : 'translate-x-0 flex'
      )}>
        {activeNote ? (
          <>
            <NoteHeader
              note={activeNote} showHistory={showHistory}
              categories={categories} isSaving={isSaving} isSaved={isSaved}
              onBack={() => setActiveNoteId(null)} onTogglePin={togglePin}
              onToggleHistory={() => setShowHistory(s => !s)}
              onImageClick={() => imageInputRef.current?.click()}
              onFileClick={() => fileInputRef.current?.click()}
              onToggleCode={toggleCodeEditor}
              onShare={() => setShowShare(true)}
              onSave={handleManualSave}
              onCategoryChange={categoryId => updateActiveNote({ categoryId })}
            />

            <input type="file" ref={imageInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" multiple />
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />

            <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-12 max-w-5xl mx-auto w-full flex flex-col relative no-scrollbar">
              {showHistory && (
                <div className="absolute right-4 top-4 w-72 glass-panel border border-white/10 rounded-2xl shadow-2xl z-30 flex flex-col max-h-[80%] overflow-hidden">
                  <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Clock size={14} /> History</span>
                    <button onClick={() => setShowHistory(false)} className="text-slate-500 hover:text-white"><X size={16} /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
                    {(!activeNote.history || activeNote.history.length === 0) ? (
                      <div className="text-center py-12 text-xs text-slate-600 font-medium italic">No history yet</div>
                    ) : activeNote.history.map((v, i) => (
                      <div key={i} className="p-3 rounded-xl border border-white/5 hover:bg-white/5 group transition-colors cursor-pointer" onClick={() => restoreVersion(v)}>
                        <div className="text-[10px] text-cyan-400 font-black tracking-widest mb-1.5 uppercase">{format(v.updatedAt, 'MMM d, HH:mm', { locale: enUS })}</div>
                        <div className="text-xs font-semibold truncate mb-1 text-slate-200">{v.title || 'Untitled'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="relative pl-0 flex-1 flex flex-col">
                <div className="relative flex items-start group mb-6">
                  <button onClick={handleCopyTitle} className="absolute -left-12 top-1.5 p-2 text-slate-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all rounded-xl hover:bg-white/5">
                    {isTitleCopied ? <Check size={20} className="text-cyan-400" /> : <Copy size={20} />}
                  </button>
                  <input
                    type="text" value={activeNote.title}
                    onChange={e => updateActiveNote({ title: e.target.value })}
                    placeholder="Title of your creation"
                    className="w-full text-4xl md:text-5xl font-black text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] border-none outline-none bg-transparent tracking-tighter"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 mb-8 text-sm">
                  {activeNote.tags?.map(tag => (
                    <span key={tag} className="flex items-center gap-2 px-3 py-1 bg-cyan-400/10 text-cyan-400 rounded-full text-[11px] font-bold border border-cyan-400/20">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-white"><X size={12} /></button>
                    </span>
                  ))}
                  <div className="flex items-center gap-2 px-3 py-1 bg-white/5 text-slate-500 rounded-full border border-white/5">
                    <Plus size={12} />
                    <input
                      type="text" placeholder="Add tag..." value={newTag}
                      onChange={e => setNewTag(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addTag(newTag)}
                      className="bg-transparent border-none outline-none text-[11px] font-bold placeholder:text-slate-700 w-24 focus:w-32 transition-all"
                    />
                  </div>
                </div>

                {activeNote.code && (
                  <div className="mb-8 flex flex-col gap-4">
                    {/* Main Preview (Always visible at top) */}
                    <div className="glass-panel border border-white/10 rounded-2xl overflow-hidden shadow-xl bg-white flex flex-col">
                      <div className="flex items-center justify-between bg-zinc-900 px-4 py-2 border-b border-white/5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                          <Play size={14} className="text-purple-400" /> Live Preview
                        </span>
                        <button onClick={capturePreview} disabled={isCapturing}
                          className="flex items-center gap-2 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white glass-card rounded-lg hover:neon-border-cyan transition-all disabled:opacity-50">
                          <Camera size={14} /> {isCapturing ? 'Saving...' : 'Save image'}
                        </button>
                      </div>
                      <div className="h-[350px] bg-white relative">
                        <iframe ref={iframeRef} title="Preview" srcDoc={previewDoc} className="w-full h-full border-none" sandbox="allow-scripts allow-same-origin" />
                      </div>
                    </div>

                    {/* Code Section */}
                    <div className="glass-panel border border-white/10 rounded-2xl overflow-hidden shadow-xl flex flex-col">
                      <div className="flex items-center justify-between bg-white/5 px-2 border-b border-white/5">
                        <div className="flex items-center">
                          {isCodeExpanded ? (
                            (['html', 'css', 'js'] as const).map(tab => (
                              <button key={tab} onClick={() => setActiveCodeTab(tab)}
                                className={cn('px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 whitespace-nowrap',
                                  activeCodeTab === tab ? 'border-cyan-400 text-cyan-400 bg-cyan-400/5' : 'border-transparent text-slate-500 hover:text-slate-300'
                                )}>{tab}</button>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 flex items-center gap-2">
                              <Code size={14} /> Code Snippet (HTML)
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mr-2">
                          {isCodeExpanded && (
                            <button onClick={handleCopyCode} className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white glass-card rounded-lg hover:neon-border-cyan transition-all">
                              {isCodeCopied ? <Check size={12} className="text-cyan-400" /> : <ClipboardCopy size={12} />}
                              {isCodeCopied ? 'Copied!' : 'Copy'}
                            </button>
                          )}
                          <button onClick={() => {
                            setIsCodeExpanded(!isCodeExpanded);
                            if (!isCodeExpanded && activeCodeTab === 'preview') setActiveCodeTab('html');
                          }} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-cyan-400 hover:bg-cyan-400/10 rounded-full border border-cyan-400/20 transition-all">
                            {isCodeExpanded ? 'Hide Code' : 'Show More Code'}
                          </button>
                          <button onClick={toggleCodeEditor} className="p-2 text-slate-500 hover:text-red-400 transition-colors"><X size={18} /></button>
                        </div>
                      </div>
                      
                      <div className={cn('bg-[#0E111C] relative transition-all duration-300', isCodeExpanded ? 'h-[500px]' : 'h-[120px]')}>
                        {(!isCodeExpanded || activeCodeTab !== 'preview') && (
                          <CodeEditor 
                            key={isCodeExpanded ? activeCodeTab : 'snippet'} 
                            value={isCodeExpanded ? (activeCodeTab === 'preview' ? '' : activeNote.code[activeCodeTab]) : activeNote.code.html} 
                            language={isCodeExpanded ? (activeCodeTab === 'preview' ? 'html' : activeCodeTab) : 'html'} 
                            onChange={val => updateCode(isCodeExpanded ? (activeCodeTab === 'preview' ? 'html' : activeCodeTab) : 'html', val)} 
                          />
                        )}
                        {!isCodeExpanded && (
                          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0E111C] to-transparent pointer-events-none" />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="relative flex-1 flex flex-col group min-h-[400px]">
                  <button onClick={handleCopyContent} className="absolute -left-12 top-0 p-2 text-slate-600 hover:text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-all rounded-xl hover:bg-[var(--bg-panel-hover)] z-10">
                    {isContentCopied ? <Check size={18} className="text-cyan-400" /> : <Copy size={18} />}
                  </button>
                  <RichEditor content={activeNote.content} onChange={val => updateActiveNote({ content: val })} isDark={isDark} />
                </div>

                <AttachmentList attachments={activeNote.attachments} onDownload={downloadAttachment} onRemove={removeAttachment} onImageClick={setSelectedImage} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 hidden md:flex text-center bg-[var(--bg-deep)]">
             <div className="relative mb-8">
                <div className="absolute inset-0 bg-cyan-400/30 blur-[80px] rounded-full scale-150 animate-pulse delay-75" />
                <div className="absolute inset-0 bg-blue-500/20 blur-[80px] rounded-full scale-150 animate-pulse delay-300" />
                <div className="relative flex justify-center">
                   {/* 3D Glass Document Icon emulation */}
                   <div className="relative">
                      <div className="absolute inset-0 translate-x-3 translate-y-3 bg-blue-500/30 rounded-2xl blur-md"></div>
                      <div className="relative z-10 w-28 h-36 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-2xl border-2 border-white/20 backdrop-blur-md shadow-[0_0_40px_rgba(0,242,255,0.2)] flex flex-col items-center justify-center -rotate-6">
                         <div className="w-16 h-1 bg-white/40 rounded-full mb-3" />
                         <div className="w-12 h-1 bg-white/40 rounded-full mb-3 mr-4" />
                         <div className="w-16 h-1 bg-white/40 rounded-full mb-3" />
                         <div className="w-10 h-1 bg-white/40 rounded-full mr-6" />
                      </div>
                      <div className="absolute top-1/2 -right-4 z-20 w-8 h-24 bg-gradient-to-t from-cyan-300/40 to-blue-500/40 rounded-full border border-white/30 backdrop-blur border-r-white text-white/50 rotate-12 flex justify-center items-end pb-2 shadow-lg">
                        <div className="w-1 h-3 bg-white/60 rounded-full" />
                      </div>
                   </div>
                </div>
             </div>

             <h2 className="text-[28px] font-semibold text-[var(--text-primary)] tracking-wide mb-2 mt-4">Select a note</h2>
             <p className="text-[var(--text-secondary)] text-sm font-normal max-w-xs leading-relaxed mb-8">
                or create a new one to start writing
             </p>

             <button 
               onClick={createNote} 
               className="group relative flex items-center gap-2 px-6 py-2.5 bg-transparent rounded-lg text-[var(--text-primary)] font-medium hover:scale-105 active:scale-95 transition-all outline-none"
               style={{
                 background: 'linear-gradient(var(--bg-deep), var(--bg-deep)) padding-box, linear-gradient(to right, #00F2FF, #00B4FF) border-box',
                 border: '1px solid transparent'
               }}
             >
                <Plus size={16} className="opacity-80" />
                <span>Create new note</span>
                <div className="absolute inset-0 rounded-lg bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 rounded-lg shadow-[0_0_20px_rgba(0,242,255,0.3)] opacity-0 group-hover:opacity-100 transition-opacity z-[-1]" />
             </button>
             
             <div className="mt-4 flex items-center justify-center text-slate-500 text-xs">
                <span>Ctrl+N for new note</span>
             </div>
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

      {showCommunity && (
        <CommunityView
          user={user}
          userNotes={notes}
          onClose={() => setShowCommunity(false)}
        />
      )}

      {showProfile && user && (
        <UserProfilePage
          uid={user.uid}
          currentUser={user}
          allPosts={[]}
          onClose={() => setShowProfile(false)}
        />
      )}

      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}

      <Toast toasts={toasts} onRemove={removeToast} />
      <ConfirmDialog
        open={confirm.open} title={confirm.title} message={confirm.message}
        danger={confirm.danger} confirmLabel="Delete"
        onConfirm={confirm.onConfirm} onCancel={() => setConfirm(c => ({ ...c, open: false }))}
      />
    </div>
  );
}
