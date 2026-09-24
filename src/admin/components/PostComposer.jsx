import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { PLATFORM_CONFIG } from '../config/platformConfig';
import { slugifyForTag, dedupeKeywords } from '../../../utils/socialMedia/parseKeywords';
import { groupKeyFor } from '../hooks/useGroupContentMap';
import { ImageMultiSelect } from './ImageMultiSelect';
import { Panel } from './Panel';

function formatPrice(n) {
    if (typeof n !== 'number') return '';
    return `Rs. ${n.toLocaleString()}`;
}

// Builds the auto-fill baseline for whatever is currently selected. This is
// the piece that implements "products sharing the same category+group share
// the same post content" — selecting a group pulls the merged entry instead
// of a single product's fields.
function buildBaseline(selection, groupContentMap) {
    if (!selection) return null;

    if (selection.type === 'product') {
        const p = selection.item;
        const tagSeed = dedupeKeywords([
            ...(p.keywords || []),
            slugifyForTag(p.category),
            slugifyForTag(p.group),
        ]).filter(Boolean);
        return {
            scopeLabel: p.name,
            scopeNote: null,
            title: p.name,
            description: `${p.description || ''}${p.price ? ` — ${formatPrice(p.price)}` : ''}`.trim(),
            tagSeed,
            products: [p],
        };
    }

    if (selection.type === 'group') {
        const key = `${selection.item.category}::${selection.item.name}`;
        const entry = groupContentMap.get(key);
        if (!entry) return null;
        const tagSeed = dedupeKeywords([
            ...entry.mergedKeywords,
            slugifyForTag(entry.category),
            slugifyForTag(entry.group),
        ]).filter(Boolean);
        const priceLine =
            entry.priceRange.min === entry.priceRange.max
                ? formatPrice(entry.priceRange.min)
                : `${formatPrice(entry.priceRange.min)} – ${formatPrice(entry.priceRange.max)}`;
        return {
            scopeLabel: entry.group,
            scopeNote: `This post will represent all ${entry.productCount} product${entry.productCount === 1 ? '' : 's'} in ${entry.group}.`,
            title: entry.group,
            description: `${entry.sampleDescription || ''} ${priceLine}`.trim(),
            tagSeed,
            products: entry.products,
        };
    }

    // Categories are too broad for a single post — the admin should pick a
    // group under it from the search bar instead.
    return null;
}

// Trims a hashtag/keyword list down to `limit`, keeping category/group tags
// (the last two entries added by buildBaseline) before trimming keyword tags.
function trimToLimit(tags, limit) {
    if (!limit || tags.length <= limit) return tags;
    return tags.slice(0, limit);
}

