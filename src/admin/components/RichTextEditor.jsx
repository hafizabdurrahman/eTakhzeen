import React, { useEffect, useRef } from 'react';
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
        <div className="border border-neutral-800 rounded-md overflow-hidden">
            <div className="flex flex-wrap gap-1 border-b border-neutral-800 bg-neutral-900 p-1">
                <ToolbarButton label="B" onClick={() => exec('bold')} title="Bold" />
                <ToolbarButton label="I" onClick={() => exec('italic')} title="Italic" />
                <ToolbarButton label="U" onClick={() => exec('underline')} title="Underline" />
                <ToolbarButton label="• List" onClick={() => exec('insertUnorderedList')} title="Bullet list" />
                <ToolbarButton label="Link" onClick={handleInsertLink} title="Insert link" />
                <label className="cursor-pointer rounded px-2 py-1 text-xs hover:bg-neutral-800" title="Insert image">
                    Image
                    <input type="file" accept="image/*" onChange={handleInsertImage} className="hidden" />
                </label>
                <ToolbarButton label="Clear" onClick={() => exec('removeFormat')} title="Clear formatting" />
            </div>

            <div
                ref={ref}
                contentEditable
                onInput={emitChange}
                onBlur={emitChange}
                className="min-h-[160px] px-3 py-2 text-sm focus:outline-none prose prose-invert max-w-none"
                suppressContentEditableWarning
            />
        </div>
    );
}

function ToolbarButton({ label, onClick, title }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className="rounded px-2 py-1 text-xs hover:bg-neutral-800"
        >
            {label}
        </button>
    );
}

export default RichTextEditor;