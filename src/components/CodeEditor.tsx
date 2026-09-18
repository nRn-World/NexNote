import React, { useRef, useEffect } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

interface CodeEditorProps {
  value: string;
  language: 'html' | 'css' | 'js';
  onChange: (value: string) => void;
}

const langExtension = (lang: 'html' | 'css' | 'js') => {
  if (lang === 'html') return html();
  if (lang === 'css') return css();
  return javascript();
};

export default function CodeEditor({ value, language, onChange }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const skipExternalSync = useRef(false);
  const readyRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    readyRef.current = false;

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          oneDark,
          langExtension(language),
          EditorView.updateListener.of(update => {
            if (update.docChanged && !skipExternalSync.current && readyRef.current) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
          EditorView.theme({
            '&': { height: '100%', fontSize: '13px' },
            '.cm-scroller': { overflow: 'auto', fontFamily: "'Fira Code', 'Cascadia Code', monospace" },
          }),
        ],
      }),
      parent: containerRef.current,
    });

    viewRef.current = view;
    const ready = window.requestAnimationFrame(() => { readyRef.current = true; });
    return () => {
      window.cancelAnimationFrame(ready);
      readyRef.current = false;
      view.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Sync external value changes (e.g. restore from history)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      skipExternalSync.current = true;
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
      skipExternalSync.current = false;
    }
  }, [value]);

  return <div ref={containerRef} className="w-full h-full" />;
}
