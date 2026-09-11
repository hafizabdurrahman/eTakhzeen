import React, { useEffect, useRef } from 'react';
import { Bold, Italic, Underline, List, Link as LinkIcon, Image as ImageIcon, Eraser } from 'lucide-react';
import announcementService from '../../backend/announcement'; // ⚠️ adjust path

// Controlled-ish contentEditable: `value` is the source of truth on mount
// and whenever it changes from OUTSIDE this component (e.g. switching
// which announcement you're editing); typing inside just calls onChange
// with the current innerHTML, same shape as a normal controlled input.
function RichTextEditor({ value, onChange }) {
    const ref = useRef(null);
    const lastExternalValue = useRef(value);

    useEffect(() => {
        if (ref.current && value !== lastExternalValue.current && value !== ref.current.innerHTML) {
            ref.current.innerHTML = value || '';
        }
        lastExternalValue.current = value;
    }, [value]);

    function exec(command, arg = null) {
        document.execCommand(command, false, arg);
        ref.current?.focus();
        emitChange();
    }

    function emitChange() {
        onChange(ref.current?.innerHTML || '');
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
        <div className="overflow-hidden rounded-md border border-stone-200 shadow-sm dark:border-stone-800">
            <div className="flex flex-wrap items-center gap-0.5 border-b border-stone-200 bg-stone-50 p-1.5 dark:border-stone-800 dark:bg-stone-900">
                <ToolbarButton icon={Bold} onClick={() => exec('bold')} title="Bold" />
                <ToolbarButton icon={Italic} onClick={() => exec('italic')} title="Italic" />
                <ToolbarButton icon={Underline} onClick={() => exec('underline')} title="Underline" />
                <div className="mx-1 h-5 w-px bg-stone-200 dark:bg-stone-700" />
                <ToolbarButton icon={List} onClick={() => exec('insertUnorderedList')} title="Bullet list" />
                <ToolbarButton icon={LinkIcon} onClick={handleInsertLink} title="Insert link" />
                <label
                    title="Insert image"
                    className="flex cursor-pointer items-center justify-center rounded-md p-1.5 text-stone-500 transition-colors hover:bg-stone-200/60 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                >
                    <ImageIcon size={15} />
                    <input type="file" accept="image/*" onChange={handleInsertImage} className="hidden" />
                </label>
                <div className="mx-1 h-5 w-px bg-stone-200 dark:bg-stone-700" />
                <ToolbarButton icon={Eraser} onClick={() => exec('removeFormat')} title="Clear formatting" />
            </div>

            <div
                ref={ref}
                contentEditable
                onInput={emitChange}
                onBlur={emitChange}
                className="min-h-40 max-w-none bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none dark:bg-stone-950 dark:text-stone-100"
                suppressContentEditableWarning
            />
        </div>
    );
}

function ToolbarButton({ icon: Icon, onClick, title }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            aria-label={title}
            className="flex items-center justify-center rounded-md p-1.5 text-stone-500 transition-colors hover:bg-stone-200/60 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
        >
            <Icon size={15} />
        </button>
    );
}

export default RichTextEditor;