import React, { useEffect, useRef, useState } from 'react';
import {
    Undo2,
    Redo2,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    AlignLeft,
    AlignCenter,
    AlignRight,
    List,
    ListOrdered,
    Quote,
    Link as LinkIcon,
    Image as ImageIcon,
    Eraser,
} from 'lucide-react';
import announcementService from '../../backend/announcement'; // ⚠️ adjust path

const TRACKED_COMMANDS = [
    'bold',
    'italic',
    'underline',
    'strikeThrough',
    'insertUnorderedList',
    'insertOrderedList',
    'justifyLeft',
    'justifyCenter',
    'justifyRight',
];

const FORMAT_BLOCKS = [
    { value: 'p', label: 'Paragraph' },
    { value: 'h1', label: 'Heading 1' },
    { value: 'h2', label: 'Heading 2' },
    { value: 'h3', label: 'Heading 3' },
];

function countWords(html) {
    const text = html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .trim();
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
}

// Controlled-ish contentEditable: `value` is the source of truth on mount
// and whenever it changes from OUTSIDE this component (e.g. switching
// which announcement you're editing); typing inside just calls onChange
// with the current innerHTML, same shape as a normal controlled input.
function RichTextEditor({ value, onChange, placeholder = 'Write your announcement...' }) {
    const ref = useRef(null);
    const lastExternalValue = useRef(value);
    const [activeStates, setActiveStates] = useState({});
    const [formatBlock, setFormatBlock] = useState('p');
    const [focused, setFocused] = useState(false);
    const [wordCount, setWordCount] = useState(0);

    useEffect(() => {
        if (ref.current && value !== lastExternalValue.current && value !== ref.current.innerHTML) {
            ref.current.innerHTML = value || '';
        }
        lastExternalValue.current = value;
        setWordCount(countWords(value || ''));
    }, [value]);

    // Keep the toolbar in sync with whatever formatting is active at the
    // current cursor position, so the buttons read as real toggles instead
    // of one-shot actions.
    function refreshActiveStates() {
        const next = {};
        TRACKED_COMMANDS.forEach((cmd) => {
            try {
                next[cmd] = document.queryCommandState(cmd);
            } catch {
                next[cmd] = false;
            }
        });
        setActiveStates(next);

        try {
            const block = document.queryCommandValue('formatBlock')?.toLowerCase();
            if (block && FORMAT_BLOCKS.some((f) => f.value === block)) {
                setFormatBlock(block);
            } else if (!block || block === 'div') {
                setFormatBlock('p');
            }
        } catch {
            // ignore — some browsers don't support formatBlock introspection
        }
    }

    function exec(command, arg = null) {
        document.execCommand(command, false, arg);
        ref.current?.focus();
        emitChange();
        refreshActiveStates();
    }

    function handleFormatBlockChange(e) {
        exec('formatBlock', `<${e.target.value}>`);
        setFormatBlock(e.target.value);
    }

    function emitChange() {
        const html = ref.current?.innerHTML || '';
        onChange(html);
        setWordCount(countWords(html));
    }

    function handleInsertLink() {
        const url = prompt('Link URL (include https://):');
        if (!url) return;
        exec('createLink', url);
    }

    async function handleInsertImage(e) {
        const file = e.target.files?.[0];
        e.target.value = ''; // allow picking the same file twice in a row
        if (!file) return;

        const uploaded = await announcementService.uploadImage({ file });
        if (!uploaded) {
            alert('Image upload failed.');
            return;
        }
        const url = announcementService.getImageUrl({ fileId: uploaded['$id'] });
        exec('insertImage', url);
    }

    return (
        <div
            className={`overflow-hidden rounded-lg border bg-cream shadow-sm transition-colors dark:bg-stone-900 ${
                focused
                    ? 'border-brand-600 ring-2 ring-brand-100 dark:border-brand-500 dark:ring-brand-500/20'
                    : 'border-stone-200 dark:border-stone-800'
            }`}
        >
            <div className="flex flex-wrap items-center gap-1 border-b border-stone-200 bg-stone-50 p-1.5 dark:border-stone-800 dark:bg-stone-800/40">
                {/* History */}
                <ToolbarButton icon={Undo2} onClick={() => exec('undo')} title="Undo" />
                <ToolbarButton icon={Redo2} onClick={() => exec('redo')} title="Redo" />

                <Divider />

                {/* Block format */}
                <select
                    value={formatBlock}
                    onChange={handleFormatBlockChange}
                    title="Paragraph style"
                    className="rounded-md border border-stone-200 bg-cream px-2 py-1 text-xs font-medium text-stone-700 transition-colors hover:border-stone-300 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-stone-600 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                >
                    {FORMAT_BLOCKS.map((f) => (
                        <option key={f.value} value={f.value}>
                            {f.label}
                        </option>
                    ))}
                </select>

                <Divider />

                {/* Inline styles */}
                <ToolbarButton icon={Bold} onClick={() => exec('bold')} title="Bold" active={activeStates.bold} />
                <ToolbarButton icon={Italic} onClick={() => exec('italic')} title="Italic" active={activeStates.italic} />
                <ToolbarButton
                    icon={Underline}
                    onClick={() => exec('underline')}
                    title="Underline"
                    active={activeStates.underline}
                />
                <ToolbarButton
                    icon={Strikethrough}
                    onClick={() => exec('strikeThrough')}
                    title="Strikethrough"
                    active={activeStates.strikeThrough}
                />

                <Divider />

                {/* Alignment */}
                <ToolbarButton
                    icon={AlignLeft}
                    onClick={() => exec('justifyLeft')}
                    title="Align left"
                    active={activeStates.justifyLeft}
                />
                <ToolbarButton
                    icon={AlignCenter}
                    onClick={() => exec('justifyCenter')}
                    title="Align center"
                    active={activeStates.justifyCenter}
                />
                <ToolbarButton
                    icon={AlignRight}
                    onClick={() => exec('justifyRight')}
                    title="Align right"
                    active={activeStates.justifyRight}
                />

                <Divider />

                {/* Lists & quote */}
                <ToolbarButton
                    icon={List}
                    onClick={() => exec('insertUnorderedList')}
                    title="Bullet list"
                    active={activeStates.insertUnorderedList}
                />
                <ToolbarButton
                    icon={ListOrdered}
                    onClick={() => exec('insertOrderedList')}
                    title="Numbered list"
                    active={activeStates.insertOrderedList}
                />
                <ToolbarButton icon={Quote} onClick={() => exec('formatBlock', '<blockquote>')} title="Quote" />

                <Divider />

                {/* Insert */}
                <ToolbarButton icon={LinkIcon} onClick={handleInsertLink} title="Insert link" />
                <label
                    title="Insert image"
                    className="flex cursor-pointer items-center justify-center rounded-md p-1.5 text-stone-500 transition-colors hover:bg-brand-50 hover:text-brand-700 dark:text-stone-400 dark:hover:bg-brand-500/15 dark:hover:text-brand-400"
                >
                    <ImageIcon size={16} />
                    <input type="file" accept="image/*" onChange={handleInsertImage} className="hidden" />
                </label>

                <Divider />

                <ToolbarButton icon={Eraser} onClick={() => exec('removeFormat')} title="Clear formatting" tint="red" />
            </div>

            <div
                ref={ref}
                contentEditable
                onInput={emitChange}
                onFocus={() => setFocused(true)}
                onBlur={() => {
                    setFocused(false);
                    emitChange();
                }}
                onKeyUp={refreshActiveStates}
                onMouseUp={refreshActiveStates}
                data-placeholder={placeholder}
                className="prose prose-sm max-h-[28rem] min-h-[14rem] max-w-none overflow-y-auto px-3.5 py-3 text-sm leading-relaxed text-stone-900 focus:outline-none empty:before:text-stone-400 empty:before:content-[attr(data-placeholder)] dark:prose-invert dark:text-stone-100 dark:empty:before:text-stone-500 [&_blockquote]:border-l-2 [&_blockquote]:border-brand-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-stone-600 dark:[&_blockquote]:border-brand-700 dark:[&_blockquote]:text-stone-400"
                suppressContentEditableWarning
            />

            <div className="flex items-center justify-end border-t border-stone-100 bg-stone-50/60 px-3 py-1.5 text-xs text-stone-400 dark:border-stone-800 dark:bg-stone-800/20 dark:text-stone-500">
                {wordCount} {wordCount === 1 ? 'word' : 'words'}
            </div>
        </div>
    );
}

function Divider() {
    return <div className="mx-0.5 h-5 w-px shrink-0 bg-stone-200 dark:bg-stone-800" />;
}

function ToolbarButton({ icon: Icon, onClick, title, active, tint = 'brand' }) {
    const hoverClasses =
        tint === 'red'
            ? 'hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/15 dark:hover:text-red-400'
            : 'hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-500/15 dark:hover:text-brand-400';
    const activeClasses = active
        ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400'
        : 'text-stone-500 dark:text-stone-400';

    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            aria-label={title}
            aria-pressed={!!active}
            className={`flex items-center justify-center rounded-md p-1.5 transition-colors ${activeClasses} ${hoverClasses}`}
        >
            <Icon size={16} />
        </button>
    );
}

export default RichTextEditor;