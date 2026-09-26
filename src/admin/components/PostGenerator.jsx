import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Copy, Check, X, Search, Sparkles, Hash, Tags, Type, AlignLeft, Loader2 } from 'lucide-react';

// ⚠️ adjust these two import paths, and the `state.products.*` /
// `state.socialMedia.*` keys below, to match your actual store setup.
import { Select } from '../../ui';
import service from '../../backend/service'; // ⚠️ adjust path to match this file's depth relative to backend/
import {
    fetchCatalogCategories,
    fetchCatalogGroups,
    fetchCatalogPage,
} from '../../store/slices/productSlice';
import {
    generateSocialMediaPost,
    updateSocialMediaPost,
} from '../../store/slices/socialMediaSlice';

// ---------------------------------------------------------------------------
// Not every platform posts the same way — WhatsApp Status is just a short
// caption on an image/video (no title, no hashtags, no keyword list), while
// YouTube/TikTok/Instagram/Facebook all use the full set. Add a platform key
// here with its own flags if another one needs to differ too.
// ---------------------------------------------------------------------------
const DEFAULT_FIELDS = { title: true, description: true, hashtags: true, tags: true };
const PLATFORM_FIELDS = {
    whatsappstatus: { title: false, description: true, hashtags: false, tags: false },
};
const PLATFORM_LABELS = {
    whatsappstatus: { description: 'Status Caption' },
};
function fieldsFor(platform) {
    return PLATFORM_FIELDS[platform] || DEFAULT_FIELDS;
}
function labelFor(platform, field, fallback) {
    return PLATFORM_LABELS[platform]?.[field] || fallback;
}

// ---------------------------------------------------------------------------
// ASSUMPTION: products only have name / description / price / category /
// group — no dedicated hashtag or keyword columns — so title/description/
// hashtags/keywords are all *derived* from those fields below, then left
// fully editable. If your product rows actually DO have their own
// `hashtags` / `keywords` columns, replace deriveKeywords/deriveHashtags
// with a simple `products.flatMap(p => p.hashtags || [])` instead.
// ---------------------------------------------------------------------------

