import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Bold, Italic, UnderlineIcon, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Strikethrough } from 'lucide-react';
import { cn } from '../lib/utils';

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
  isDark?: boolean;
}

function ToolbarBtn({ onClick, active, title, children }: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      className={cn(
        "p-2 rounded-xl transition-all text-slate-500",
        active ? "bg-cyan-400/10 text-cyan-400 shadow-[0_0_15px_rgba(0,242,255,0.1)] border border-cyan-400/20" : "hover:bg-white/5 hover:text-white"
      )}
    >
      {children}
    </button>
  );
}

export default function RichEditor({ content, onChange, isDark = true }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: 'Start visualizing your next creation here...' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: cn(
          'prose max-w-none outline-none min-h-[400px] leading-relaxed focus:outline-none py-4 text-lg font-medium selection:bg-cyan-400/30',
          isDark ? 'prose-invert text-slate-300 selection:text-white' : 'text-[var(--text-primary)] selection:text-slate-900'
        )
      },
    },
  });

  React.useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== content) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 glass-card border-white/5 rounded-2xl w-fit sticky top-2 z-10 mx-auto md:mx-0 shadow-2xl backdrop-blur-xl">
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)">
          <Bold size={16} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)">
          <Italic size={16} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Ctrl+U)">
          <UnderlineIcon size={16} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
          <Strikethrough size={16} />
        </ToolbarBtn>
        <div className="w-px h-6 bg-white/5 mx-1" />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
          <List size={16} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List">
          <ListOrdered size={16} />
        </ToolbarBtn>
        <div className="w-px h-6 bg-white/5 mx-1" />
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Left">
          <AlignLeft size={16} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Center">
          <AlignCenter size={16} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Right">
          <AlignRight size={16} />
        </ToolbarBtn>
      </div>
      <EditorContent editor={editor} className="no-scrollbar" />
    </div>
  );
}
