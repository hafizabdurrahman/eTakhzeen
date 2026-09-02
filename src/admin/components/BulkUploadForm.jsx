import React, { useState } from 'react';
import service from '../../backend/service';
import { slugify, nameFromFilename, makeSlugUnique, buildDescriptionFromTemplate } from '../../utils/slug';

// Bulk-create products from a folder of images. If the Group already exists
// (has other products), these get added to it; if it doesn't exist yet,
// it's created simply by these products carrying that group value — group
// isn't a separate table, it's just a shared field.
//
// Category & Group are always one value for the whole batch.
// Price and Description each have a "same for all" vs "edit separately" toggle.
// In "same for all" description mode, the Template Name field's value is
// swapped out (case-insensitively) for each product's own name.
function BulkUploadForm({ onDone, onCancel }) {
    const [items, setItems] = useState([]); // [{ file, name, slug, price, description }]

    const [category, setCategory] = useState('');
    const [group, setGroup] = useState('');

    const [priceMode, setPriceMode] = useState('same'); // 'same' | 'separate'
    const [sharedPrice, setSharedPrice] = useState('');

    const [descriptionMode, setDescriptionMode] = useState('same'); // 'same' | 'separate'
    const [templateName, setTemplateName] = useState('');
    const [templateDescription, setTemplateDescription] = useState('');

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

                return {
                    name: item.name,
                    slug: item.slug,
                    description,
                    price,
                    category: category.trim(),
                    group: group.trim(),
                    fileId: uploaded[i],
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
            className="border border-neutral-800 rounded-lg p-4 mb-6 space-y-4 bg-neutral-950"
        >
            <h2 className="text-lg font-semibold">Create Group From Folder</h2>

            {submitError && <p className="text-red-400 text-sm">{submitError}</p>}
            {progress && <p className="text-neutral-400 text-sm">{progress}</p>}

            <div>
                <label className="block text-sm text-neutral-400 mb-1">Image Folder</label>
                <input
                    type="file"
                    webkitdirectory="true"
                    directory="true"
                    multiple
                    onChange={handleFolderSelect}
                    className="w-full text-sm text-neutral-400"
                />
                <p className="text-neutral-500 text-xs mt-1">
                    Each image becomes one product. Product name comes from the file name.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm text-neutral-400 mb-1">Category (whole batch)</label>
                    <input
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm text-neutral-400 mb-1">Group (whole batch)</label>
                    <input
                        value={group}
                        onChange={(e) => setGroup(e.target.value)}
                        className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm"
                    />
                    <p className="text-neutral-500 text-xs mt-1">
                        If this group already has products, these get added to it. If not, it's created.
                    </p>
                </div>
            </div>

            {/* Price */}
            <div>
                <div className="flex items-center gap-3 mb-1">
                    <label className="text-sm text-neutral-400">Price</label>
                    <label className="text-xs flex items-center gap-1">
                        <input
                            type="radio"
                            checked={priceMode === 'same'}
                            onChange={() => setPriceMode('same')}
                        />
                        Same for all
                    </label>
                    <label className="text-xs flex items-center gap-1">
                        <input
                            type="radio"
                            checked={priceMode === 'separate'}
                            onChange={() => setPriceMode('separate')}
                        />
                        Edit separately
                    </label>
                </div>
                {priceMode === 'same' && (
                    <input
                        type="number"
                        step="0.01"
                        value={sharedPrice}
                        onChange={(e) => setSharedPrice(e.target.value)}
                        className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm"
                        placeholder="Price applied to every product"
                    />
                )}
            </div>

            {/* Description */}
            <div>
                <div className="flex items-center gap-3 mb-1">
                    <label className="text-sm text-neutral-400">Description</label>
                    <label className="text-xs flex items-center gap-1">
                        <input
                            type="radio"
                            checked={descriptionMode === 'same'}
                            onChange={() => setDescriptionMode('same')}
                        />
                        Same for all
                    </label>
                    <label className="text-xs flex items-center gap-1">
                        <input
                            type="radio"
                            checked={descriptionMode === 'separate'}
                            onChange={() => setDescriptionMode('separate')}
                        />
                        Edit separately
                    </label>
                </div>
                {descriptionMode === 'same' && (
                    <div className="space-y-2">
                        <input
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            placeholder="Template name (e.g. 'Sample Product') — this text gets swapped for each product's real name"
                            className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm"
                        />
                        <textarea
                            value={templateDescription}
                            onChange={(e) => setTemplateDescription(e.target.value)}
                            rows={3}
                            placeholder="e.g. 'The Sample Product is handcrafted with care.'"
                            className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm"
                        />
                        <p className="text-neutral-500 text-xs">
                            Every occurrence of the template name above (any case) will be replaced with
                            each product's own name in its saved description.
                        </p>
                    </div>
                )}
            </div>

            {/* Per-item preview / editing */}
            {items.length > 0 && (
                <div>
                    <p className="text-sm text-neutral-400 mb-2">{items.length} image(s) selected</p>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {items.map((item, i) => (
                            <div key={i} className="border border-neutral-800 rounded-md p-2 space-y-1">
                                <div className="flex items-center gap-2">
                                    <input
                                        value={item.name}
                                        onChange={(e) => updateItem(i, 'name', e.target.value)}
                                        className="flex-1 rounded-md bg-neutral-900 border border-neutral-800 px-2 py-1 text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeItem(i)}
                                        className="text-red-400 text-xs hover:underline"
                                    >
                                        Remove
                                    </button>
                                </div>
                                <p className="text-neutral-500 text-xs">
                                    slug: {category.trim() || 'category'}/{group.trim() || 'group'}/{item.slug}
                                </p>

                                {priceMode === 'separate' && (
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={item.price}
                                        onChange={(e) => updateItem(i, 'price', e.target.value)}
                                        placeholder="Price"
                                        className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-2 py-1 text-sm"
                                    />
                                )}

                                {descriptionMode === 'separate' && (
                                    <textarea
                                        value={item.description}
                                        onChange={(e) => updateItem(i, 'description', e.target.value)}
                                        rows={2}
                                        placeholder="Description"
                                        className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-2 py-1 text-sm"
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
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                    {submitting ? 'Creating...' : `Create ${items.length || ''} Product(s)`}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}

export default BulkUploadForm;