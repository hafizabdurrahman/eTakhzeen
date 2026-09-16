import React, { useState } from 'react';
import { FolderUp, Tag, Layers, X, PackagePlus, RotateCcw, Hash } from 'lucide-react';
import service from '../../backend/service';
import { slugify, nameFromFilename, makeSlugUnique, buildDescriptionFromTemplate } from '../../utils/slug';
import { SegmentedControl } from '../../ui';

const PRICE_MODE_OPTIONS = [
    { value: 'same', label: 'Same for all' },
    { value: 'separate', label: 'Edit separately' },
];

const DESCRIPTION_MODE_OPTIONS = [
    { value: 'same', label: 'Same for all' },
    { value: 'separate', label: 'Edit separately' },
];

const KEYWORDS_MODE_OPTIONS = [
    { value: 'same', label: 'Same for all' },
    { value: 'separate', label: 'Edit separately' },
];

const inputClass =
    'w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20';

const smallInputClass =
    'w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500';

// A YouTube-tags-style input: type a keyword, hit Enter or "," to turn it
// into a chip. The chip set is what's actually stored — the text box is
// just a staging area and clears after each commit. `value` / `onChange`
// speak in the outside world's format: one string, keywords separated by
// commas (e.g. "handmade,cotton,rug").
function KeywordsInput({ value, onChange, placeholder, small }) {
    const [draft, setDraft] = useState('');

    const keywords = (value || '')
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

    function commit(rawValue) {
        const keyword = rawValue.trim();
        setDraft('');
        if (!keyword) return;
        if (keywords.some((k) => k.toLowerCase() === keyword.toLowerCase())) return;
        onChange([...keywords, keyword].join(','));
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commit(draft);
        } else if (e.key === 'Backspace' && draft === '' && keywords.length > 0) {
            // Convenience: backspacing on an empty box edits the last chip
            // instead of silently doing nothing.
            const last = keywords[keywords.length - 1];
            onChange(keywords.slice(0, -1).join(','));
            setDraft(last);
        }
    }

    // Clicking a chip's "x" removes it from the saved list and drops its
    // text back into the box (replacing whatever was being typed), so it's
    // easy to fix a typo instead of retyping the whole keyword.
    function handleRemove(index) {
        const removed = keywords[index];
        onChange(keywords.filter((_, i) => i !== index).join(','));
        setDraft(removed);
    }

    return (
        <div>
            <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => commit(draft)}
                placeholder={placeholder}
                className={small ? smallInputClass : inputClass}
            />
            {keywords.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {keywords.map((keyword, i) => (
                        <span
                            key={`${keyword}-${i}`}
                            className="inline-flex items-center gap-1 rounded-full bg-stone-100 py-1 pl-2.5 pr-1.5 text-xs font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300"
                        >
                            {keyword}
                            <button
                                type="button"
                                onClick={() => handleRemove(i)}
                                title={`Remove "${keyword}"`}
                                aria-label={`Remove ${keyword}`}
                                className="rounded-full p-0.5 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-stone-500 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                            >
                                <X size={11} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

// Bulk-create products from a folder of images. If the Group already exists
// (has other products), these get added to it; if it doesn't exist yet,
// it's created simply by these products carrying that group value — group
// isn't a separate table, it's just a shared field.
//
// Category & Group are always one value for the whole batch.
// Price, Description, and Keywords each have a "same for all" vs "edit
// separately" toggle.
// Returnable is also whole-batch — a per-item override can be added later.
function BulkUploadForm({ onDone, onCancel }) {
    const [items, setItems] = useState([]); // [{ file, name, slug, price, description, keywords }]

    const [category, setCategory] = useState('');
    const [group, setGroup] = useState('');
    const [isReturnable, setIsReturnable] = useState(false);

    const [priceMode, setPriceMode] = useState('same'); // 'same' | 'separate'
    const [sharedPrice, setSharedPrice] = useState('');

    const [descriptionMode, setDescriptionMode] = useState('same'); // 'same' | 'separate'
    const [templateName, setTemplateName] = useState('');
    const [templateDescription, setTemplateDescription] = useState('');

    const [keywordsMode, setKeywordsMode] = useState('same'); // 'same' | 'separate'
    const [sharedKeywords, setSharedKeywords] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [progress, setProgress] = useState('');
    const [submitError, setSubmitError] = useState('');

    function handleFolderSelect(e) {
        const files = Array.from(e.target.files || []).filter((f) =>
            f.type.startsWith('image/')
        );

        const newItems = files.map((file) => {
            const name = nameFromFilename(file.name);
            return {
                file,
                name,
                slug: slugify(name),
                price: '',
                description: '',
                keywords: '',
            };
        });

        setItems(newItems);
    }

    function updateItem(index, field, value) {
        setItems((prev) =>
            prev.map((item, i) => {
                if (i !== index) return item;
                const updated = { ...item, [field]: value };
                if (field === 'name') {
                    updated.slug = slugify(value);
                }
                return updated;
            })
        );
    }

    function removeItem(index) {
        setItems((prev) => prev.filter((_, i) => i !== index));
    }

    // Parses "Uploading images (3/10)..." into a 0–100 number so the
    // progress bar can be determinate during the upload phase.
    const progressMatch = progress.match(/\((\d+)\/(\d+)\)/);
    const progressPct = progressMatch
        ? Math.round((Number(progressMatch[1]) / Number(progressMatch[2])) * 100)
        : null;

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitError('');

        if (items.length === 0) {
            setSubmitError('Pick a folder of images first.');
            return;
        }
        if (!category.trim() || !group.trim()) {
            setSubmitError('Category and Group are required for the whole batch.');
            return;
        }
        if (priceMode === 'same' && sharedPrice === '') {
            setSubmitError('Enter a shared price, or switch Price to "Edit separately".');
            return;
        }
        if (priceMode === 'separate' && items.some((it) => it.price === '')) {
            setSubmitError('Every product needs a price in "Edit separately" mode.');
            return;
        }

        setSubmitting(true);

        try {
            // 1. Make sure every slug in this batch is unique against the
            // table AND against each other, in filename order.
            const existingSlugs = await service.getAllSlugs();
            const usedSlugs = new Set(existingSlugs);
            const finalItems = items.map((item) => {
                const uniqueSlug = makeSlugUnique(item.slug || slugify(item.name), usedSlugs);
                usedSlugs.add(uniqueSlug);
                return { ...item, slug: uniqueSlug };
            });

            // 2. Upload all images first.
            setProgress(`Uploading images (0/${finalItems.length})...`);
            const uploaded = [];
            for (let i = 0; i < finalItems.length; i++) {
                const result = await service.uploadImage({ file: finalItems[i].file });
                if (!result) {
                    throw new Error(`Failed to upload image for "${finalItems[i].name}".`);
                }
                uploaded.push(result['$id']);
                setProgress(`Uploading images (${i + 1}/${finalItems.length})...`);
            }

            // 3. Build the row data for each product.
            const rows = finalItems.map((item, i) => {
                const price = priceMode === 'same' ? Number(sharedPrice) : Number(item.price);
                const description =
                    descriptionMode === 'same'
                        ? buildDescriptionFromTemplate(templateDescription, templateName, item.name)
                        : item.description;
                const keywords = keywordsMode === 'same' ? sharedKeywords : item.keywords;

                return {
                    name: item.name,
                    slug: item.slug,
                    description,
                    price,
                    category: category.trim(),
                    group: group.trim(),
                    fileId: uploaded[i],
                    isReturnable,
                    keywords: keywords || '',
                };
            });

            // 4. Create all rows.
            setProgress('Saving products...');
            const created = await service.addProducts({ items: rows });
            if (!created) {
                throw new Error('Failed to save products.');
            }

            setProgress('');
            onDone();
        } catch (err) {
            console.error(err);
            setSubmitError(err.message || 'Something went wrong during bulk upload.');
            setProgress('');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="mb-6 space-y-5 rounded-lg border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900"
        >
            <div>
                <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Create Group From Folder</h2>
                <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
                    Every image in the folder becomes one product, named after its file.
                </p>
            </div>

            {submitError && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
                    {submitError}
                </p>
            )}

            {submitting && (
                <div className="space-y-1.5 rounded-md border border-brand-200 bg-brand-50 px-3 py-2.5 dark:border-brand-500/30 dark:bg-brand-500/10">
                    <p className="text-sm font-medium text-brand-800 dark:text-brand-300">{progress}</p>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-100 dark:bg-brand-500/20">
                        <div
                            className={`h-full rounded-full bg-brand-600 dark:bg-brand-500 ${
                                progressPct === null ? 'w-1/3 animate-pulse' : 'transition-all duration-300 ease-out'
                            }`}
                            style={progressPct !== null ? { width: `${progressPct}%` } : undefined}
                        />
                    </div>
                </div>
            )}

            <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-900 dark:text-stone-100">Image Folder</label>
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/50 dark:border-stone-700 dark:bg-stone-800/50 dark:hover:border-brand-500 dark:hover:bg-brand-500/5">
                    <FolderUp size={26} className="text-stone-400 dark:text-stone-500" />
                    <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
                        {items.length > 0 ? `${items.length} image(s) selected` : 'Click to choose a folder'}
                    </span>
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                        Each image becomes one product — the product name comes from its file name.
                    </span>
                    <input
                        type="file"
                        webkitdirectory="true"
                        directory="true"
                        multiple
                        onChange={handleFolderSelect}
                        className="hidden"
                    />
                </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-stone-900 dark:text-stone-100">
                        <Tag size={13} className="text-stone-400 dark:text-stone-500" /> Category (whole batch)
                    </label>
                    <input
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                    />
                </div>
                <div>
                    <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-stone-900 dark:text-stone-100">
                        <Layers size={13} className="text-stone-400 dark:text-stone-500" /> Group (whole batch)
                    </label>
                    <input
                        value={group}
                        onChange={(e) => setGroup(e.target.value)}
                        className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                    />
                    <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                        If this group already has products, these get added to it. If not, it's created.
                    </p>
                </div>
            </div>

            {/* Returnable — whole batch */}
            <div className="flex items-center justify-between gap-4 rounded-md border border-stone-200 bg-stone-50 px-4 py-3 dark:border-stone-800 dark:bg-stone-800/40">
                <div className="flex items-start gap-2.5">
                    <RotateCcw size={16} className="mt-0.5 shrink-0 text-stone-400 dark:text-stone-500" />
                    <div>
                        <label htmlFor="bulk-isReturnable" className="block text-sm font-medium text-stone-900 dark:text-stone-100">
                            Returnable (whole batch)
                        </label>
                        <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                            Applies to every product created in this batch. You can change it per-product later from Edit.
                        </p>
                    </div>
                </div>
                <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                    <input
                        id="bulk-isReturnable"
                        type="checkbox"
                        className="peer sr-only"
                        checked={isReturnable}
                        onChange={(e) => setIsReturnable(e.target.checked)}
                    />
                    <div className="h-6 w-11 rounded-full bg-stone-200 transition-colors peer-checked:bg-brand-600 peer-focus:ring-2 peer-focus:ring-brand-200 dark:bg-stone-700 dark:peer-checked:bg-brand-500 dark:peer-focus:ring-brand-500/30" />
                    <div className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
                </label>
            </div>

            {/* Price */}
            <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <label className="text-sm font-medium text-stone-900 dark:text-stone-100">Price</label>
                    <SegmentedControl
                        name="Price mode"
                        options={PRICE_MODE_OPTIONS}
                        value={priceMode}
                        onChange={setPriceMode}
                    />
                </div>
                {priceMode === 'same' && (
                    <input
                        type="number"
                        step="0.01"
                        value={sharedPrice}
                        onChange={(e) => setSharedPrice(e.target.value)}
                        className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                        placeholder="Price applied to every product"
                    />
                )}
            </div>

            {/* Description */}
            <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <label className="text-sm font-medium text-stone-900 dark:text-stone-100">Description</label>
                    <SegmentedControl
                        name="Description mode"
                        options={DESCRIPTION_MODE_OPTIONS}
                        value={descriptionMode}
                        onChange={setDescriptionMode}
                    />
                </div>
                {descriptionMode === 'same' && (
                    <div className="space-y-2">
                        <input
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            placeholder="Template name (e.g. 'Sample Product') — this text gets swapped for each product's real name"
                            className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                        />
                        <textarea
                            value={templateDescription}
                            onChange={(e) => setTemplateDescription(e.target.value)}
                            rows={3}
                            placeholder="e.g. 'The Sample Product is handcrafted with care.'"
                            className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                        />
                        <p className="text-xs text-stone-500 dark:text-stone-400">
                            Every occurrence of the template name above (any case) will be replaced with
                            each product's own name in its saved description.
                        </p>
                    </div>
                )}
            </div>

            {/* Keywords */}
            <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-stone-900 dark:text-stone-100">
                        <Hash size={13} className="text-stone-400 dark:text-stone-500" /> Keywords
                    </label>
                    <SegmentedControl
                        name="Keywords mode"
                        options={KEYWORDS_MODE_OPTIONS}
                        value={keywordsMode}
                        onChange={setKeywordsMode}
                    />
                </div>
                {keywordsMode === 'same' && (
                    <>
                        <KeywordsInput
                            value={sharedKeywords}
                            onChange={setSharedKeywords}
                            placeholder="Type a keyword, then press Enter or , (applied to every product)"
                        />
                        <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
                            Press Enter or "," to add a keyword. Saved as a single comma-separated list.
                        </p>
                    </>
                )}
            </div>

            {/* Per-item preview / editing */}
            {items.length > 0 && (
                <div>
                    <p className="mb-2 text-sm text-stone-500 dark:text-stone-400">{items.length} image(s) selected</p>
                    <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                        {items.map((item, i) => (
                            <div
                                key={i}
                                className="space-y-1.5 rounded-md border border-stone-200 p-3 dark:border-stone-800"
                            >
                                <div className="flex items-center gap-2">
                                    <input
                                        value={item.name}
                                        onChange={(e) => updateItem(i, 'name', e.target.value)}
                                        className="flex-1 rounded-md border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-900 focus:border-brand-600 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-brand-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeItem(i)}
                                        title="Remove"
                                        aria-label={`Remove ${item.name}`}
                                        className="shrink-0 rounded-md p-1.5 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-stone-500 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                                    >
                                        <X size={15} />
                                    </button>
                                </div>
                                <p className="text-xs text-stone-500 dark:text-stone-400">
                                    slug: {category.trim() || 'category'}/{group.trim() || 'group'}/{item.slug}
                                </p>

                                {priceMode === 'separate' && (
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={item.price}
                                        onChange={(e) => updateItem(i, 'price', e.target.value)}
                                        placeholder="Price"
                                        className="w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500"
                                    />
                                )}

                                {descriptionMode === 'separate' && (
                                    <textarea
                                        value={item.description}
                                        onChange={(e) => updateItem(i, 'description', e.target.value)}
                                        rows={2}
                                        placeholder="Description"
                                        className="w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500"
                                    />
                                )}

                                {keywordsMode === 'separate' && (
                                    <KeywordsInput
                                        value={item.keywords}
                                        onChange={(value) => updateItem(i, 'keywords', value)}
                                        placeholder="Keywords for this product"
                                        small
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex gap-2 pt-2">
                <button
                    type="submit"
                    disabled={submitting || items.length === 0}
                    className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-500 dark:hover:bg-brand-600"
                >
                    <PackagePlus size={16} />
                    {submitting ? 'Creating...' : `Create ${items.length || ''} Product(s)`}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-md bg-stone-100 px-4 py-2 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}

export default BulkUploadForm;