function escapeHtml(str = '') {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function slugWord(w) {
    return w.replace(/[^a-zA-Z0-9]/g, '');
}

function deriveKeywords(products) {
    const words = new Set();
    products.forEach((p) => {
        [p.name, p.category, p.group].filter(Boolean).forEach((field) => {
            String(field)
                .split(/\s+/)
                .forEach((w) => {
                    const clean = slugWord(w).toLowerCase();
                    if (clean.length > 2) words.add(clean);
                });
        });
    });
    return Array.from(words).slice(0, 20);
}

function buildTitle(products) {
    if (products.length === 0) return '';
    if (products.length === 1) return products[0].name || '';
    const names = products.slice(0, 3).map((p) => p.name).filter(Boolean);
    const extra = products.length - names.length;
    return `${names.join(', ')}${extra > 0 ? ` +${extra} more` : ''}`;
}

function buildDescription(products) {
    return products
        .map((p) => {
            const price = p.price != null ? ` — Rs. ${p.price}` : '';
            const desc = p.description ? `\n  ${p.description}` : '';
            return `• ${p.name || 'Untitled product'}${price}${desc}`;
        })
        .join('\n\n');
}

// Matches ProductList.jsx's pattern exactly: a product's image lives at
// `p.fileId`, resolved to a real URL via service.getImagePreview.
export function productThumbnail(product) {
    if (product.fileId) return service.getImagePreview({ fileId: product.fileId });
    const initials = (product.name || '?').trim().slice(0, 2).toUpperCase();
    return `data:image/svg+xml;utf8,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#d6d3d1"/><text x="16" y="21" font-size="12" text-anchor="middle" fill="#57534e" font-family="sans-serif">${initials}</text></svg>`
    )}`;
}

async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

// Reverses handleSave's HTML back into { title, description, hashtags, tags }
// so a saved post can be re-opened for editing. Exported so the Saved tab
// can use it too, for the list preview snippets.
export function parsePostDataHtml(html = '') {
    if (!html || typeof window === 'undefined') {
        return { title: '', description: '', hashtags: [], tags: [] };
    }
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const title = doc.querySelector('h2')?.textContent?.trim() || '';
    const descEl = doc.querySelector('p:not(.hashtags):not(.tags)');
    const description = descEl
        ? descEl.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim()
        : '';
    const hashtagsText = doc.querySelector('p.hashtags')?.textContent || '';
    const hashtags = hashtagsText.split(/\s+/).map((t) => t.replace(/^#/, '')).filter(Boolean);
    const tagsText = doc.querySelector('p.tags')?.textContent || '';
    const tags = tagsText.replace(/^Keywords:\s*/i, '').split(',').map((t) => t.trim()).filter(Boolean);
    return { title, description, hashtags, tags };
}

// ⚠️ Assumes a `service.getProduct({ rowId })` singular getter exists,
// mirroring `service.deleteProduct({ rowId })` seen in ProductList.jsx.
// Rename if your actual method is called something else.
export async function hydrateProducts(ids = []) {
    const rows = await Promise.all(
        ids.map((id) => service.getProduct({ rowId: id }).catch(() => false))
    );
    return rows.filter((r) => r && r['$id']);
}

// ---- small shared pieces --------------------------------------------------

function CopyButton({ getText, label = 'Copy' }) {
    const [copied, setCopied] = useState(false);
    async function handleCopy() {
        const ok = await copyText(getText());
        if (ok) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
    }
    return (
        <button
            type="button"
            onClick={handleCopy}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-stone-200 px-2 py-1 text-xs font-medium text-stone-500 transition-colors hover:border-stone-300 hover:text-stone-700 dark:border-stone-700 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:text-stone-200"
        >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : label}
        </button>
    );
}

// Editable chip list — used for both hashtags and keywords, just with a
// different `colorClass` / `prefix` so the two read as visually distinct.
function ChipEditor({ values, onChange, colorClass, prefix = '' }) {
    const [draft, setDraft] = useState('');
    function commit() {
        const clean = draft.trim().replace(/^#/, '');
        if (!clean) return;
        if (!values.includes(clean)) onChange([...values, clean]);
        setDraft('');
    }
    function removeAt(i) {
        onChange(values.filter((_, idx) => idx !== i));
    }
    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {values.map((v, i) => (
                <span
                    key={`${v}-${i}`}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${colorClass}`}
                >
                    {prefix}
                    {v}
                    <button type="button" onClick={() => removeAt(i)} className="opacity-60 hover:opacity-100">
                        <X size={11} />
                    </button>
                </span>
            ))}
            <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        commit();
                    }
                }}
                onBlur={commit}
                placeholder="Add + Enter"
                className="w-24 rounded-full border border-dashed border-stone-300 bg-transparent px-2 py-1 text-xs outline-none focus:border-brand-500 dark:border-stone-600 dark:text-stone-200"
            />
        </div>
    );
}

// WhatsApp-group-photo-style stack: small overlapping circular thumbnails.
function SelectedProductsStack({ products, onRemove, max = 8 }) {
    if (products.length === 0) {
        return <p className="text-xs text-stone-400 dark:text-stone-500">No products selected yet.</p>;
    }
    const shown = products.slice(0, max);
    const extra = products.length - shown.length;
    return (
        <div className="flex items-center">
            <div className="flex -space-x-3">
                {shown.map((p) => (
                    <div
                        key={p['$id']}
                        className="group relative h-8 w-8 shrink-0 rounded-full ring-2 ring-white dark:ring-stone-800"
                        title={p.name}
                    >
                        <img
                            src={productThumbnail(p)}
                            alt={p.name}
                            className="h-8 w-8 rounded-full object-cover"
                        />
                        <button
                            type="button"
                            onClick={() => onRemove(p['$id'])}
                            className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex"
                        >
                            <X size={9} />
                        </button>
                    </div>
                ))}
                {extra > 0 && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-200 text-[10px] font-semibold text-stone-600 ring-2 ring-white dark:bg-stone-700 dark:text-stone-300 dark:ring-stone-800">
                        +{extra}
                    </div>
                )}
            </div>
            <span className="ml-3 text-xs text-stone-500 dark:text-stone-400">{products.length} selected</span>
        </div>
    );
}


