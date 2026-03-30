import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { 
  Plus, 
  Trash2, 
  Paperclip, 
  File as FileIcon, 
  Image as ImageIcon, 
  ChevronLeft, 
  Download,
  Search,
  Copy,
  Check,
  X,
  Code,
  Play,
  Camera,
  Maximize2,
  Pin,
  History as HistoryIcon,
  Tag as TagIcon,
  Sparkles,
  Clock,
  RotateCcw
} from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { toPng } from 'html-to-image';
import { Note, Attachment } from './types';
import { fileToBase64 } from './lib/storage';
import { cn, handleFirestoreError, OperationType } from './lib/utils';
import { auth, db, storage, signInWithGoogle, logout } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTitleCopied, setIsTitleCopied] = useState(false);
  const [isContentCopied, setIsContentCopied] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'html' | 'css' | 'js' | 'preview'>('html');
  const [previewDoc, setPreviewDoc] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user) {
      setNotes([]);
      return;
    }

    const q = query(collection(db, 'notes'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedNotes: Note[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        loadedNotes.push({
          id: doc.id,
          uid: data.uid,
          title: data.title,
          content: data.content,
          attachments: data.attachments ? JSON.parse(data.attachments) : [],
          code: data.code ? JSON.parse(data.code) : undefined,
          coverImage: data.coverImage,
          isPinned: data.isPinned || false,
          tags: data.tags || [],
          history: data.history ? JSON.parse(data.history) : [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });
      
      const sortedNotes = loadedNotes.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.updatedAt - a.updatedAt;
      });
      
      setNotes(sortedNotes);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notes');
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  const handleSave = async (note: Note) => {
    if (!user) return;
    try {
      const noteData = {
        uid: note.uid,
        title: note.title,
        content: note.content,
        attachments: note.attachments.length > 0 ? JSON.stringify(note.attachments) : null,
        code: note.code ? JSON.stringify(note.code) : null,
        coverImage: note.coverImage || null,
        isPinned: note.isPinned || false,
        tags: note.tags || [],
        history: note.history && note.history.length > 0 ? JSON.stringify(note.history) : null,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      };
      
      // Remove null values
      Object.keys(noteData).forEach(key => {
        if ((noteData as any)[key] === null) {
          delete (noteData as any)[key];
        }
      });

      await setDoc(doc(db, 'notes', note.id), noteData);
    } catch (error) {
      console.error('Kunde inte spara:', error);
      handleFirestoreError(error, OperationType.WRITE, `notes/${note.id}`);
    }
  };

  // Add debounced saving
  const saveTimeoutRef = useRef<Record<string, any>>({});

  const debouncedSave = (note: Note) => {
    if (saveTimeoutRef.current[note.id]) {
      clearTimeout(saveTimeoutRef.current[note.id]);
    }
    
    saveTimeoutRef.current[note.id] = setTimeout(() => {
      handleSave(note);
      delete saveTimeoutRef.current[note.id];
    }, 1000); // 1 second debounce
  };

  const handleCopyTitle = async () => {
    const activeNote = notes.find(n => n.id === activeNoteId);
    if (!activeNote) return;
    try {
      await navigator.clipboard.writeText(activeNote.title);
      setIsTitleCopied(true);
      setTimeout(() => setIsTitleCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy title: ', err);
    }
  };

  const handleCopyContent = async () => {
    const activeNote = notes.find(n => n.id === activeNoteId);
    if (!activeNote) return;
    try {
      await navigator.clipboard.writeText(activeNote.content);
      setIsContentCopied(true);
      setTimeout(() => setIsContentCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const createNote = () => {
    if (!user) return;
    const newNote: Note = {
      id: uuidv4(),
      uid: user.uid,
      title: '',
      content: '',
      attachments: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    handleSave(newNote);
    setActiveNoteId(newNote.id);
  };

  const updateActiveNote = (updates: Partial<Note>) => {
    if (!activeNoteId || !user) return;
    const activeNote = notes.find(n => n.id === activeNoteId);
    if (!activeNote) return;
    
    const updatedNote = { ...activeNote, ...updates, updatedAt: Date.now() };
    
    // Update local state immediately for responsiveness
    setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
    
    // Manage history: If content change is significant (+/- 50 chars) or it's been 5 mins since last history entry
    const isContentChange = 'content' in updates;
    if (isContentChange && activeNote) {
      const now = Date.now();
      const lastHistoryEntry = activeNote.history?.[0];
      const timeSinceLastHistory = lastHistoryEntry ? now - lastHistoryEntry.updatedAt : Infinity;
      const charDiff = Math.abs((updates.content?.length || 0) - activeNote.content.length);

      if (timeSinceLastHistory > 1000 * 60 * 5 || charDiff > 50) {
        const newHistory = [
          { title: activeNote.title, content: activeNote.content, updatedAt: activeNote.updatedAt },
          ...(activeNote.history || []).slice(0, 9) // Keep last 10 versions
        ];
        updatedNote.history = newHistory;
      }
    }
    
    // If it's a minor update (typing), use debounce. 
    // If it's major (adding attachment, code toggle), save immediately and cancel pending.
    const isMinor = 'title' in updates || 'content' in updates;
    if (isMinor) {
      debouncedSave(updatedNote);
    } else {
      if (saveTimeoutRef.current[updatedNote.id]) {
        clearTimeout(saveTimeoutRef.current[updatedNote.id]);
        delete saveTimeoutRef.current[updatedNote.id];
      }
      handleSave(updatedNote);
    }
  };

  const togglePin = () => {
    if (!activeNote) return;
    updateActiveNote({ isPinned: !activeNote.isPinned });
  };

  const addTag = (tag: string) => {
    if (!activeNote || !tag.trim()) return;
    const cleanTag = tag.trim().toLowerCase();
    if (activeNote.tags?.includes(cleanTag)) return;
    updateActiveNote({ tags: [...(activeNote.tags || []), cleanTag] });
    setNewTag('');
  };

  const removeTag = (tagToRemove: string) => {
    if (!activeNote) return;
    updateActiveNote({ tags: activeNote.tags?.filter(t => t !== tagToRemove) });
  };

  const restoreVersion = (version: { title: string, content: string }) => {
    if (!activeNote) return;
    updateActiveNote({ title: version.title, content: version.content });
    setShowHistory(false);
  };

  const handleAiAction = async (action: 'summarize' | 'fix' | 'optimize') => {
    if (!activeNote || !activeNote.content) return;
    
    const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      alert("Du behöver en Gemini API-nyckel för att använda AI-funktioner. Lägg till den i .env som VITE_GEMINI_API_KEY.");
      return;
    }

    try {
      setIsAiProcessing(true);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      let prompt = "";
      if (action === 'summarize') prompt = `Summarize this note in a few sentences in Swedish: ${activeNote.content}`;
      if (action === 'fix') prompt = `Fix grammatical errors and improve the structure of this Swedish text. Keep it concise. Return only the improved text: ${activeNote.content}`;
      if (action === 'optimize') prompt = `This is code or technical text. Optimize it and explain briefly. Text: ${activeNote.content}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      if (action === 'summarize') {
        alert("Sammanfattning:\n\n" + text);
      } else {
        updateActiveNote({ content: text });
      }
    } catch (error) {
      console.error("AI Error:", error);
      alert("Kunde inte köra AI-tjänsten.");
    } finally {
      setIsAiProcessing(false);
    }
  };

  const deleteNote = async (id: string) => {
    if (!user) return;
    
    const noteToDelete = notes.find(n => n.id === id);
    if (!noteToDelete) return;

    if (!window.confirm('Är du säker på att du vill ta bort den här anteckningen?')) return;

    try {
      // 1. Delete all attachments from Storage first
      if (noteToDelete.attachments && noteToDelete.attachments.length > 0) {
        const deletePromises = noteToDelete.attachments.map(async (attachment) => {
          if (attachment.data.includes('firebasestorage')) {
            try {
              const storageRef = ref(storage, `users/${user.uid}/notes/${id}/${attachment.id}_${attachment.name}`);
              await deleteObject(storageRef);
            } catch (err) {
              console.warn(`Kunde inte ta bort fil ${attachment.name}:`, err);
            }
          }
        });
        await Promise.all(deletePromises);
      }

      // 2. Delete the document from Firestore
      await deleteDoc(doc(db, 'notes', id));
      
      if (activeNoteId === id) {
        setActiveNoteId(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notes/${id}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeNoteId || !user) return;

    const activeNote = notes.find(n => n.id === activeNoteId);
    if (!activeNote) return;

    const newAttachments: Attachment[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > MAX_FILE_SIZE) {
        alert(`Filen ${file.name} är för stor. Max 5MB tillåts.`);
        continue;
      }
      
      try {
        const fileId = uuidv4();
        const storageRef = ref(storage, `users/${user.uid}/notes/${activeNoteId}/${fileId}_${file.name}`);
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);

        newAttachments.push({
          id: fileId,
          name: file.name,
          type: file.type,
          size: file.size,
          data: downloadUrl,
        });
      } catch (error) {
        console.error("Kunde inte ladda upp filen:", error);
        alert(`Kunde inte ladda upp filen ${file.name}`);
      }
    }

    if (newAttachments.length > 0) {
      updateActiveNote({
        attachments: [...activeNote.attachments, ...newAttachments]
      });
    }
    
    e.target.value = '';
  };

  const removeAttachment = async (attachmentId: string) => {
    const activeNote = notes.find(n => n.id === activeNoteId);
    if (!activeNote || !user) return;
    
    const attachment = activeNote.attachments.find(a => a.id === attachmentId);
    if (attachment) {
      try {
        // Try to delete from storage if it's a storage URL
        if (attachment.data.includes('firebasestorage')) {
          const storageRef = ref(storage, `users/${user.uid}/notes/${activeNoteId}/${attachment.id}_${attachment.name}`);
          await deleteObject(storageRef);
        }
      } catch (error) {
        console.error("Failed to delete attachment from storage", error);
      }
    }

    updateActiveNote({
      attachments: activeNote.attachments.filter(a => a.id !== attachmentId)
    });
  };

  const downloadAttachment = (attachment: Attachment) => {
    const link = document.createElement('a');
    link.href = attachment.data;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleCodeEditor = () => {
    const activeNote = notes.find(n => n.id === activeNoteId);
    if (!activeNote) return;

    if (activeNote.code) {
      if (window.confirm('Är du säker på att du vill ta bort all kod?')) {
        updateActiveNote({ code: undefined });
      }
    } else {
      updateActiveNote({
        code: { html: '', css: '', js: '' }
      });
      setActiveCodeTab('html');
    }
  };

  const updateCode = (type: 'html' | 'css' | 'js', value: string) => {
    const activeNote = notes.find(n => n.id === activeNoteId);
    if (!activeNote || !activeNote.code) return;

    updateActiveNote({
      code: {
        ...activeNote.code,
        [type]: value
      }
    });
  };

  const generatePreview = () => {
    const activeNote = notes.find(n => n.id === activeNoteId);
    if (!activeNote || !activeNote.code) return;

    const { html, css, js } = activeNote.code;
    const doc = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #ffffff; overflow: hidden; }
            ${css}
          </style>
        </head>
        <body>
          ${html}
          <script>${js}</script>
        </body>
      </html>
    `;
    setPreviewDoc(doc);
    setActiveCodeTab('preview');
  };

  const capturePreview = async () => {
    const iframe = iframeRef.current;
    if (!iframe) {
      alert('Kunde inte hitta förhandsgranskningen.');
      return;
    }

    try {
      setIsCapturing(true);
      
      let dataUrl = '';

      // 1. Försök med Screen Capture API för att fånga live-pixlar (video/gif/animationer)
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const stream = await navigator.mediaDevices.getDisplayMedia({
            video: { displaySurface: "browser" },
            audio: false,
            preferCurrentTab: true,
          } as any);

          const track = stream.getVideoTracks()[0];
          const settings = track.getSettings();
          
          // Säkerställ att användaren valde en flik och inte hela skärmen
          if (settings.displaySurface && settings.displaySurface !== 'browser') {
            alert('Vänligen välj "Den här fliken" (This Tab) i delningsmenyn för att bilden ska kunna beskäras till bara koden.');
            stream.getTracks().forEach(t => t.stop());
            setIsCapturing(false);
            return;
          }

          const video = document.createElement('video');
          video.srcObject = stream;
          video.muted = true;
          
          await new Promise((resolve) => {
            video.onloadedmetadata = () => {
              video.play();
              resolve(null);
            };
          });

          let isCropped = false;
          // Använd Region Capture API om det stöds (Chrome 104+)
          if ('CropTarget' in window) {
            try {
              const cropTarget = await (window as any).CropTarget.fromElement(iframe);
              if ((track as any).cropTo) {
                await (track as any).cropTo(cropTarget);
                isCropped = true;
                await new Promise(resolve => setTimeout(resolve, 200)); // Låt croppen appliceras
              }
            } catch (e) {
              console.warn('Region capture misslyckades', e);
            }
          }

          // Vänta lite så att videon hinner få en frame
          await new Promise(resolve => setTimeout(resolve, 300));

          const canvas = document.createElement('canvas');
          const rect = iframe.getBoundingClientRect();
          
          if (isCropped) {
            canvas.width = rect.width;
            canvas.height = rect.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              dataUrl = canvas.toDataURL('image/png');
            }
          } else {
            // Räkna ut skalan eftersom videoWidth kan skilja sig från window.innerWidth (t.ex. retina-skärmar)
            const scaleX = video.videoWidth / window.innerWidth;
            const scaleY = video.videoHeight / window.innerHeight;
            
            canvas.width = rect.width * scaleX;
            canvas.height = rect.height * scaleY;
            
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(
                video,
                rect.left * scaleX,
                rect.top * scaleY,
                rect.width * scaleX,
                rect.height * scaleY,
                0,
                0,
                canvas.width,
                canvas.height
              );
              dataUrl = canvas.toDataURL('image/png');
            }
          }

          // Stäng av strömmen
          stream.getTracks().forEach(track => track.stop());
        }
      } catch (mediaError) {
        console.warn('Screen capture avbröts eller stöds inte, faller tillbaka till DOM-rendering', mediaError);
      }

      // 2. Fallback till DOM-rendering om Screen Capture misslyckades
      if (!dataUrl) {
        // Vänta lite så att iframen och eventuella animationer hinner starta
        await new Promise(resolve => setTimeout(resolve, 800));
        
        let body: HTMLElement;
        let isTemp = false;
        
        if (iframe.contentDocument && iframe.contentDocument.body) {
          body = iframe.contentDocument.body;
        } else {
          console.warn('iframe.contentDocument is null, using a temporary container');
          body = document.createElement('div');
          body.style.position = 'absolute';
          body.style.left = '-9999px';
          body.style.width = iframe.clientWidth + 'px';
          body.style.height = iframe.clientHeight + 'px';
          body.style.backgroundColor = '#ffffff';
          body.innerHTML = activeNote?.code.html || '';
          const style = document.createElement('style');
          style.textContent = activeNote?.code.css || '';
          body.appendChild(style);
          document.body.appendChild(body);
          isTemp = true;
        }
        
        // 2a. Försök med native SVG rendering om det bara är en SVG
        const elements = Array.from(body.children).filter(el => el.tagName.toLowerCase() !== 'script' && el.tagName.toLowerCase() !== 'style');
        
        if (elements.length === 1 && elements[0].tagName.toLowerCase() === 'svg') {
          try {
            const svgEl = elements[0] as SVGSVGElement;
            const clonedSvg = svgEl.cloneNode(true) as SVGSVGElement;
            
            const width = iframe.clientWidth || 800;
            const height = iframe.clientHeight || 600;
            
            clonedSvg.setAttribute('width', width.toString());
            clonedSvg.setAttribute('height', height.toString());
            
            const cssText = activeNote?.code.css || '';
            if (cssText) {
              const styleEl = document.createElement('style');
              styleEl.textContent = cssText;
              clonedSvg.insertBefore(styleEl, clonedSvg.firstChild);
            }
            
            if (!clonedSvg.getAttribute('xmlns')) {
              clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            }
            
            const svgStr = new XMLSerializer().serializeToString(clonedSvg);
            const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;
            
            const img = new Image();
            
            dataUrl = await new Promise<string>((resolve, reject) => {
              img.onload = () => {
                try {
                  const canvas = document.createElement('canvas');
                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/png'));
                  } else {
                    reject(new Error('Kunde inte skapa canvas'));
                  }
                } catch (err) {
                  reject(err);
                }
              };
              img.onerror = (e) => reject(new Error('Kunde inte ladda SVG som bild'));
              img.src = svgDataUrl;
            });
          } catch (e) {
            console.warn('Native SVG rendering misslyckades, faller tillbaka...', e);
          }
        }
        
        // 2b. Om dataUrl fortfarande är tom, använd html2canvas
        if (!dataUrl) {
          // Fixa SVG-dimensioner för html2canvas
          const svgs = Array.from(body.querySelectorAll('svg'));
          svgs.forEach(svg => {
            const rect = svg.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              svg.setAttribute('width', rect.width.toString());
              svg.setAttribute('height', rect.height.toString());
            }
          });
          
          try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(body, {
              backgroundColor: '#ffffff',
              useCORS: true,
              allowTaint: false,
              scale: 1,
              width: iframe.clientWidth || 800,
              height: iframe.clientHeight || 600,
            });
            dataUrl = canvas.toDataURL('image/png');
          } catch (e) {
            console.warn('html2canvas misslyckades, försöker med html-to-image', e);
            const { toPng } = await import('html-to-image');
            dataUrl = await toPng(body, {
              backgroundColor: '#ffffff',
              width: iframe.clientWidth || 800,
              height: iframe.clientHeight || 600,
              pixelRatio: 1
            });
          }
        }

        if (isTemp && body.parentNode) {
          body.parentNode.removeChild(body);
        }
      }

      if (!dataUrl || dataUrl === 'data:,') {
        throw new Error('Genererad bild är tom');
      }

      updateActiveNote({ coverImage: dataUrl });

    } catch (error) {
      console.error('Kunde inte ta skärmdump:', error);
      alert('Kunde inte ta en skärmdump av förhandsgranskningen. Vissa externa resurser kan blockeras av webbläsaren.');
    } finally {
      setIsCapturing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeNote = notes.find(n => n.id === activeNoteId);

  if (!isAuthReady) {
    return <div className="flex h-screen w-full items-center justify-center bg-zinc-50">Laddar...</div>;
  }

  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-50">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-zinc-200 max-w-sm w-full text-center">
          <h1 className="text-2xl font-bold mb-2">NexNote</h1>
          <p className="text-zinc-500 mb-6">Logga in för att spara dina anteckningar säkert i molnet.</p>
          <button
            onClick={signInWithGoogle}
            className="w-full py-2 px-4 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors"
          >
            Logga in med Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-zinc-50 text-zinc-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className={cn(
        "flex-col w-full md:w-80 bg-white border-r border-zinc-200 h-full flex-shrink-0 z-20 absolute md:relative transition-transform duration-300 ease-in-out",
        activeNoteId ? "-translate-x-full md:translate-x-0" : "translate-x-0 flex"
      )}>
        <div className="p-4 border-b border-zinc-200 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold tracking-tight">NexNote</h1>
            <div className="flex items-center gap-2">
              <button 
                onClick={logout}
                className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
                title="Logga ut"
              >
                Logga ut
              </button>
              <button 
                onClick={createNote}
                className="p-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors"
                title="Ny anteckning"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              type="text" 
              placeholder="Sök anteckningar..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-100 border-transparent rounded-md text-sm focus:bg-white focus:border-zinc-300 focus:ring-2 focus:ring-zinc-200 outline-none transition-all"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredNotes.length === 0 ? (
            <div className="text-center text-zinc-500 py-8 text-sm">
              Inga anteckningar hittades.
            </div>
          ) : (
            filteredNotes.map(note => (
              <div
                key={note.id}
                onClick={() => setActiveNoteId(note.id)}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-colors group relative cursor-pointer flex gap-3",
                  activeNoteId === note.id ? "bg-zinc-100" : "hover:bg-zinc-50"
                )}
              >
                {note.isPinned && (
                  <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-zinc-900 rounded-r-full" />
                )}
                {(note.coverImage || note.attachments.some(a => a.type.startsWith('image/'))) && (
                  <div 
                    className="w-12 h-12 shrink-0 rounded-md overflow-hidden bg-zinc-200 border border-zinc-200 relative group/img cursor-zoom-in"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage(note.coverImage || note.attachments.find(a => a.type.startsWith('image/'))?.data || null);
                    }}
                  >
                    <img 
                      src={note.coverImage || note.attachments.find(a => a.type.startsWith('image/'))?.data} 
                      alt="Thumbnail" 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                      <Maximize2 size={16} className="text-white" />
                    </div>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {note.isPinned && <Pin size={12} className="text-zinc-400 fill-zinc-400" />}
                    <h3 className="font-medium truncate flex-1">
                      {note.title || 'Namnlös anteckning'}
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 truncate">
                    {note.content || 'Ingen text...'}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-zinc-400">
                      <span>{format(note.updatedAt, 'd MMM', { locale: sv })}</span>
                      {note.attachments.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Paperclip size={10} /> {note.attachments.length}
                        </span>
                      )}
                    </div>
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-300" title={note.tags.join(', ')} />
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNote(note.id);
                  }}
                  className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col h-full bg-white relative transition-transform duration-300 ease-in-out w-full",
        !activeNoteId ? "translate-x-full md:translate-x-0 hidden md:flex" : "translate-x-0 flex"
      )}>
        {activeNote ? (
          <>
            {/* Header */}
            <div className="h-16 border-b border-zinc-200 flex items-center px-4 justify-between bg-white/80 backdrop-blur-sm sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setActiveNoteId(null)}
                  className="md:hidden p-2 -ml-2 text-zinc-500 hover:text-zinc-900 transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="text-xs text-zinc-500">
                  {activeNote.isPinned && <Pin size={12} className="inline mr-1 text-zinc-400 fill-zinc-400" />}
                  Ändrad {format(activeNote.updatedAt, 'd MMM HH:mm', { locale: sv })}
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="hidden sm:flex items-center gap-1 mr-2 pr-2 border-r border-zinc-200">
                   <button 
                    onClick={() => handleAiAction('fix')}
                    disabled={isAiProcessing}
                    className="p-1.5 text-zinc-500 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                    title="Förbättra text med AI"
                  >
                    <Sparkles size={18} className={cn(isAiProcessing && "animate-pulse")} />
                  </button>
                  <button 
                    onClick={() => handleAiAction('summarize')}
                    disabled={isAiProcessing}
                    className="p-1.5 text-zinc-500 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                    title="Sammanfatta med AI"
                  >
                    <FileIcon size={18} />
                  </button>
                </div>

                <div className="flex items-center gap-1 mr-2 pr-2 border-r border-zinc-200">
                  <button 
                    onClick={togglePin}
                    className={cn(
                      "p-1.5 rounded-md transition-colors",
                      activeNote.isPinned ? "text-blue-600 bg-blue-50" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                    )}
                    title={activeNote.isPinned ? "Ta bort nål" : "Nåla fast"}
                  >
                    <Pin size={18} className={cn(activeNote.isPinned && "fill-blue-600")} />
                  </button>
                  <button 
                    onClick={() => setShowHistory(!showHistory)}
                    className={cn(
                      "p-1.5 rounded-md transition-colors",
                      showHistory ? "text-blue-600 bg-blue-50" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                    )}
                    title="Historik"
                  >
                    <HistoryIcon size={18} />
                  </button>
                </div>
                
                <input 
                  type="file" 
                  ref={imageInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  accept="image/*"
                  multiple 
                />
                <button 
                  onClick={() => imageInputRef.current?.click()}
                  className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors"
                  title="Lägg till bild"
                >
                  <ImageIcon size={18} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  multiple 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors"
                  title="Bifoga fil"
                >
                  <Paperclip size={18} />
                </button>
                <button 
                  onClick={toggleCodeEditor}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    activeNote.code 
                      ? "text-blue-700 bg-blue-100 hover:bg-blue-200" 
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                  )}
                  title="Kodredigerare"
                >
                  <Code size={18} />
                </button>
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-12 max-w-4xl mx-auto w-full flex flex-col relative">
              
              {/* Floating History Sidebar */}
              {showHistory && (
                <div className="absolute right-4 top-4 w-64 bg-white border border-zinc-200 rounded-xl shadow-xl z-30 flex flex-col max-h-[80%] overflow-hidden animate-in slide-in-from-right duration-200">
                  <div className="p-3 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
                    <span className="text-xs font-bold uppercase text-zinc-500 flex items-center gap-1.5">
                      <Clock size={14} /> Historik
                    </span>
                    <button onClick={() => setShowHistory(false)} className="text-zinc-400 hover:text-zinc-900">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {(!activeNote.history || activeNote.history.length === 0) ? (
                      <div className="text-center py-8 text-xs text-zinc-400">Ingen historik än</div>
                    ) : (
                      activeNote.history.map((v, i) => (
                        <div key={i} className="p-2 rounded-md border border-zinc-100 hover:bg-zinc-50 group transition-colors">
                          <div className="text-[10px] text-zinc-400 font-mono mb-1">
                            {format(v.updatedAt, 'd MMM HH:mm', { locale: sv })}
                          </div>
                          <div className="text-xs font-medium truncate mb-1">{v.title || 'Namnlös'}</div>
                          <button 
                            onClick={() => restoreVersion(v)}
                            className="w-full py-1 bg-zinc-100 text-[10px] font-bold uppercase rounded hover:bg-zinc-900 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                          >
                            Återställ
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="relative pl-10 md:pl-12 flex-1 flex flex-col">
                
                <div className="relative flex items-start group mb-2">
                  <button
                    onClick={handleCopyTitle}
                    className="absolute -left-10 md:-left-12 top-1/2 -translate-y-1/2 p-2 text-zinc-300 hover:text-zinc-600 opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-zinc-100"
                    title="Kopiera titel"
                  >
                    {isTitleCopied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                  </button>
                  <input
                    type="text"
                    value={activeNote.title}
                    onChange={(e) => updateActiveNote({ title: e.target.value })}
                    placeholder="Titel på anteckning"
                    className="w-full text-3xl md:text-4xl font-bold text-zinc-900 placeholder:text-zinc-300 border-none outline-none bg-transparent"
                  />
                </div>

                {/* Tags Area */}
                <div className="flex flex-wrap items-center gap-2 mb-6 ml-0 md:ml-1 text-sm">
                  <div className="flex items-center gap-1.5 text-zinc-400 mr-1">
                    <TagIcon size={14} />
                  </div>
                  {activeNote.tags?.map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-full text-xs font-medium border border-zinc-200">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-red-500">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  <div className="relative flex items-center">
                    <input 
                      type="text"
                      placeholder="Lägg till tagg..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addTag(newTag)}
                      className="bg-transparent border-none outline-none text-xs text-zinc-500 placeholder:text-zinc-300 w-24 focus:w-32 transition-all"
                    />
                  </div>
                </div>
                
                <div className="relative flex-1 flex flex-col group">
                  <button
                    onClick={handleCopyContent}
                    className="absolute -left-10 md:-left-12 top-0 p-2 text-zinc-300 hover:text-zinc-600 opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-zinc-100 z-10"
                    title="Kopiera text"
                  >
                    {isContentCopied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                  </button>
                  <textarea
                    value={activeNote.content}
                    onChange={(e) => updateActiveNote({ content: e.target.value })}
                    placeholder="Skriv din anteckning här..."
                    className="w-full flex-1 min-h-[150px] text-zinc-700 placeholder:text-zinc-400 border-none outline-none bg-transparent resize-none leading-relaxed"
                  />
                </div>

                {/* Code Editor */}
                {activeNote.code && (
                  <div className="mt-8 border border-zinc-200 rounded-xl overflow-hidden shadow-sm bg-zinc-900 text-zinc-100 flex flex-col">
                    <div className="flex items-center justify-between bg-zinc-950 px-2 border-b border-zinc-800 overflow-x-auto scrollbar-hide">
                      <div className="flex shrink-0">
                        {(['html', 'css', 'js'] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActiveCodeTab(tab)}
                            className={cn(
                              "px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap",
                              activeCodeTab === tab 
                                ? "border-blue-500 text-white bg-zinc-900" 
                                : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
                            )}
                          >
                            {tab}
                          </button>
                        ))}
                        <button
                          onClick={generatePreview}
                          className={cn(
                            "px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium uppercase tracking-wider transition-colors border-b-2 flex items-center gap-1 sm:gap-2 whitespace-nowrap",
                            activeCodeTab === 'preview'
                              ? "border-green-500 text-green-400 bg-zinc-900" 
                              : "border-transparent text-zinc-500 hover:text-green-400 hover:bg-zinc-900/50"
                          )}
                        >
                          <Play size={14} /> Preview
                        </button>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-2">
                        {activeCodeTab === 'preview' && (
                          <button
                            onClick={capturePreview}
                            disabled={isCapturing}
                            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 hover:text-white rounded-md transition-colors disabled:opacity-50 whitespace-nowrap"
                            title="Spara som anteckningsbild"
                          >
                            <Camera size={14} />
                            <span className="hidden sm:inline">
                              {isCapturing ? 'Sparar...' : 'Spara bild'}
                            </span>
                          </button>
                        )}
                        <button 
                          onClick={toggleCodeEditor}
                          className="p-1.5 sm:p-2 text-zinc-500 hover:text-red-400 transition-colors shrink-0"
                          title="Stäng kodredigerare"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="h-[400px] bg-zinc-900 relative">
                      {activeCodeTab === 'html' && (
                        <textarea
                          value={activeNote.code.html}
                          onChange={(e) => updateCode('html', e.target.value)}
                          placeholder="<!-- Skriv HTML här... -->"
                          className="w-full h-full p-4 bg-transparent text-zinc-300 font-mono text-sm resize-none outline-none focus:ring-1 focus:ring-blue-500/50"
                          spellCheck={false}
                        />
                      )}
                      {activeCodeTab === 'css' && (
                        <textarea
                          value={activeNote.code.css}
                          onChange={(e) => updateCode('css', e.target.value)}
                          placeholder="/* Skriv CSS här... */"
                          className="w-full h-full p-4 bg-transparent text-zinc-300 font-mono text-sm resize-none outline-none focus:ring-1 focus:ring-blue-500/50"
                          spellCheck={false}
                        />
                      )}
                      {activeCodeTab === 'js' && (
                        <textarea
                          value={activeNote.code.js}
                          onChange={(e) => updateCode('js', e.target.value)}
                          placeholder="// Skriv JavaScript här..."
                          className="w-full h-full p-4 bg-transparent text-zinc-300 font-mono text-sm resize-none outline-none focus:ring-1 focus:ring-blue-500/50"
                          spellCheck={false}
                        />
                      )}
                      {activeCodeTab === 'preview' && (
                        <div className="w-full h-full bg-white relative">
                          <iframe
                            ref={iframeRef}
                            title="Preview"
                            srcDoc={previewDoc}
                            className="w-full h-full border-none"
                            sandbox="allow-scripts allow-same-origin"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Attachments */}
                {activeNote.attachments.length > 0 && (
                  <div className="mt-12 pt-6 border-t border-zinc-100">
                    <h4 className="text-sm font-medium text-zinc-500 mb-4 flex items-center gap-2">
                      <Paperclip size={16} />
                      Bifogade filer ({activeNote.attachments.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeNote.attachments.map(attachment => (
                        <div 
                          key={attachment.id} 
                          className="flex items-center p-3 bg-zinc-50 border border-zinc-200 rounded-lg group"
                        >
                          <div 
                            className={cn(
                              "w-10 h-10 rounded bg-zinc-200 flex items-center justify-center text-zinc-500 shrink-0 overflow-hidden",
                              attachment.type.startsWith('image/') && "cursor-pointer hover:opacity-80 transition-opacity"
                            )}
                            onClick={() => attachment.type.startsWith('image/') && setSelectedImage(attachment.data)}
                          >
                            {attachment.type.startsWith('image/') ? (
                              <img src={attachment.data} alt={attachment.name} className="w-full h-full object-cover" />
                            ) : (
                              <FileIcon size={20} />
                            )}
                          </div>
                          <div className="ml-3 flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-900 truncate" title={attachment.name}>
                              {attachment.name}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {formatFileSize(attachment.size)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => downloadAttachment(attachment)}
                              className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 rounded-md"
                              title="Ladda ner"
                            >
                              <Download size={16} />
                            </button>
                            <button 
                              onClick={() => removeAttachment(attachment.id)}
                              className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-md"
                              title="Ta bort"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-8 hidden md:flex">
            <div className="w-16 h-16 mb-4 rounded-full bg-zinc-100 flex items-center justify-center">
              <FileIcon size={32} className="text-zinc-300" />
            </div>
            <p className="text-lg font-medium text-zinc-500">Välj en anteckning</p>
            <p className="text-sm mt-1">eller skapa en ny för att börja skriva</p>
            <button 
              onClick={createNote}
              className="mt-6 px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors flex items-center gap-2"
            >
              <Plus size={18} />
              Skapa ny anteckning
            </button>
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-all"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedImage(null);
            }}
          >
            <X size={24} />
          </button>
          <img 
            src={selectedImage} 
            alt="Full size" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
