import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Plus, Trash2, File as FileIcon, X, Code, Play, Camera, Clock, Copy, Check, ClipboardCopy, Sparkles, Package, Zap, Globe, Trophy, History, MousePointer2, User, TrendingUp, Settings, Edit2 } from 'lucide-react';
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
import MobileBottomNav from './components/MobileBottomNav';
import AIModal from './components/AIModal';
import ExportModal from './components/ExportModal';
import AnimationEditor from './components/AnimationEditor';
import JamSession from './components/JamSession';
import DesignAIModal from './components/DesignAIModal';
import StarryBackground from './components/StarryBackground';
import ProjectPickerModal from './components/ProjectPickerModal';

function decodeContent(raw: string): string {
  if (!raw) return '';
  if (raw.startsWith('<!DOCTYPE') || raw.startsWith('<html')) return raw;
  let d = raw.replace(/<p>([\s\S]*?)<\/p>/g, '$1\n');
  d = d.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')
       .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ');
  d = d.replace(/<a[^>]*>(.*?)<\/a>/g,'$1');
  return d.trim();
}
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
  const [communityTab, setCommunityTab] = useState<'trending' | 'challenges'>('trending');
  const [showProfile, setShowProfile] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [guestSecondsLeft, setGuestSecondsLeft] = useState(60);
  const guestTimerRef = useRef<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [communityPosts, setCommunityPosts] = useState<any[]>([]);
  const [isCodeCopied, setIsCodeCopied] = useState(false);
  const [isCodeExpanded, setIsCodeExpanded] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false, title: '', message: '', onConfirm: () => {} });
  const [showAiModal, setShowAiModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAnimationEditor, setShowAnimationEditor] = useState(false);
  const [showJamSession, setShowJamSession] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showDesignAi, setShowDesignAi] = useState(false);
  const [designAiPrompt, setDesignAiPrompt] = useState('');
  const [topDesigns, setTopDesigns] = useState<any[]>(Array(5).fill(null));
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [communityPostId, setCommunityPostId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const saveTimeoutRef = useRef<Record<string, any>>({});
  const { toasts, addToast, removeToast } = useToast();

  const shareId = new URLSearchParams(window.location.search).get('share');
  if (shareId) return <SharedNote shareId={shareId} />;

  const activeNote = notes.find(n => n.id === activeNoteId);

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

  useEffect(() => {
    if (!isAuthReady || !user) { setNotes([]); setIsLoading(false); return; }
    setIsLoading(true);
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
        return b.updatedAt - a.updatedAt;
      }));
      setIsLoading(false);
    }, err => { handleFirestoreError(err, OperationType.LIST, 'notes'); setIsLoading(false); });
    return () => unsub();
  }, [user, isAuthReady]);

  useEffect(() => {
    if (!isAuthReady || !user) { setCategories([]); return; }
    const q = query(collection(db, 'categories'), where('uid', '==', user.uid));
    const unsub = onSnapshot(q, snapshot => {
      const loaded: Category[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Category));
      setCategories(loaded.sort((a, b) => a.order - b.order));
    }, err => handleFirestoreError(err, OperationType.LIST, 'categories'));
    return () => unsub();
  }, [user, isAuthReady]);

  useEffect(() => {
    if (!isAuthReady) return;
    const q = query(collection(db, 'community'));
    const unsub = onSnapshot(q, snap => {
      const loaded = snap.docs.map(d => {
        const data = d.data();
        let createdAt = Date.now();
        if (data.createdAt) {
          if (typeof data.createdAt === 'number') createdAt = data.createdAt;
          else if (data.createdAt.toDate) createdAt = data.createdAt.toDate().getTime();
        }
        return { id: d.id, ...data, createdAt };
      });
      setCommunityPosts(loaded);
    });
    return () => unsub();
  }, [isAuthReady]);

  useEffect(() => {
    const saved = localStorage.getItem(`topDesigns_${user?.uid}`);
    if (saved) setTopDesigns(JSON.parse(saved));
    else setTopDesigns(Array(5).fill(null));
  }, [user?.uid]);

  const handleSelectProject = (project: any) => {
    if (activeSlot === null) return;
    const newTop = [...topDesigns];
    newTop[activeSlot] = project;
    setTopDesigns(newTop);
    localStorage.setItem(`topDesigns_${user?.uid}`, JSON.stringify(newTop));
    setShowProjectPicker(false);
  };

  const handleRemoveProject = () => {
    if (activeSlot === null) return;
    const newTop = [...topDesigns];
    newTop[activeSlot] = null;
    setTopDesigns(newTop);
    localStorage.setItem(`topDesigns_${user?.uid}`, JSON.stringify(newTop));
  };

  const handleNavigateToProject = (p: any) => {
    if (p.type === 'note') {
       setActiveNoteId(p.id);
    } else {
       setCommunityPostId(p.id);
       setCommunityTab('trending');
       setShowCommunity(true);
    }
  };

  // Guest timer
  useEffect(() => {
    if (!isGuest) return;
    setGuestSecondsLeft(60);
    let s = 60;
    guestTimerRef.current = setInterval(() => {
      s--;
      setGuestSecondsLeft(s);
      if (s <= 0) {
        clearInterval(guestTimerRef.current);
        setIsGuest(false);
        setUser(null);
        setNotes([]);
      }
    }, 1000);
    return () => clearInterval(guestTimerRef.current);
  }, [isGuest]);

  const enterGuestMode = () => {
    setIsGuest(true);
    setUser({ uid: 'guest', displayName: 'Guest', email: 'guest@nexnote.app', isGuest: true });
  };

  const exitGuestMode = () => {
    clearInterval(guestTimerRef.current);
    setIsGuest(false);
    setUser(null);
    setNotes([]);
  };

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
    if (!note.code && note.content) {
      const rawContent = note.content.replace(/<[^>]*>?/gm, (match) => {
        const tag = match.toLowerCase();
        if (tag.startsWith('<p') || tag === '</p>' || tag.startsWith('<div') || tag === '</div>') return '';
        return match;
      }).trim();
      const hasSvg = /<svg/i.test(rawContent);
      const hasHtml = /<html|<!DOCTYPE/i.test(rawContent);
      if (hasSvg || hasHtml) {
        const updatedNote = { ...note, code: { html: rawContent, css: '', js: '' }, content: '', updatedAt: Date.now() };
        note = updatedNote;
        setNotes(prev => prev.map(n => n.id === note.id ? note : n));
        setIsCodeExpanded(false);
        setActiveCodeTab('html');
        addToast('Code detected! Moved to preview mode.', 'info');
      }
    }
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
    if (!isGuest) {
      handleSave(n);
    }
    setNotes(prev => [...prev, n]);
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
    if (isGuest) return;
    const isMinor = 'title' in updates || 'content' in updates;
    if (isMinor) {
      debouncedSave(updated);
    } else {
      if (saveTimeoutRef.current[updated.id]) { clearTimeout(saveTimeoutRef.current[updated.id]); delete saveTimeoutRef.current[updated.id]; }
      handleSave(updated);
    }
  };

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

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    setMousePos({ x: (clientX / innerWidth - 0.5) * 20, y: (clientY / innerHeight - 0.5) * 20 });
  };

  const createInspiredNote = async (prompt: string) => {
    setDesignAiPrompt(prompt);
    setShowDesignAi(true);
  };

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

  const onChangeCoverImage = (noteId: string) => {};

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

  if (!isAuthReady) return <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-500">Loading...</div>;

  if (!user) {
    return (
      <div className="flex flex-col md:flex-row h-screen w-full bg-[#FFFFFF]">
        <div className="hidden md:flex md:w-1/2 relative bg-[#0B0D17] overflow-hidden">
          <div className="absolute inset-0 z-0">
             <video 
               src="/NexNote.mp4" 
               autoPlay 
               loop 
               muted 
               playsInline 
               className="w-full h-full object-cover opacity-80"
             />
          </div>
           <div className="absolute top-8 left-8 z-10 flex items-center gap-3">
              <img src="/favicon.png" alt="NexNote" className="w-10 h-10 rounded-xl shadow-lg shadow-blue-500/20" />
              <span className="text-2xl font-bold text-white tracking-tight">NexNote</span>
           </div>
          <div className="absolute inset-0 bg-gradient-to-tr from-[#0B0D17]/20 to-transparent pointer-events-none"></div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-16 lg:p-24 relative overflow-hidden bg-white">
            <div className="w-full max-w-sm text-center z-10">
               <img src="/logoandtextWhite2.png" alt="NexNote" className="mx-auto mb-12 w-64" />
              <button onClick={signInWithGoogle} className="group w-full py-4 px-6 bg-white border border-[#E0E4E8] rounded-2xl flex items-center justify-center gap-4 text-[#333] font-semibold transition-all duration-300 hover:border-blue-400/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.35)] relative overflow-hidden ring-1 ring-black/5">
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
              <button
                onClick={enterGuestMode}
                className="w-full mt-3 py-4 px-6 bg-zinc-100 border border-zinc-200 rounded-2xl flex items-center justify-center gap-3 text-zinc-600 font-medium transition-all duration-300 hover:bg-zinc-200 hover:border-zinc-300"
              >
                <span>👁</span>
                <span>Guest Mode</span>
                <span className="text-xs text-zinc-400 ml-1">(1 min demo)</span>
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
      <StarryBackground />

      {/* Guest Mode Timer Banner */}
      {isGuest && (
        <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center px-4 py-3 bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 text-white shadow-lg">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-lg">👁️</span>
              <span className="font-bold">Guest Mode</span>
              <span className="text-white/70 text-sm">(Demo)</span>
            </div>
            <div className="flex items-center gap-3 bg-black/20 rounded-full px-4 py-1.5">
              <Clock size={16} className="text-white" />
              <span className="font-mono text-lg font-bold">
                {guestSecondsLeft > 0 ? `Auto logout in ${guestSecondsLeft}s` : 'Time is up!'}
              </span>
            </div>
            <button onClick={exitGuestMode} className="px-4 py-1.5 bg-white text-amber-600 hover:bg-white/90 rounded-full text-sm font-bold transition-colors">
              Sign out now
            </button>
          </div>
        </div>
      )}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px] pointer-events-none" />

      <Sidebar
        notes={notes} activeNoteId={activeNoteId} searchQuery={searchQuery}
        onSearchChange={setSearchQuery} onSelectNote={setActiveNoteId}
        onCreateNote={createNote} onDeleteNote={deleteNote}
        onLogout={isGuest ? exitGuestMode : logout} onImageClick={setSelectedImage}
        onReorderNotes={handleReorderNotes}
        isDark={isDark} onToggleDark={toggleDark}
        categories={categories} activeCategoryId={activeCategoryId}
        onSelectCategory={setActiveCategoryId}
        onCreateCategory={createCategory} onRenameCategory={renameCategory} onDeleteCategory={deleteCategory}
        onMoveNote={onMoveNote} onMoveManyNotes={onMoveManyNotes}
        onDeleteManyNotes={onDeleteManyNotes}
        onRenameNote={onRenameNote} onChangeCoverImage={onChangeCoverImage}
        onChangeColor={onChangeColor}
        onOpenCommunity={() => { setCommunityTab('trending'); setShowCommunity(true); }}
        onOpenProfile={() => setShowProfile(true)}
        onOpenPrivacy={() => setShowPrivacy(true)}
        onGoHome={() => setActiveNoteId(null)}
        allPosts={communityPosts}
        user={user}
        isLoading={isLoading}
        isGuest={isGuest}
      />

      <div className={cn(
        'flex-1 flex flex-col h-full bg-transparent relative transition-all duration-500 ease-in-out w-full',
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
                          <button onClick={() => { setIsCodeExpanded(!isCodeExpanded); if (!isCodeExpanded && activeCodeTab === 'preview') setActiveCodeTab('html'); }} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-cyan-400 hover:bg-cyan-400/10 rounded-full border border-cyan-400/20 transition-all">
                              {isCodeExpanded ? 'Hide Code' : 'Show More Code'}
                            </button>
                            {isCodeExpanded && (
                              <>
                                <button onClick={() => setShowAiModal(true)} className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all">
                                  <Sparkles size={12} /> AI Assist
                                </button>
                                <button onClick={() => setShowExportModal(true)} className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all">
                                  <Package size={12} /> Pro Export
                                </button>
                                <button onClick={() => setShowAnimationEditor(true)} className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-purple-400 bg-purple-400/5 border border-purple-500/20 rounded-lg hover:bg-purple-500/10 transition-all">
                                  <Zap size={12} /> Motion
                                </button>
                                <button onClick={() => setShowJamSession(true)} className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/5 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/10 transition-all">
                                  <Globe size={12} /> Jam
                                </button>
                              </>
                            )}
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
          <div 
            onMouseMove={handleMouseMove}
            className="flex-1 flex flex-col items-center justify-start py-12 px-8 hidden md:flex text-center bg-[#090A0F] relative overflow-hidden no-scrollbar"
          >
             <StarryBackground />

             <div className="relative z-10 w-full max-w-6xl flex flex-col items-center">
                
                {/* 1. Global Challenge Widget (Top Spotlight) */}
                <button 
                  onClick={() => { setCommunityTab('challenges'); setShowCommunity(true); }}
                  className="group relative mb-12 p-1 rounded-3xl overflow-hidden hover:scale-105 transition-all shadow-2xl active:scale-95"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-amber-500/10 to-yellow-500/20 animate-pulse" />
                  <div className="relative bg-[#0B0D17] border border-yellow-500/20 rounded-3xl px-8 py-5 flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/30 group-hover:rotate-6 transition-transform">
                      <Trophy className="text-white" size={24} />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500">Live Challenge</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                      </div>
                      <h3 className="text-xl font-black text-white italic tracking-tight">Neon Pulse <span className="text-yellow-400">#01</span></h3>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Submit your design for a chance to win</p>
                    </div>
                    <div className="ml-auto flex -space-x-3">
                       {communityPosts.slice(0, 3).map((p, i) => (
                         <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0B0D17] bg-zinc-800 overflow-hidden shadow-xl">
                            {p.photoURL ? <img src={p.photoURL} alt="" /> : <div className="w-full h-full bg-indigo-500" />}
                         </div>
                       ))}
                    </div>
                  </div>
                </button>

                <div className="flex flex-col lg:flex-row gap-12 items-center lg:items-start w-full">
                  
                  {/* LEFT COLUMN: Main Illustration & Title */}
                  <div className="flex-1 flex flex-col items-center text-center lg:text-left lg:items-start">
                    <div 
                      className="relative mb-12 transition-transform duration-200 ease-out preserve-3d"
                      style={{ transform: `perspective(1000px) rotateY(${mousePos.x}deg) rotateX(${-mousePos.y}deg)` }}
                    >
                       <div className="absolute inset-0 bg-cyan-400/20 blur-[80px] rounded-full scale-150 animate-pulse" />
                       <div className="relative flex justify-center lg:justify-start">
                          <div className="relative">
                             <div className="absolute inset-0 translate-x-4 translate-y-4 bg-blue-500/20 rounded-2xl blur-lg"></div>
                             <div className="relative z-10 w-32 h-44 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-2xl border-2 border-white/20 backdrop-blur-xl shadow-[0_0_60px_rgba(0,242,255,0.15)] flex flex-col items-center justify-center -rotate-6 animate-float">
                                <div className="w-20 h-1 bg-white/40 rounded-full mb-4" />
                                <div className="w-16 h-1 bg-white/40 rounded-full mb-4 mr-6" />
                                <div className="w-20 h-1 bg-white/40 rounded-full mb-4" />
                                <div className="w-12 h-1 bg-white/40 rounded-full mr-10" />
                             </div>
                             <div className="absolute top-1/2 -right-6 z-20 w-10 h-28 bg-gradient-to-t from-cyan-300/40 to-blue-500/40 rounded-full border border-white/30 backdrop-blur text-white/50 rotate-12 flex justify-center items-end pb-3 shadow-2xl">
                               <div className="w-1.5 h-4 bg-white/60 rounded-full" />
                             </div>
                          </div>
                       </div>
                    </div>

                    <h2 className="text-4xl md:text-5xl font-black text-[var(--text-primary)] tracking-tighter mb-4 leading-none italic">
                      Imagine. <br/>
                      <span className="text-cyan-400">Code.</span> Create.
                    </h2>
                    <p className="text-[var(--text-secondary)] text-sm font-medium max-w-sm leading-relaxed mb-8">
                       Every great project starts with a single line. Choose a starter or dive into your vault.
                    </p>

                    <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                      <button 
                        onClick={createNote} 
                        className="group relative flex items-center gap-3 px-8 py-3.5 bg-cyan-500 text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-cyan-500/25"
                      >
                         <Plus size={18} /> Create new vault
                      </button>
                      <button 
                        onClick={() => setShowCommunity(true)}
                        className="group relative flex items-center gap-3 px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-500/20"
                      >
                         <Globe size={18} className="group-hover:rotate-12 transition-transform" /> 
                         <span>Community View</span>
                         <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-indigo-400 to-transparent opacity-50" />
                      </button>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Activities & Dashboard Widgets */}
                  <div className="w-full lg:w-96 space-y-6">
                    
                    {/* Activity Heatmap Widget */}
                    <div className="glass-panel p-6 rounded-[32px] border-white/5 space-y-4">
                       <div className="flex items-center justify-between">
                          <h4 className="text-[10px] uppercase font-black tracking-widest text-zinc-500 flex items-center gap-2"><History size={12}/> Dev Activity</h4>
                          <span className="text-[10px] font-bold text-cyan-400">{notes.length} Active Notes</span>
                       </div>
                       <div className="grid grid-cols-7 gap-1.5">
                          {Array.from({ length: 35 }).map((_, i) => (
                            <div key={i} className={cn(
                               "w-3.5 h-3.5 rounded-[3px] transition-colors",
                               Math.random() > 0.6 ? (Math.random() > 0.8 ? 'bg-cyan-500 shadow-[0_0_8px_rgba(0,242,255,0.4)]' : 'bg-cyan-500/50') : 'bg-zinc-800'
                            )} />
                          ))}
                       </div>
                    </div>

                    {/* AI Inspiration Starters */}
                    <div className="space-y-3">
                       <h4 className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Need Inspiration?</h4>
                       <div className="grid grid-cols-1 gap-2">
                          {[
                            { label: 'Neon UI Component', icon: '✨', prompt: 'a futuristic neon button with glow' },
                            { label: 'Glassmorphism Card', icon: '🫧', prompt: 'a frosted glass card layout' },
                            { label: 'SVG Wave Animation', icon: '🌊', prompt: 'flowing animated ocean waves' }
                          ].map((item, i) => (
                            <button 
                              key={i}
                              onClick={() => createInspiredNote(item.label)}
                              className="w-full flex items-center gap-3 p-3 bg-white/2 border border-white/5 hover:bg-white/5 hover:border-white/10 rounded-2xl text-left transition-all group"
                            >
                               <span className="text-xl">{item.icon}</span>
                               <span className="text-xs font-bold text-zinc-400 group-hover:text-white transition-colors">{item.label}</span>
                               <Sparkles size={12} className="ml-auto text-zinc-600 opacity-0 group-hover:opacity-100 transition-all" />
                            </button>
                          ))}
                       </div>
                    </div>

                    {/* My Top 5 Design Section */}
                    <div className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-[32px] space-y-4 shadow-xl">
                       <div className="flex items-center justify-between">
                          <h4 className="text-[10px] uppercase font-black tracking-widest text-zinc-500 flex items-center gap-2"><Trophy size={12} className="text-yellow-500"/> My Top 5 Design</h4>
                          <span className="text-[9px] font-bold text-zinc-600 italic">Curated by you</span>
                       </div>
                       <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                          {topDesigns.map((p, i) => (
                             <div key={i} className="relative group shrink-0">
                                {p ? (
                                   <div className="relative">
                                      <div 
                                        onClick={() => handleNavigateToProject(p)}
                                        className="w-12 h-12 rounded-2xl ring-2 ring-indigo-500/30 bg-[#0B0D17] overflow-hidden cursor-pointer hover:ring-indigo-500 transition-all shadow-lg relative z-0"
                                      >
                                         {p.code ? (
                                            <div className="w-full h-full pointer-events-none select-none origin-top-left" style={{ transform: 'scale(0.12)', width: '400px', height: '400px' }}>
                                               <iframe 
                                                 title="preview"
                                                 srcDoc={(() => {
                                                   if (typeof p.code === 'string') {
                                                      const decoded = decodeContent(p.code);
                                                      return (decoded.includes('<html') || decoded.includes('<!DOCTYPE'))
                                                         ? decoded
                                                         : `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:transparent;">${decoded}</body></html>`;
                                                   }
                                                   return `<!DOCTYPE html><html><head><style>${p.code.css || ''}</style></head><body style="margin:0;overflow:hidden;background:transparent;">${p.code.html || ''}<script>${p.code.js || ''}<\/script></body></html>`;
                                                 })()}
                                                 className="w-full h-full border-none bg-transparent"
                                               />
                                            </div>
                                         ) : p.image ? (
                                            <img src={p.image} alt="" className="w-full h-full object-cover" />
                                         ) : (
                                            <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-xs font-black text-white italic">{p.title.charAt(0)}</div>
                                         )}
                                      </div>
                                      {/* Hover Edit Action */}
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setActiveSlot(i); setShowProjectPicker(true); }}
                                        className="absolute -top-1 -right-1 w-5 h-5 bg-white text-black rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10 hover:scale-110 shadow-lg"
                                        title="Edit Slot"
                                      >
                                         <Settings size={10} />
                                      </button>
                                   </div>
                                ) : (
                                   <button 
                                     onClick={() => { setActiveSlot(i); setShowProjectPicker(true); }}
                                     className="w-12 h-12 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center text-zinc-600 hover:text-white hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all"
                                   >
                                      <Plus size={18} />
                                   </button>
                                )}
                             </div>
                          ))}
                       </div>
                    </div>
                  </div>
                </div>
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
          onClose={() => { setShowCommunity(false); setCommunityPostId(null); }}
          isDark={isDark}
          initialTab={communityTab}
          initialPostId={communityPostId}
          isGuest={isGuest}
        />
      )}

      <ProjectPickerModal
        isOpen={showProjectPicker}
        onClose={() => setShowProjectPicker(false)}
        notes={notes}
        communityPosts={communityPosts}
        onSelect={handleSelectProject}
        onRemove={handleRemoveProject}
        currentProject={activeSlot !== null ? topDesigns[activeSlot] : null}
      />

      {showProfile && user && (
        <UserProfilePage
          uid={user.uid}
          currentUser={user}
          allPosts={communityPosts}
          onClose={() => setShowProfile(false)}
        />
      )}

      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}

      {/* Mobile bottom navigation */}
      <MobileBottomNav
        activeNoteId={activeNoteId}
        searchQuery={searchQuery}
        onGoHome={() => setActiveNoteId(null)}
        onCreateNote={createNote}
        onSearch={() => {
          const input = document.querySelector('input[placeholder="Search notes..."]') as HTMLInputElement;
          if (input) input.focus();
        }}
        onCommunity={() => setShowCommunity(true)}
        onProfile={() => setShowProfile(true)}
      />

      <Toast toasts={toasts} onRemove={removeToast} />
      <ConfirmDialog
        open={confirm.open} title={confirm.title} message={confirm.message}
        danger={confirm.danger} confirmLabel="Delete"
        onConfirm={confirm.onConfirm} onCancel={() => setConfirm(c => ({ ...c, open: false }))}
      />

      {showAiModal && (
        <AIModal 
          isDark={isDark} 
          onClose={() => setShowAiModal(false)} 
          onInsert={(newCode) => {
            const note = notes.find(n => n.id === activeNoteId);
            if (note) {
              updateActiveNote({ 
                code: { 
                  html: (note.code?.html || '') + '\n' + newCode.html,
                  css: (note.code?.css || '') + '\n' + newCode.css,
                  js: (note.code?.js || '') + '\n' + newCode.js
                } 
              });
              setActiveCodeTab('html');
            }
          }} 
        />
      )}

      {showExportModal && activeNote?.code && (
        <ExportModal 
          title={activeNote.title} 
          code={activeNote.code} 
          onClose={() => setShowExportModal(false)} 
        />
      )}

      {showAnimationEditor && activeNote?.code && (
        <AnimationEditor
          onClose={() => setShowAnimationEditor(false)}
          currentCode={activeNote.code}
          onUpdate={(newCss) => updateActiveNote({ code: { ...activeNote.code!, css: newCss } })}
        />
      )}

      {showJamSession && activeNote?.code && (
        <JamSession
          noteId={activeNote.id}
          user={user}
          currentCode={activeNote.code}
          onUpdate={(newCode) => updateActiveNote({ code: newCode })}
          onClose={() => setShowJamSession(false)}
        />
      )}

      <DesignAIModal
        isOpen={showDesignAi}
        onClose={() => setShowDesignAi(false)}
        initialPrompt={designAiPrompt}
        isDark={isDark}
      />
    </div>
  );
}
