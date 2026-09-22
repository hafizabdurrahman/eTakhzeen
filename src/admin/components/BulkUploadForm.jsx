import React, { useEffect, useRef, useState } from 'react';
import {
    FolderUp, Tag, Layers, X, PackagePlus, RotateCcw, Hash, DollarSign,
    MapPin, Clock, Sparkles, FileText, FileUp, Download, Truck, ImageOff,
    CheckCircle2, AlertCircle,
} from 'lucide-react';
import service from '../../backend/service';
import { slugify, nameFromFilename, makeSlugUnique, buildDescriptionFromTemplate } from '../../utils/slug';
import {
    DESCRIPTION_FILE_NAME,
    FIELD_ALIASES,
    normalizeKey,
    parsePropertiesFile,
    toBool,
    toKeywordString,
    findDescriptionFile,
} from '../../utils/propertiesFile'; 
import { SegmentedControl, Combobox } from '../../ui';
import { customConfirm } from '../../ui/dialog';
import { UploadProgress } from '../';

const MODE_OPTIONS = [
    { value: 'same', label: 'Same for all' },
    { value: 'separate', label: 'Edit separately' },
];

const inputClass =
    'w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 transition-colors focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20';

const smallInputClass =
    'w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500';

const inputErrorClass =
    'border-red-300 focus:border-red-600 focus:ring-red-100 dark:border-red-500/40 dark:focus:border-red-500 dark:focus:ring-red-500/20';

// Strips the browser's default up/down spinner arrows from number inputs.
const noSpinnerClass =
    '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0';

const labelClass =
    'mb-1.5 flex items-center gap-1.5 text-sm font-medium text-stone-900 dark:text-stone-100';

const miniLabelClass =
    'mb-1 flex items-center gap-1 text-[11px] font-medium text-stone-500 dark:text-stone-400';

const iconClass = 'text-stone-400 dark:text-stone-500';

// Staggered fade-in for each item card in the preview list.
const ITEM_KEYFRAMES = `
@keyframes bulk-item-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
}
.bulk-item-anim { animation: bulk-item-in 0.35s ease-out both; }
@media (prefers-reduced-motion: reduce) {
    .bulk-item-anim { animation: none !important; }
}
`;

// Whole-batch values. Price, cost price, delivery price, description and
// keywords also have a "same for all" / "edit separately" mode (kept in
// their own state below).
const BATCH_DEFAULTS = {
    category: '',
    group: '',
    sellerLocation: '',
    deliveryDuration: '',
    isReturnable: false,
    featured: false,
    price: '',
    costPrice: '',
    deliveryPrice: '',
    description: '',
    templateName: '',
    keywords: '',
};

// These come from each image (or are generated per product), so a
// description file can't set them for the whole batch.
const NOT_USED_IN_BULK = {
    name: 'name (comes from each image file name)',
    slug: 'slug (generated per product)',
};

const SAMPLE_TEMPLATE = {
    category: 'Home Decor',
    group: 'Rugs',
    price: 4500.5,
    costPrice: 3000,
    deliveryPrice: 250,
    description: 'The Sample Product is handcrafted with care.',
    templateName: 'Sample Product',
    keywords: ['handmade', 'cotton', 'rug'],
    sellerLocation: 'Lahore, Punjab',
    deliveryDuration: '3-5 business days',
    isReturnable: true,
    featured: false,
};

// Category / Group combobox may hand back a value or an event — accept both.
const unwrap = (v) => (v && v.target ? v.target.value : v);

function FieldError({ message }) {
    if (!message) return null;
    return (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
            <AlertCircle size={11} /> {message}
        </p>
    );
}

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
    // text back into the box, so it's easy to fix a typo.
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

// Same switch-style toggle row the product form uses.
function ToggleRow({ id, icon: Icon, title, description, checked, onChange }) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-md border border-stone-200 bg-stone-50 px-4 py-3 dark:border-stone-800 dark:bg-stone-800/40">
            <div className="flex items-start gap-2.5">
                <Icon size={16} className={`mt-0.5 shrink-0 ${iconClass}`} />
                <div>
                    <label htmlFor={id} className="block text-sm font-medium text-stone-900 dark:text-stone-100">
                        {title}
                    </label>
                    <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{description}</p>
                </div>
            </div>
            <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                <input
                    id={id}
                    type="checkbox"
                    className="peer sr-only"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                />
                <div className="h-6 w-11 rounded-full bg-stone-300 transition-colors duration-200 ease-in-out peer-checked:bg-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-200 dark:bg-stone-700 dark:peer-checked:bg-brand-500 dark:peer-focus-visible:ring-brand-500/30" />
                <div className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out peer-checked:translate-x-5" />
            </label>
        </div>
    );
}

