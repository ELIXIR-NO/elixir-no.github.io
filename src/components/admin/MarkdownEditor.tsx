import React, { useState, useRef, useCallback } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ gfm: true, breaks: true });

function toKebab(str: string): string {
    return str
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

interface Props {
    value: string;
    onChange: (md: string) => void;
    onFileUpload?: (file: File) => Promise<string>;
}

export default function MarkdownEditor({ value, onChange, onFileUpload }: Props) {
    const [mode, setMode] = useState<'write' | 'preview' | 'split'>('write');
    const [dragging, setDragging] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const insert = useCallback((before: string, after = '', placeholder = '') => {
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const selected = value.slice(start, end) || placeholder;
        const newValue = value.slice(0, start) + before + selected + after + value.slice(end);
        onChange(newValue);
        requestAnimationFrame(() => {
            ta.focus();
            const cursor = start + before.length + selected.length;
            ta.setSelectionRange(cursor, cursor);
        });
    }, [value, onChange]);

    const handleImageUpload = useCallback(() => {
        if (!onFileUpload) return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            const path = await onFileUpload(file);
            insert(`![${toKebab(file.name.replace(/\.[^.]+$/, ''))}](${path})\n`);
        };
        input.click();
    }, [insert, onFileUpload]);

    const handleFileUpload = useCallback(() => {
        if (!onFileUpload) return;
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            const path = await onFileUpload(file);
            const name = toKebab(file.name.replace(/\.[^.]+$/, ''));
            insert(`[${name}](${path})\n`);
        };
        input.click();
    }, [insert, onFileUpload]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragging(false);
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        if (!onFileUpload) return;
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        if (file.type.startsWith('image/')) {
            const path = await onFileUpload(file);
            insert(`![${toKebab(file.name.replace(/\.[^.]+$/, ''))}](${path})\n`);
        } else {
            const path = await onFileUpload(file);
            const name = toKebab(file.name.replace(/\.[^.]+$/, ''));
            insert(`[${name}](${path})\n`);
        }
    }, [insert, onFileUpload]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const mod = e.metaKey || e.ctrlKey;
        if (mod && e.key === 'b') {
            e.preventDefault();
            insert('**', '**', 'bold');
        } else if (mod && e.key === 'i') {
            e.preventDefault();
            insert('*', '*', 'italic');
        } else if (mod && e.key === 'k') {
            e.preventDefault();
            insert('[', '](url)', 'link text');
        } else if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            insert('  ');
        } else if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault();
            const ta = e.currentTarget;
            const start = ta.selectionStart;
            const lineStart = value.lastIndexOf('\n', start - 1) + 1;
            if (value.slice(lineStart, lineStart + 2) === '  ') {
                const newValue = value.slice(0, lineStart) + value.slice(lineStart + 2);
                onChange(newValue);
                requestAnimationFrame(() => {
                    ta.focus();
                    ta.setSelectionRange(Math.max(start - 2, lineStart), Math.max(start - 2, lineStart));
                });
            }
        }
    }, [value, onChange, insert]);

    const rawHtml = marked.parse(value) as string;
    // DOMPurify sanitizes the marked output before rendering — safe against XSS
    const previewHtml = DOMPurify.sanitize(rawHtml);

    const Btn = ({ onClick, active, title, children }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) => (
        <button
            type="button"
            onMouseDown={e => { e.preventDefault(); onClick(); }}
            title={title}
            className={`p-1.5 rounded transition-colors ${active ? 'bg-accent/20 text-accent' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
        >
            {children}
        </button>
    );

    const Sep = () => <div className="w-px h-5 bg-gray-600 mx-0.5" />;

    const icon = (d: string) => (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d={d} />
        </svg>
    );

    return (
        <div className="rounded-lg border border-gray-600 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-600 bg-dark-surface flex-wrap">
                <Btn onClick={() => insert('**', '**', 'bold')} title="Bold (Ctrl+B)">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4h8a4 4 0 0 1 2.82 6.83A4 4 0 0 1 15 18H6V4zm3 7h5a1.5 1.5 0 0 0 0-3H9v3zm0 3v3h6a1.5 1.5 0 0 0 0-3H9z"/></svg>
                </Btn>
                <Btn onClick={() => insert('*', '*', 'italic')} title="Italic (Ctrl+I)">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10 4h8l-1 2h-2.6l-4 12H13l-1 2H4l1-2h2.6l4-12H9l1-2z"/></svg>
                </Btn>
                <Btn onClick={() => insert('~~', '~~', 'strikethrough')} title="Strikethrough">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 12h18v2H3v-2zm3-7h12v2H6V5zm2 14h8v-2H8v2z"/></svg>
                </Btn>
                <Sep />
                <Btn onClick={() => insert('# ', '', 'Heading')} title="Heading 1">
                    <span className="font-bold text-xs leading-none">H1</span>
                </Btn>
                <Btn onClick={() => insert('## ', '', 'Heading')} title="Heading 2">
                    <span className="font-bold text-xs leading-none">H2</span>
                </Btn>
                <Btn onClick={() => insert('### ', '', 'Heading')} title="Heading 3">
                    <span className="font-bold text-xs leading-none">H3</span>
                </Btn>
                <Sep />
                <Btn onClick={() => insert('- ', '', 'item')} title="Bullet list">
                    {icon('M8.25 6.75h12M8.25 12h12M8.25 17.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z')}
                </Btn>
                <Btn onClick={() => insert('1. ', '', 'item')} title="Numbered list">
                    {icon('M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5')}
                </Btn>
                <Sep />
                <Btn onClick={() => insert('[', '](url)', 'link text')} title="Link (Ctrl+K)">
                    {icon('M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244')}
                </Btn>
                <Btn onClick={handleImageUpload} title="Upload image">
                    {icon('m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z')}
                </Btn>
                {onFileUpload && (
                    <Btn onClick={handleFileUpload} title="Upload file">
                        {icon('M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13')}
                    </Btn>
                )}
                <Sep />
                <Btn onClick={() => insert('`', '`', 'code')} title="Inline code">
                    {icon('M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5')}
                </Btn>
                <Btn onClick={() => insert('\n```\n', '\n```\n', 'code block')} title="Code block">
                    {icon('M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z')}
                </Btn>
                <Btn onClick={() => insert('> ', '', 'quote')} title="Blockquote">
                    {icon('M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z')}
                </Btn>
                <Btn onClick={() => insert('\n---\n')} title="Horizontal rule">
                    {icon('M5 12h14')}
                </Btn>
                <Btn onClick={() => insert('\n| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| cell | cell | cell |\n')} title="Insert table">
                    {icon('M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M12 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M21 12c0 .621-.504 1.125-1.125 1.125m-5.25 0c.621 0 1.125.504 1.125 1.125m-12.75-1.125c-.621 0-1.125.504-1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5')}
                </Btn>

                <div className="ml-auto flex gap-0.5">
                    <Btn onClick={() => setMode('write')} active={mode === 'write'} title="Source">
                        {icon('m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10')}
                    </Btn>
                    <Btn onClick={() => setMode('split')} active={mode === 'split'} title="Split view">
                        {icon('M9 4.5v15m6-15v15M4.5 19.5h15a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5h-15A1.5 1.5 0 0 0 3 6v12a1.5 1.5 0 0 0 1.5 1.5Z')}
                    </Btn>
                    <Btn onClick={() => setMode('preview')} active={mode === 'preview'} title="Preview">
                        {icon('M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z')}
                    </Btn>
                </div>
            </div>

            {/* Editor area */}
            <div className={mode === 'split' ? 'grid grid-cols-2 divide-x divide-gray-600' : ''}>
                {mode !== 'preview' && (
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`w-full min-h-[350px] px-4 py-3 text-sm font-mono bg-[#1a1a2e] text-gray-200 focus:outline-none resize-y transition-colors ${
                            dragging ? 'ring-2 ring-accent ring-inset bg-accent/5' : ''
                        }`}
                        placeholder="Write markdown here... (drop images to upload)"
                    />
                )}
                {mode !== 'write' && (
                    <div
                        className="cms-preview min-h-[350px] px-4 py-3 text-sm bg-dark-surface text-gray-300 overflow-y-auto"
                        // previewHtml is sanitized by DOMPurify above — safe to render
                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                )}
            </div>
        </div>
    );
}
