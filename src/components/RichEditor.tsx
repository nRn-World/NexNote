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
        "p-1.5 rounded transition-colors text-zinc-500",
        active ? "bg-zinc-200 text-zinc-900" : "hover:bg-zinc-100 hover:text-zinc-900"
      )}
    >
      {children}
    </button>
  );
}

export default function RichEditor({ content, onChange }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: 'Skriv din anteckning här...' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-zinc max-w-none outline-none min-h-[150px] text-zinc-700 leading-relaxed focus:outline-none',
      },
    },
  });

  // Sync external content changes (e.g. AI rewrite, history restore)
  React.useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== content) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-0.5 p-1 bg-zinc-50 border border-zinc-200 rounded-lg">
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Fetstil (Ctrl+B)">
          <Bold size={15} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Kursiv (Ctrl+I)">
          <Italic size={15} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Understruken (Ctrl+U)">
          <UnderlineIcon size={15} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Genomstruken">
          <Strikethrough size={15} />
        </ToolbarBtn>
        <div className="w-px h-4 bg-zinc-200 mx-1" />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Punktlista">
          <List size={15} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numrerad lista">
          <ListOrdered size={15} />
        </ToolbarBtn>
        <div className="w-px h-4 bg-zinc-200 mx-1" />
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Vänster">
          <AlignLeft size={15} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Centrera">
          <AlignCenter size={15} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Höger">
          <AlignRight size={15} />
        </ToolbarBtn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