// Bulk-create products from a folder of images. If the Group already exists
// (has other products), these get added to it; if it doesn't exist yet,
// it's created simply by these products carrying that group value.
//
// It sends the same fields as the single product form: name, slug,
// description, price, costPrice, deliveryPrice, category, group, fileId,
// isReturnable, keywords, sellerLocation, deliveryDuration, featured.
//
// Name and slug come from each image. Everything else is set for the whole
// batch — price, cost price, delivery price, description and keywords can
// also be edited per product.
//
// Values can be filled from a properties file (JSON, or one "key: value" per
// line): put `description.txt` inside the image folder and it's picked up
// automatically, or use "Choose file" to pick one by hand.
//
// categories / groups are optional { name: count } maps, exactly like the
// product form receives, and power the suggestion dropdowns.
function BulkUploadForm({ categories, groups, onDone, onCancel }) {
    const propsFileRef = useRef(null);

    const [items, setItems] = useState([]); // [{ file, name, slug, price, costPrice, deliveryPrice, description, keywords }]

    const [batch, setBatch] = useState(BATCH_DEFAULTS);
    const [priceMode, setPriceMode] = useState('same'); // 'same' | 'separate'
    const [costPriceMode, setCostPriceMode] = useState('same');
    const [deliveryPriceMode, setDeliveryPriceMode] = useState('same');
    const [descriptionMode, setDescriptionMode] = useState('same');
    const [keywordsMode, setKeywordsMode] = useState('same');

    const [errors, setErrors] = useState({}); // field -> message
    const [submitting, setSubmitting] = useState(false);
    const [progress, setProgress] = useState('');
    const [submitError, setSubmitError] = useState('');

    // "Fill from file" state
    // fillReport: null or { found, fileName, filled, skipped, issues, otherFiles? }
    const [fillReport, setFillReport] = useState(null);
    // Which batch fields were last filled from a file, so they can be emptied
    // again when the file goes away. Values typed by hand are never touched.
    const [filledFields, setFilledFields] = useState([]);

    const categoryNames = Object.keys(categories || {});
    const groupNames = Object.keys(groups || {});

    // Object URLs for thumbnails — one per File, created lazily and revoked
    // once that file is no longer in `items` (removed) or on unmount.
    const previewCacheRef = useRef(new Map()); // File -> object URL

    function getPreviewUrl(file) {
        if (!file) return null;
        if (!previewCacheRef.current.has(file)) {
            previewCacheRef.current.set(file, URL.createObjectURL(file));
        }
        return previewCacheRef.current.get(file);
    }

    useEffect(() => {
        const activeFiles = new Set(items.map((it) => it.file));
        for (const [file, url] of previewCacheRef.current) {
            if (!activeFiles.has(file)) {
                URL.revokeObjectURL(url);
                previewCacheRef.current.delete(file);
            }
        }
    }, [items]);

    useEffect(() => {
        return () => {
            previewCacheRef.current.forEach((url) => URL.revokeObjectURL(url));
            previewCacheRef.current.clear();
        };
    }, []);

    function setField(field, value) {
        setBatch((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
    }

    // Empties every field that came from a file (or from the last file).
    function resetFilledFields() {
        setBatch((prev) => {
            const next = { ...prev };
            filledFields.forEach((f) => {
                next[f] = BATCH_DEFAULTS[f];
            });
            return next;
        });
        setFilledFields([]);
    }

    // ---------- Fill from file ----------

    // Parses a properties file and fills the batch fields. Nothing is touched
    // if the file can't be read.
    async function loadPropertiesFile(file, extra = {}) {
        try {
            const pairs = parsePropertiesFile(await file.text());
            const raw = {};
            const skipped = [];
            const issues = [];
            const filled = [];

            for (const [key, val] of pairs) {
                const field = FIELD_ALIASES[normalizeKey(key)];
                if (!field) {
                    if (!['key', 'property'].includes(normalizeKey(key))) skipped.push(key);
                } else if (NOT_USED_IN_BULK[field]) {
                    skipped.push(NOT_USED_IN_BULK[field]);
                } else {
                    raw[field] = val;
                }
            }

            const patch = {};
            const modes = {};
            const text = (v) => String(v ?? '').trim();

            // Plain text fields
            ['category', 'group', 'sellerLocation', 'deliveryDuration', 'description', 'templateName'].forEach((f) => {
                if (f in raw) {
                    patch[f] = text(raw[f]);
                    filled.push(f);
                }
            });
            if ('description' in raw || 'templateName' in raw) modes.description = 'same';

            // Numbers
            if ('price' in raw) {
                const n = Number(raw.price);
                if (text(raw.price) !== '' && Number.isFinite(n)) {
                    patch.price = String(n);
                    modes.price = 'same';
                    filled.push('price');
                } else issues.push(`price: "${raw.price}" is not a number`);
            }
            if ('costPrice' in raw) {
                const n = Number(raw.costPrice);
                if (text(raw.costPrice) !== '' && Number.isFinite(n)) {
                    patch.costPrice = String(Math.round(n));
                    modes.costPrice = 'same';
                    filled.push('costPrice');
                    if (!Number.isInteger(n)) issues.push(`costPrice: ${n} was rounded to ${Math.round(n)}`);
                } else issues.push(`costPrice: "${raw.costPrice}" is not a number`);
            }
            if ('deliveryPrice' in raw) {
                const n = Number(raw.deliveryPrice);
                if (text(raw.deliveryPrice) !== '' && Number.isFinite(n)) {
                    patch.deliveryPrice = String(Math.round(n));
                    modes.deliveryPrice = 'same';
                    filled.push('deliveryPrice');
                    if (!Number.isInteger(n)) issues.push(`deliveryPrice: ${n} was rounded to ${Math.round(n)}`);
                } else issues.push(`deliveryPrice: "${raw.deliveryPrice}" is not a number`);
            }

            // Booleans
            ['isReturnable', 'featured'].forEach((f) => {
                if (f in raw) {
                    const b = toBool(raw[f]);
                    if (b === null) issues.push(`${f}: "${raw[f]}" is not true/false`);
                    else {
                        patch[f] = b;
                        filled.push(f);
                    }
                }
            });

            // Keywords
            if ('keywords' in raw) {
                patch.keywords = toKeywordString(raw.keywords);
                modes.keywords = 'same';
                filled.push('keywords');
            }

            // The file is readable: clear whatever the previous file filled,
            // then apply this one.
            setBatch((prev) => {
                const next = { ...prev };
                filledFields.forEach((f) => {
                    next[f] = BATCH_DEFAULTS[f];
                });
                return { ...next, ...patch };
            });
            if (modes.price) setPriceMode(modes.price);
            if (modes.costPrice) setCostPriceMode(modes.costPrice);
            if (modes.deliveryPrice) setDeliveryPriceMode(modes.deliveryPrice);
            if (modes.description) setDescriptionMode(modes.description);
            if (modes.keywords) setKeywordsMode(modes.keywords);
            setErrors({});
            setFilledFields(filled);
            setFillReport({ found: true, fileName: file.name, filled, skipped, issues, ...extra });
        } catch (err) {
            console.error(err);
            // Unreadable file: leave the form untouched and show why.
            setFillReport({
                found: true,
                fileName: file.name,
                filled: [],
                skipped: [],
                issues: [err instanceof SyntaxError ? `Invalid JSON in ${file.name}.` : err.message || `Could not read ${file.name}.`],
                ...extra,
            });
        }
    }

    // "Choose file" button: pick a properties file by hand.
    async function handlePropertiesFile(e) {
        const file = e.target.files?.[0];
        e.target.value = ''; // lets the same file be picked again later
        if (!file) return; // picker cancelled -> nothing to do
        await loadPropertiesFile(file);
    }

    // "No file" state: drop the loaded file and empty the fields it filled.
    function handleRemovePropertiesFile() {
        if (propsFileRef.current) propsFileRef.current.value = '';
        resetFilledFields();
        setFillReport(null);
        setErrors({});
    }

    function downloadTemplate() {
        const blob = new Blob([JSON.stringify(SAMPLE_TEMPLATE, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = DESCRIPTION_FILE_NAME;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ---------- Folder ----------

    async function handleFolderSelect(e) {
        const allFiles = Array.from(e.target.files || []);
        e.target.value = ''; // lets the same folder be picked again later

        // No files (picker cancelled) -> nothing to do.
        if (allFiles.length === 0) return;

        // Images become products. The description file is not an image, so
        // it's automatically left out of this list.
        const images = allFiles.filter((f) => f.type.startsWith('image/'));

        setItems(
            images.map((file) => {
                const name = nameFromFilename(file.name);
                return {
                    file,
                    name,
                    slug: slugify(name),
                    price: '',
                    costPrice: '',
                    deliveryPrice: '',
                    description: '',
                    keywords: '',
                };
            })
        );

        // New folder -> anything left over from a previous file is emptied
        // first, so old values never leak into this batch.
        resetFilledFields();
        setErrors({});

        const descFile = findDescriptionFile(allFiles);

        // Folder has no description file -> stay empty, and list the non-image
        // files the browser actually received so a wrong name is easy to spot.
        if (!descFile) {
            const otherFiles = allFiles.filter((f) => !f.type.startsWith('image/')).map((f) => f.name);
            setFillReport({ found: false, fileName: '', filled: [], skipped: [], issues: [], otherFiles });
            return;
        }

        await loadPropertiesFile(descFile);
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

    // ---------- Submit ----------

    // Same rules as the single product form.
    function validate() {
        const e = {};
        if (!batch.category.trim()) e.category = 'Category is required';
        if (!batch.group.trim()) e.group = 'Group is required';
        if (!batch.sellerLocation.trim()) e.sellerLocation = 'Seller location is required';
        if (!batch.deliveryDuration.trim()) e.deliveryDuration = 'Delivery duration is required';

        if (priceMode === 'same') {
            if (batch.price === '') e.price = 'Price is required';
            else if (Number(batch.price) < 0) e.price = 'Price must be positive';
        }
        if (costPriceMode === 'same') {
            if (batch.costPrice === '') e.costPrice = 'Cost price is required';
            else if (Number(batch.costPrice) < 0) e.costPrice = 'Cost price must be positive';
            else if (!Number.isInteger(Number(batch.costPrice))) e.costPrice = 'Cost price must be a whole number';
        }
        if (deliveryPriceMode === 'same') {
            if (batch.deliveryPrice === '') e.deliveryPrice = 'Delivery price is required';
            else if (Number(batch.deliveryPrice) < 0) e.deliveryPrice = 'Delivery price must be positive';
            else if (!Number.isInteger(Number(batch.deliveryPrice))) e.deliveryPrice = 'Delivery price must be a whole number';
        }
        return e;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitError('');

        if (items.length === 0) {
            setSubmitError('Pick a folder of images first.');
            return;
        }

        const found = validate();
        setErrors(found);
        if (Object.keys(found).length > 0) {
            setSubmitError('Please fix the highlighted fields.');
            return;
        }

        if (priceMode === 'separate' && items.some((it) => it.price === '' || Number(it.price) < 0)) {
            setSubmitError('Every product needs a valid price in "Edit separately" mode.');
            return;
        }
        if (
            costPriceMode === 'separate' &&
            items.some((it) => it.costPrice === '' || Number(it.costPrice) < 0 || !Number.isInteger(Number(it.costPrice)))
        ) {
            setSubmitError('Every product needs a whole-number cost price in "Edit separately" mode.');
            return;
        }
        if (
            deliveryPriceMode === 'separate' &&
            items.some((it) => it.deliveryPrice === '' || Number(it.deliveryPrice) < 0 || !Number.isInteger(Number(it.deliveryPrice)))
        ) {
            setSubmitError('Every product needs a whole-number delivery price in "Edit separately" mode.');
            return;
        }

        const confirmed = await customConfirm({
            title: 'Create these products?',
            message: `This will upload ${items.length} image${items.length === 1 ? '' : 's'} and create ${items.length} product${
                items.length === 1 ? '' : 's'
            } in "${batch.category.trim()}" → "${batch.group.trim()}". Continue?`,
            confirmText: 'Create products',
            cancelText: 'Cancel',
        });
        if (!confirmed) return;

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

            // 3. Build the row data for each product — same shape as the
            // single product form sends.
            const rows = finalItems.map((item, i) => {
                const price = priceMode === 'same' ? parseInt(Number(batch.price)) : parseInt(Number(item.price));
                const costPrice = parseInt(costPriceMode === 'same' ? batch.costPrice : item.costPrice, 10);
                const deliveryPrice = parseInt(deliveryPriceMode === 'same' ? batch.deliveryPrice : item.deliveryPrice, 10);
                const description =
                    descriptionMode === 'same'
                        ? buildDescriptionFromTemplate(batch.description, batch.templateName, item.name)
                        : item.description;
                const keywords = keywordsMode === 'same' ? batch.keywords : item.keywords;

                return {
                    name: item.name,
                    slug: item.slug,
                    description,
                    price,
                    costPrice,
                    deliveryPrice,
                    category: batch.category.trim(),
                    group: batch.group.trim(),
                    fileId: uploaded[i],
                    isReturnable: Boolean(batch.isReturnable),
                    keywords: keywords || '',
                    sellerLocation: batch.sellerLocation.trim(),
                    deliveryDuration: parseInt(batch.deliveryDuration.trim()),
                    featured: Boolean(batch.featured),
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
            noValidate
            className="mb-6 space-y-6 rounded-lg border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-6"
        >
            <div>
                <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Create Group From Folder</h2>
                <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
                    Every image in the folder becomes one product, named after its file.
                </p>
            </div>

            {submitError && (
                <p className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    {submitError}
                </p>
            )}

            {submitting && (
                <UploadProgress progress={progress} progressPct={progressPct} />
            )}

            {/* ---- Image folder ---- */}
            <div>
                <label className={labelClass}>
                    <FolderUp size={13} className={iconClass} /> Image Folder
                </label>
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/50 dark:border-stone-700 dark:bg-stone-800/50 dark:hover:border-brand-500 dark:hover:bg-brand-500/5">
                    <FolderUp size={26} className={iconClass} />
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

            {/* ---- Fill from file ---- */}
            <div className="rounded-md border border-dashed border-stone-300 bg-stone-50 px-4 py-3 dark:border-stone-700 dark:bg-stone-800/40">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                        <FileUp size={16} className={`mt-0.5 shrink-0 ${iconClass}`} />
                        <div>
                            <p className="text-sm font-medium text-stone-900 dark:text-stone-100">Fill from file</p>
                            <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                                Put a <code className="font-mono">{DESCRIPTION_FILE_NAME}</code> in the image folder and it's picked up
                                automatically, or choose a .json / .txt / .csv file of property/value pairs.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={downloadTemplate}
                            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-200 dark:text-stone-300 dark:hover:bg-stone-700"
                        >
                            <Download size={13} /> Template
                        </button>
                        <button
                            type="button"
                            onClick={() => propsFileRef.current?.click()}
                            className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
                        >
                            <FileUp size={13} /> {fillReport?.found ? 'Change file' : 'Choose file'}
                        </button>
                        <input
                            ref={propsFileRef}
                            type="file"
                            accept=".json,.txt,.csv,application/json,text/plain,text/csv"
                            onChange={handlePropertiesFile}
                            className="hidden"
                        />
                    </div>
                </div>

                {fillReport?.found && (
                    <div className="mt-3 flex items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-xs dark:bg-stone-900">
                        <span className="flex min-w-0 items-center gap-1.5 text-stone-700 dark:text-stone-300">
                            <FileText size={12} className={`shrink-0 ${iconClass}`} />
                            <span className="truncate">{fillReport.fileName}</span>
                        </span>
                        <button
                            type="button"
                            onClick={handleRemovePropertiesFile}
                            title="Remove file and empty the fields it filled"
                            aria-label="Remove file and empty the fields it filled"
                            className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-medium text-stone-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-stone-400 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                        >
                            <X size={12} /> Remove
                        </button>
                    </div>
                )}

                {fillReport && (
                    <div className="mt-3 space-y-1 text-xs">
                        {!fillReport.found && (
                            <>
                                <p className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400">
                                    <FileText size={12} className="shrink-0" />
                                    No {DESCRIPTION_FILE_NAME} in this folder — fill the fields below manually.
                                </p>
                                {fillReport.otherFiles?.length > 0 && (
                                    <p className="text-stone-500 dark:text-stone-400">
                                        Other files found: {fillReport.otherFiles.join(', ')}
                                    </p>
                                )}
                            </>
                        )}
                        {fillReport.filled.length > 0 && (
                            <p className="flex items-start gap-1.5 text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 size={12} className="mt-0.5 shrink-0" />
                                Filled: {fillReport.filled.join(', ')}
                            </p>
                        )}
                        {fillReport.skipped.length > 0 && (
                            <p className="text-stone-500 dark:text-stone-400">
                                Ignored: {fillReport.skipped.join(', ')}
                            </p>
                        )}
                        {fillReport.issues.map((msg, i) => (
                            <p key={i} className="flex items-start gap-1.5 text-red-600 dark:text-red-400">
                                <AlertCircle size={12} className="mt-0.5 shrink-0" /> {msg}
                            </p>
                        ))}
                    </div>
                )}
            </div>

            <div className="border-t border-stone-100 dark:border-stone-800" />

            {/* ---- Category + Group ---- */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label className={labelClass}>
                        <Tag size={13} className={iconClass} /> Category (whole batch)
                    </label>
                    <Combobox
                        value={batch.category}
                        onChange={(v) => setField('category', unwrap(v))}
                        options={categoryNames}
                        placeholder="e.g. Home Decor"
                        error={!!errors.category}
                    />
                    <FieldError message={errors.category} />
                </div>
                <div>
                    <label className={labelClass}>
                        <Layers size={13} className={iconClass} /> Group (whole batch)
                    </label>
                    <Combobox
                        value={batch.group}
                        onChange={(v) => setField('group', unwrap(v))}
                        options={groupNames}
                        placeholder="e.g. Rugs"
                        error={!!errors.group}
                    />
                    <FieldError message={errors.group} />
                    <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                        If this group already has products, these get added to it. If not, it's created.
                    </p>
                </div>
            </div>

            {/* ---- Seller Location + Delivery Duration ---- */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label className={labelClass}>
                        <MapPin size={13} className={iconClass} /> Seller Location (whole batch)
                    </label>
                    <input
                        value={batch.sellerLocation}
                        onChange={(e) => setField('sellerLocation', e.target.value)}
                        placeholder="e.g. Lahore, Punjab"
                        className={`${inputClass} ${errors.sellerLocation ? inputErrorClass : ''}`}
                    />
                    <FieldError message={errors.sellerLocation} />
                </div>
                <div>
                    <label className={labelClass}>
                        <Clock size={13} className={iconClass} /> Delivery Duration (whole batch)
                    </label>
                    <input
                        value={batch.deliveryDuration}
                        onChange={(e) => setField('deliveryDuration', e.target.value)}
                        placeholder="e.g. 3-5 business days"
                        className={`${inputClass} ${errors.deliveryDuration ? inputErrorClass : ''}`}
                    />
                    <FieldError message={errors.deliveryDuration} />
                </div>
            </div>

            <div className="border-t border-stone-100 dark:border-stone-800" />

            {/* ---- Price ---- */}
            <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-stone-900 dark:text-stone-100">
                        <DollarSign size={13} className={iconClass} /> Price
                    </label>
                    <SegmentedControl name="Price mode" options={MODE_OPTIONS} value={priceMode} onChange={setPriceMode} />
                </div>
                {priceMode === 'same' && (
                    <>
                        <input
                            type="number"
                            step="0.01"
                            inputMode="decimal"
                            value={batch.price}
                            onChange={(e) => setField('price', e.target.value)}
                            placeholder="Price applied to every product"
                            className={`${inputClass} ${noSpinnerClass} ${errors.price ? inputErrorClass : ''}`}
                        />
                        <FieldError message={errors.price} />
                    </>
                )}
            </div>

            {/* ---- Cost Price ---- */}
            <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-stone-900 dark:text-stone-100">
                        <DollarSign size={13} className={iconClass} /> Cost Price
                    </label>
                    <SegmentedControl
                        name="Cost price mode"
                        options={MODE_OPTIONS}
                        value={costPriceMode}
                        onChange={setCostPriceMode}
                    />
                </div>
                {costPriceMode === 'same' && (
                    <>
                        <input
                            type="number"
                            step="1"
                            inputMode="numeric"
                            value={batch.costPrice}
                            onChange={(e) => setField('costPrice', e.target.value)}
                            placeholder="Whole-number cost applied to every product"
                            className={`${inputClass} ${noSpinnerClass} ${errors.costPrice ? inputErrorClass : ''}`}
                        />
                        <FieldError message={errors.costPrice} />
                    </>
                )}
            </div>

            {/* ---- Delivery Price ---- */}
            <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-stone-900 dark:text-stone-100">
                        <Truck size={13} className={iconClass} /> Delivery Price
                    </label>
                    <SegmentedControl
                        name="Delivery price mode"
                        options={MODE_OPTIONS}
                        value={deliveryPriceMode}
                        onChange={setDeliveryPriceMode}
                    />
                </div>
                {deliveryPriceMode === 'same' && (
                    <>
                        <input
                            type="number"
                            step="1"
                            inputMode="numeric"
                            value={batch.deliveryPrice}
                            onChange={(e) => setField('deliveryPrice', e.target.value)}
                            placeholder="Whole-number delivery price applied to every product"
                            className={`${inputClass} ${noSpinnerClass} ${errors.deliveryPrice ? inputErrorClass : ''}`}
                        />
                        <FieldError message={errors.deliveryPrice} />
                    </>
                )}
            </div>

            {/* ---- Description ---- */}
            <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-stone-900 dark:text-stone-100">
                        <FileText size={13} className={iconClass} /> Description
                    </label>
                    <SegmentedControl
                        name="Description mode"
                        options={MODE_OPTIONS}
                        value={descriptionMode}
                        onChange={setDescriptionMode}
                    />
                </div>
                {descriptionMode === 'same' && (
                    <div className="space-y-2">
                        <input
                            value={batch.templateName}
                            onChange={(e) => setField('templateName', e.target.value)}
                            placeholder="Template name (e.g. 'Sample Product') — this text gets swapped for each product's real name"
                            className={inputClass}
                        />
                        <textarea
                            value={batch.description}
                            onChange={(e) => setField('description', e.target.value)}
                            rows={3}
                            placeholder="e.g. 'The Sample Product is handcrafted with care.'"
                            className={`${inputClass} resize-none`}
                        />
                        <p className="text-xs text-stone-500 dark:text-stone-400">
                            Every occurrence of the template name above (any case) will be replaced with
                            each product's own name in its saved description.
                        </p>
                    </div>
                )}
            </div>

            {/* ---- Keywords ---- */}
            <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-stone-900 dark:text-stone-100">
                        <Hash size={13} className={iconClass} /> Keywords
                    </label>
                    <SegmentedControl
                        name="Keywords mode"
                        options={MODE_OPTIONS}
                        value={keywordsMode}
                        onChange={setKeywordsMode}
                    />
                </div>
                {keywordsMode === 'same' && (
                    <>
                        <KeywordsInput
                            value={batch.keywords}
                            onChange={(v) => setField('keywords', v)}
                            placeholder="Type a keyword, then press Enter or , (applied to every product)"
                        />
                        <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
                            Press Enter or "," to add a keyword. Saved as a single comma-separated list.
                        </p>
                    </>
                )}
            </div>

            <div className="border-t border-stone-100 dark:border-stone-800" />

            {/* ---- Returnable + Featured (whole batch) ---- */}
            <ToggleRow
                id="bulk-isReturnable"
                icon={RotateCcw}
                title="Returnable (whole batch)"
                description="Customers can request a return within 2 days of ordering. Applies to every product in this batch."
                checked={batch.isReturnable}
                onChange={(v) => setField('isReturnable', v)}
            />
            <ToggleRow
                id="bulk-featured"
                icon={Sparkles}
                title="Featured (whole batch)"
                description="Show these products in the Featured section on the storefront."
                checked={batch.featured}
                onChange={(v) => setField('featured', v)}
            />

            {/* ---- Per-item preview / editing ---- */}
            {items.length > 0 && (
                <div>
                    <p className="mb-2 text-sm text-stone-500 dark:text-stone-400">
                        {items.length} image{items.length === 1 ? '' : 's'} selected
                    </p>

                    <style>{ITEM_KEYFRAMES}</style>

                    <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
                        {items.map((item, i) => {
                            const previewUrl = getPreviewUrl(item.file);
                            return (
                                <div
                                    key={i}
                                    className="bulk-item-anim group rounded-lg border border-stone-200 bg-white p-3 shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-stone-800 dark:bg-stone-900 sm:p-4"
                                    style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Thumbnail */}
                                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800">
                                            {previewUrl ? (
                                                <img
                                                    src={previewUrl}
                                                    alt={item.name}
                                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                />
                                            ) : (
                                                <span className="flex h-full w-full items-center justify-center text-stone-400">
                                                    <ImageOff size={18} />
                                                </span>
                                            )}
                                        </div>

                                        {/* Name + slug + remove */}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    value={item.name}
                                                    onChange={(e) => updateItem(i, 'name', e.target.value)}
                                                    className="w-full flex-1 rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-sm font-medium text-stone-900 transition-colors focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
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
                                            <p className="mt-1 truncate font-mono text-xs text-stone-500 dark:text-stone-400">
                                                {batch.category.trim() || 'category'}/{batch.group.trim() || 'group'}/{item.slug}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Per-item price fields — only the ones set to "Edit separately" */}
                                    {(priceMode === 'separate' || costPriceMode === 'separate' || deliveryPriceMode === 'separate') && (
                                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                            {priceMode === 'separate' && (
                                                <div>
                                                    <label className={miniLabelClass}>
                                                        <DollarSign size={11} /> Price
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        inputMode="decimal"
                                                        value={item.price}
                                                        onChange={(e) => updateItem(i, 'price', e.target.value)}
                                                        placeholder="Price"
                                                        className={`${smallInputClass} ${noSpinnerClass}`}
                                                    />
                                                </div>
                                            )}
                                            {costPriceMode === 'separate' && (
                                                <div>
                                                    <label className={miniLabelClass}>
                                                        <DollarSign size={11} /> Cost price
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="1"
                                                        inputMode="numeric"
                                                        value={item.costPrice}
                                                        onChange={(e) => updateItem(i, 'costPrice', e.target.value)}
                                                        placeholder="Whole number"
                                                        className={`${smallInputClass} ${noSpinnerClass}`}
                                                    />
                                                </div>
                                            )}
                                            {deliveryPriceMode === 'separate' && (
                                                <div>
                                                    <label className={miniLabelClass}>
                                                        <Truck size={11} /> Delivery price
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="1"
                                                        inputMode="numeric"
                                                        value={item.deliveryPrice}
                                                        onChange={(e) => updateItem(i, 'deliveryPrice', e.target.value)}
                                                        placeholder="Whole number"
                                                        className={`${smallInputClass} ${noSpinnerClass}`}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {descriptionMode === 'separate' && (
                                        <div className="mt-3">
                                            <label className={miniLabelClass}>
                                                <FileText size={11} /> Description
                                            </label>
                                            <textarea
                                                value={item.description}
                                                onChange={(e) => updateItem(i, 'description', e.target.value)}
                                                rows={2}
                                                placeholder="Description"
                                                className={`${smallInputClass} resize-none`}
                                            />
                                        </div>
                                    )}

                                    {keywordsMode === 'separate' && (
                                        <div className="mt-3">
                                            <label className={miniLabelClass}>
                                                <Hash size={11} /> Keywords
                                            </label>
                                            <KeywordsInput
                                                value={item.keywords}
                                                onChange={(value) => updateItem(i, 'keywords', value)}
                                                placeholder="Keywords for this product"
                                                small
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                <button
                    type="submit"
                    disabled={submitting || items.length === 0}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-500 dark:hover:bg-brand-600 sm:w-auto"
                >
                    <PackagePlus size={16} />
                    {submitting ? 'Creating...' : `Create ${items.length || ''} Product(s)`}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-stone-100 px-4 py-2 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700 sm:w-auto"
                >
                    <X size={15} />
                    Cancel
                </button>
            </div>
        </form>
    );
}

export default BulkUploadForm;