export function PostComposer({ platform, selection, groupContentMap, onSave }) {
    const config = PLATFORM_CONFIG[platform];
    const baseline = useMemo(() => buildBaseline(selection, groupContentMap), [selection, groupContentMap]);

    const [content, setContent] = useState(null);
    const [imageSelections, setImageSelections] = useState({});
    const [savedMessage, setSavedMessage] = useState('');

    // Reset the editable content whenever the underlying selection or
    // platform changes — manual edits are only preserved within one
    // selection/platform pairing, not across a new pick.
    useEffect(() => {
        if (!baseline) {
            setContent(null);
            return;
        }
        setContent({
            title: baseline.title,
            caption: baseline.description,
            description: baseline.description,
            hashtags: trimToLimit(baseline.tagSeed, config.hashtagLimit),
            tags: trimToLimit(baseline.tagSeed, null),
        });
        setSavedMessage('');
    }, [baseline, platform]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!selection) {
        return (
            <Panel title={`${config.label} post`}>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                    Search for a product or a group above to start a post.
                </p>
            </Panel>
        );
    }

    if (selection.type === 'category') {
        return (
            <Panel title={`${config.label} post`}>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                    "{selection.item.name}" is a category, not a single line — search for one of its groups to
                    generate a post for it.
                </p>
            </Panel>
        );
    }

    if (!content) return null;

    function updateField(field, value) {
        setContent((prev) => ({ ...prev, [field]: value }));
        setSavedMessage('');
    }

    function updateTagText(field, text) {
        const list = text
            .split(/[\s,]+/)
            .map((t) => t.replace(/^#/, '').trim())
            .filter(Boolean);
        updateField(field, list);
    }

    function regenerateHashtags() {
        const merged = dedupeKeywords([...baseline.tagSeed, ...content.hashtags]);
        updateField('hashtags', trimToLimit(merged, config.hashtagLimit));
    }

    function handleSave(status) {
        onSave?.(platform, { ...content, selectionLabel: baseline.scopeLabel }, status);
        setSavedMessage(status === 'starred' ? 'Saved and starred.' : 'Saved as draft.');
    }

    const captionLength = (content.caption || '').length;
    const overCaptionLimit = config.captionLimit && captionLength > config.captionLimit;
    const titleLength = (content.title || '').length;
    const overTitleLimit = config.titleLimit && titleLength > config.titleLimit;
    const tagCharCount = (content.tags || []).join('').length;
    const overTagCharLimit = config.tagCharLimit && tagCharCount > config.tagCharLimit;

    return (
        <Panel
            title={`${config.label} post`}
            subtitle={baseline.scopeNote || `Editing content for ${baseline.scopeLabel}`}
        >
            <div className="space-y-4">
                {config.fields.includes('title') && (
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-stone-900 dark:text-stone-100">
                            Title
                        </label>
                        <input
                            type="text"
                            value={content.title}
                            onChange={(e) => updateField('title', e.target.value)}
                            className="w-full rounded-md border border-stone-200 bg-cream px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                        />
                        <p className={`mt-1 text-xs ${overTitleLimit ? 'text-red-600 dark:text-red-400' : 'text-stone-500 dark:text-stone-400'}`}>
                            {titleLength} / {config.titleLimit}
                        </p>
                    </div>
                )}

                {(config.fields.includes('caption') || config.fields.includes('description')) && (
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-stone-900 dark:text-stone-100">
                            {config.fields.includes('description') ? 'Description' : 'Caption'}
                        </label>
                        <textarea
                            rows={5}
                            value={config.fields.includes('description') ? content.description : content.caption}
                            onChange={(e) =>
                                updateField(config.fields.includes('description') ? 'description' : 'caption', e.target.value)
                            }
                            className="w-full rounded-md border border-stone-200 bg-cream px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                        />
                        <p className={`mt-1 text-xs ${overCaptionLimit ? 'text-red-600 dark:text-red-400' : 'text-stone-500 dark:text-stone-400'}`}>
                            {captionLength} / {config.captionLimit ?? config.descriptionLimit}
                        </p>
                    </div>
                )}

                {config.fields.includes('hashtags') && (
                    <div>
                        <div className="mb-1.5 flex items-center justify-between">
                            <label className="block text-sm font-medium text-stone-900 dark:text-stone-100">
                                Hashtags
                            </label>
                            <button
                                type="button"
                                onClick={regenerateHashtags}
                                title="Regenerate hashtags from keywords"
                                aria-label="Regenerate hashtags from keywords"
                                className="flex items-center gap-1 rounded-md p-1 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50 dark:text-brand-500 dark:hover:bg-brand-500/15"
                            >
                                <RefreshCw size={13} />
                                Regenerate
                            </button>
                        </div>
                        <textarea
                            rows={2}
                            value={content.hashtags.map((h) => `#${h}`).join(' ')}
                            onChange={(e) => updateTagText('hashtags', e.target.value)}
                            className="w-full rounded-md border border-stone-200 bg-cream px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                        />
                        <p
                            className={`mt-1 text-xs ${
                                config.hashtagLimit && content.hashtags.length > config.hashtagLimit
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-stone-500 dark:text-stone-400'
                            }`}
                        >
                            {content.hashtags.length} / {config.hashtagLimit ?? '∞'} hashtags
                        </p>
                    </div>
                )}

                {config.fields.includes('tags') && (
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-stone-900 dark:text-stone-100">
                            Tags
                        </label>
                        <textarea
                            rows={2}
                            value={content.tags.join(', ')}
                            onChange={(e) => updateTagText('tags', e.target.value)}
                            placeholder="comma-separated tags"
                            className="w-full rounded-md border border-stone-200 bg-cream px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                        />
                        <p className={`mt-1 text-xs ${overTagCharLimit ? 'text-red-600 dark:text-red-400' : 'text-stone-500 dark:text-stone-400'}`}>
                            {tagCharCount} / {config.tagCharLimit} characters
                        </p>
                    </div>
                )}

                <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-900 dark:text-stone-100">
                        Images
                    </label>
                    <div className="space-y-4">
                        {baseline.products.slice(0, 4).map((p) => (
                            <div key={p['$id']}>
                                <p className="mb-1.5 text-xs font-medium text-stone-500 dark:text-stone-400">{p.name}</p>
                                <ImageMultiSelect
                                    product={p}
                                    selectedIds={imageSelections[p['$id']] || []}
                                    onChange={(ids) => setImageSelections((prev) => ({ ...prev, [p['$id']]: ids }))}
                                />
                            </div>
                        ))}
                        {baseline.products.length > 4 && (
                            <p className="text-xs text-stone-500 dark:text-stone-400">
                                +{baseline.products.length - 4} more product{baseline.products.length - 4 === 1 ? '' : 's'} in this group.
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-stone-100 pt-4 dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => handleSave('draft')}
                            className="rounded-md bg-stone-100 px-4 py-2 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
                        >
                            Save as Draft
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSave('starred')}
                            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
                        >
                            Save & Star
                        </button>
                    </div>
                    {savedMessage && (
                        <p className="flex items-center gap-1.5 rounded-md bg-brand-50 px-3 py-1.5 text-sm text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                            <CheckCircle2 size={14} />
                            {savedMessage}
                        </p>
                    )}
                </div>
            </div>
        </Panel>
    );
}

export default PostComposer;