// ---- main component --------------------------------------------------------

// `onStartNew` (optional): called when the user clicks "Start New Instead"
// while editing a saved post. Lets the parent (AdminSocialMedia) forget the
// currently-opened saved post so re-visiting the tab doesn't reload it.
function PostGenerator({ platform, initialPost, onStartNew }) {
    const dispatch = useDispatch();

    // ⚠️ assumes the products slice is mounted at `state.products`
    const catalogCategories = useSelector((s) => s.products.catalogCategories.items);
    const catalogGroups = useSelector((s) => s.products.catalogGroups.items);
    const catalog = useSelector((s) => s.products.catalog);
    const filters = useSelector((s) => s.products.filters);

    const fields = fieldsFor(platform);

    const [mode, setMode] = useState('products'); // 'products' | 'category' | 'group'
    const [pickedCategory, setPickedCategory] = useState('');
    const [pickedGroup, setPickedGroup] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 24;

    const [selected, setSelected] = useState(new Map()); // id -> product row
    const [hydrating, setHydrating] = useState(false);

    const [editingPostId, setEditingPostId] = useState(initialPost?.postId || null);
    const [title, setTitle] = useState(initialPost?.title || '');
    const [description, setDescription] = useState(initialPost?.description || '');
    const [hashtags, setHashtags] = useState(initialPost?.hashtags || []);
    const [tags, setTags] = useState(initialPost?.tags || []);

    // Local, per-instance save feedback — kept out of redux so saving on one
    // platform tab can't leave a stale "Saved!" showing on another tab.
    const [saveState, setSaveState] = useState({ status: 'idle', error: null });

    const selectedList = useMemo(() => Array.from(selected.values()), [selected]);

    // Re-fetches the full product rows for a saved post's product IDs so the
    // avatar stack / regeneration have real data to work with, not just IDs.
    // Runs once — the parent remounts this component (via `key`) whenever a
    // different saved post is opened, so there's no need to watch for changes.
    useEffect(() => {
        if (!initialPost?.productIds?.length) return;
        setHydrating(true);
        hydrateProducts(initialPost.productIds)
            .then((rows) => setSelected(new Map(rows.map((r) => [r['$id'], r]))))
            .finally(() => setHydrating(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        dispatch(fetchCatalogCategories());
    }, [dispatch]);

    useEffect(() => {
        dispatch(fetchCatalogGroups({ category: pickedCategory || undefined }));
    }, [dispatch, pickedCategory]);

    // Browse/search products (Products mode only) — resets to page 1
    // whenever the search term or category/group filter changes.
    useEffect(() => {
        if (mode !== 'products') return;
        setPage(1);
        dispatch(
            fetchCatalogPage({
                page: 1,
                pageSize: PAGE_SIZE,
                filters: { ...filters, searchTerm: search, category: pickedCategory || null, group: pickedGroup || null },
            })
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, search, pickedCategory, pickedGroup]);

    function goToPage(nextPage) {
        setPage(nextPage);
        dispatch(
            fetchCatalogPage({
                page: nextPage,
                pageSize: PAGE_SIZE,
                filters: { ...filters, searchTerm: search, category: pickedCategory || null, group: pickedGroup || null },
            })
        );
    }

    function addProducts(rows) {
        setSelected((prev) => {
            const next = new Map(prev);
            rows.forEach((r) => next.set(r['$id'], r));
            return next;
        });
    }
    function toggleProduct(row) {
        setSelected((prev) => {
            const next = new Map(prev);
            if (next.has(row['$id'])) next.delete(row['$id']);
            else next.set(row['$id'], row);
            return next;
        });
    }
    function removeProduct(id) {
        setSelected((prev) => {
            const next = new Map(prev);
            next.delete(id);
            return next;
        });
    }
    function clearSelection() {
        setSelected(new Map());
    }

    async function useWholeCategory() {
        if (!pickedCategory) return;
        const info = catalogCategories.find((c) => c.name === pickedCategory);
        const count = info?.count || 200;
        const result = await dispatch(
            fetchCatalogPage({
                page: 1,
                pageSize: count,
                filters: { ...filters, category: pickedCategory, group: null, searchTerm: '', sortBy: 'random' },
            })
        ).unwrap();
        addProducts(result.rows);
    }

    async function useWholeGroup() {
        if (!pickedGroup) return;
        const info = catalogGroups.find((g) => g.name === pickedGroup);
        const count = info?.count || 200;
        const result = await dispatch(
            fetchCatalogPage({
                page: 1,
                pageSize: count,
                filters: { ...filters, category: pickedCategory || null, group: pickedGroup, searchTerm: '', sortBy: 'random' },
            })
        ).unwrap();
        addProducts(result.rows);
    }

    function handleGenerateContent() {
        setTitle(fields.title ? buildTitle(selectedList) : '');
        setDescription(fields.description ? buildDescription(selectedList) : '');
        const keywords = fields.hashtags || fields.tags ? deriveKeywords(selectedList) : [];
        setTags(fields.tags ? keywords : []);
        setHashtags(fields.hashtags ? keywords.slice(0, 12) : []);
    }

    function handleStartNew() {
        setEditingPostId(null);
        setTitle('');
        setDescription('');
        setHashtags([]);
        setTags([]);
        clearSelection();
        setSaveState({ status: 'idle', error: null });
        onStartNew?.(); // let the parent forget the currently-opened saved post
    }

    function combinedText() {
        return [
            fields.title ? title : '',
            fields.description ? description : '',
            fields.hashtags && hashtags.length ? hashtags.map((h) => `#${h}`).join(' ') : '',
            fields.tags && tags.length ? `Keywords: ${tags.join(', ')}` : '',
        ]
            .filter(Boolean)
            .join('\n\n');
    }

    async function handleSave() {
        const parts = [];
        if (fields.title && title) parts.push(`<h2>${escapeHtml(title)}</h2>`);
        if (fields.description && description) {
            parts.push(`<p>${escapeHtml(description).replace(/\n/g, '<br/>')}</p>`);
        }
        if (fields.hashtags && hashtags.length) {
            parts.push(`<p class="hashtags">${hashtags.map((h) => `#${escapeHtml(h)}`).join(' ')}</p>`);
        }
        if (fields.tags && tags.length) {
            parts.push(`<p class="tags">Keywords: ${tags.map((t) => escapeHtml(t)).join(', ')}</p>`);
        }
        const postDataHtml = parts.join('\n');
        const productIds = selectedList.map((p) => p['$id']);

        setSaveState({ status: 'loading', error: null });
        try {
            if (editingPostId) {
                await dispatch(
                    updateSocialMediaPost({ rowId: editingPostId, platform, postData: postDataHtml, products: productIds })
                ).unwrap();
            } else {
                await dispatch(
                    generateSocialMediaPost({ platform, postData: postDataHtml, products: productIds })
                ).unwrap();
            }
            setSaveState({ status: 'succeeded', error: null });
        } catch (err) {
            setSaveState({ status: 'failed', error: typeof err === 'string' ? err : 'Failed to save post.' });
        }
    }

    const categoryOptions = catalogCategories.map((c) => ({ value: c.name, label: `${c.name} · ${c.count}` }));
    const groupOptions = catalogGroups.map((g) => ({ value: g.name, label: `${g.name} · ${g.count}` }));
    const totalPages = Math.max(1, Math.ceil((catalog.total || 0) / PAGE_SIZE));

    return (
        <div className="space-y-6">
            {editingPostId && (
                <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-400">
                    Editing a saved post — saving will update it in place.
                    <button type="button" onClick={handleStartNew} className="font-semibold underline">
                        Start New Instead
                    </button>
                </div>
            )}

            {/* ---- Product source ---- */}
            <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-800">
                <div className="mb-3 flex flex-wrap gap-1.5">
                    {[
                        { key: 'products', label: 'Products' },
                        { key: 'category', label: 'By Category' },
                        { key: 'group', label: 'By Group' },
                    ].map((m) => (
                        <button
                            key={m.key}
                            type="button"
                            onClick={() => setMode(m.key)}
                            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                                mode === m.key
                                    ? 'border-brand-600 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-500/15 dark:text-brand-400'
                                    : 'border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700 dark:border-stone-700 dark:text-stone-400'
                            }`}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>

                {mode === 'products' && (
                    <>
                        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                            <div className="relative flex-1">
                                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search products…"
                                    className="w-full rounded-lg border border-stone-200 bg-transparent py-2 pl-8 pr-3 text-sm outline-none focus:border-brand-500 dark:border-stone-700 dark:text-stone-200"
                                />
                            </div>
                            <Select value={pickedCategory} onChange={setPickedCategory} options={categoryOptions} placeholder="All Categories" className="w-full sm:w-48" />
                            <Select value={pickedGroup} onChange={setPickedGroup} options={groupOptions} placeholder="All Groups" className="w-full sm:w-48" />
                        </div>

                        {catalog.status === 'loading' ? (
                            <p className="flex items-center gap-2 py-6 text-sm text-stone-500 dark:text-stone-400">
                                <Loader2 size={14} className="animate-spin" /> Loading products…
                            </p>
                        ) : (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
                                {catalog.items.map((p) => {
                                    const isSelected = selected.has(p['$id']);
                                    return (
                                        <button
                                            key={p['$id']}
                                            type="button"
                                            onClick={() => toggleProduct(p)}
                                            className={`relative flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-colors ${
                                                isSelected
                                                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                                                    : 'border-stone-200 hover:border-stone-300 dark:border-stone-700'
                                            }`}
                                        >
                                            {isSelected && (
                                                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-white">
                                                    <Check size={10} />
                                                </span>
                                            )}
                                            <img src={productThumbnail(p)} alt={p.name} className="h-12 w-12 rounded-md object-cover" />
                                            <span className="line-clamp-1 text-xs font-medium text-stone-700 dark:text-stone-200">{p.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="mt-3 flex items-center justify-center gap-3 text-xs text-stone-500 dark:text-stone-400">
                            <button disabled={page <= 1} onClick={() => goToPage(page - 1)} className="disabled:opacity-30">
                                Prev
                            </button>
                            Page {page} of {totalPages}
                            <button disabled={page >= totalPages} onClick={() => goToPage(page + 1)} className="disabled:opacity-30">
                                Next
                            </button>
                        </div>
                    </>
                )}

                {mode === 'category' && (
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Select value={pickedCategory} onChange={setPickedCategory} options={categoryOptions} placeholder="Choose a category" className="w-full sm:w-64" />
                        <button
                            type="button"
                            disabled={!pickedCategory}
                            onClick={useWholeCategory}
                            className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                        >
                            Add all products in this category
                        </button>
                    </div>
                )}

                {mode === 'group' && (
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Select value={pickedCategory} onChange={setPickedCategory} options={categoryOptions} placeholder="All Categories" className="w-full sm:w-48" />
                        <Select value={pickedGroup} onChange={setPickedGroup} options={groupOptions} placeholder="Choose a group" className="w-full sm:w-64" />
                        <button
                            type="button"
                            disabled={!pickedGroup}
                            onClick={useWholeGroup}
                            className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                        >
                            Add all products in this group
                        </button>
                    </div>
                )}
            </div>

            {/* ---- Selected products (WhatsApp-style stack) ---- */}
            <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-800">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Selected Products</h3>
                    {selectedList.length > 0 && (
                        <button type="button" onClick={clearSelection} className="text-xs font-medium text-red-500 hover:underline">
                            Clear all
                        </button>
                    )}
                </div>
                <SelectedProductsStack products={selectedList} onRemove={removeProduct} />
                {hydrating && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500">
                        <Loader2 size={12} className="animate-spin" /> Loading saved products…
                    </p>
                )}

                <button
                    type="button"
                    disabled={selectedList.length === 0}
                    onClick={handleGenerateContent}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-600 to-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
                >
                    <Sparkles size={15} />
                    Generate Content
                </button>
            </div>

            {/* ---- Editable / copyable content fields ---- */}
            <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-800">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Post Content</h3>
                    <CopyButton getText={combinedText} label="Copy All" />
                </div>

                <div className="space-y-4">
                    {fields.title && (
                        <div>
                            <div className="mb-1.5 flex items-center justify-between">
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 dark:text-stone-400">
                                    <Type size={13} /> {labelFor(platform, 'title', 'Title')}
                                </span>
                                <CopyButton getText={() => title} />
                            </div>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Generated title will appear here — fully editable"
                                className="w-full rounded-lg border border-stone-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-stone-700 dark:text-stone-200"
                            />
                        </div>
                    )}

                    {fields.description && (
                        <div>
                            <div className="mb-1.5 flex items-center justify-between">
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 dark:text-stone-400">
                                    <AlignLeft size={13} /> {labelFor(platform, 'description', 'Description')}
                                </span>
                                <CopyButton getText={() => description} />
                            </div>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={5}
                                placeholder="Generated description will appear here — fully editable"
                                className="w-full rounded-lg border border-stone-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-stone-700 dark:text-stone-200"
                            />
                        </div>
                    )}

                    {fields.hashtags && (
                        <div>
                            <div className="mb-1.5 flex items-center justify-between">
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 dark:text-stone-400">
                                    <Hash size={13} /> {labelFor(platform, 'hashtags', 'Hashtags')}
                                </span>
                                <CopyButton getText={() => hashtags.map((h) => `#${h}`).join(' ')} />
                            </div>
                            <ChipEditor
                                values={hashtags}
                                onChange={setHashtags}
                                prefix="#"
                                colorClass="bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400"
                            />
                        </div>
                    )}

                    {fields.tags && (
                        <div>
                            <div className="mb-1.5 flex items-center justify-between">
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 dark:text-stone-400">
                                    <Tags size={13} /> {labelFor(platform, 'tags', 'Keywords')}
                                </span>
                                <CopyButton getText={() => tags.join(', ')} />
                            </div>
                            <ChipEditor
                                values={tags}
                                onChange={setTags}
                                colorClass="bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300"
                            />
                        </div>
                    )}
                </div>

                <div className="mt-5 flex items-center gap-3 border-t border-stone-100 pt-4 dark:border-stone-700">
                    <button
                        type="button"
                        disabled={saveState.status === 'loading' || (fields.title ? !title : !description)}
                        onClick={handleSave}
                        className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                    >
                        {saveState.status === 'loading' && <Loader2 size={14} className="animate-spin" />}
                        {editingPostId ? 'Update Post' : 'Save Post'}
                    </button>
                    {saveState.status === 'succeeded' && (
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Saved!</span>
                    )}
                    {saveState.status === 'failed' && <span className="text-xs font-medium text-red-500">{saveState.error}</span>}
                </div>
            </div>
        </div>
    );
}

export default PostGenerator;