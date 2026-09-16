import React, { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import service from '../../backend/service';
import { Checkbox } from '../../ui';
import { customConfirm, customAlert } from '../../ui/dialog';

function ProductList({ products, onEdit, onView, onRefresh }) {
    const [selected, setSelected] = useState([]);
    const [deleting, setDeleting] = useState(false);

    function toggleOne(id) {
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    }

    function toggleAll() {
        setSelected((prev) =>
            prev.length === products.length ? [] : products.map((p) => p['$id'])
        );
    }

    async function handleDeleteOne(rowId, fileId) {
        const confirmed = await customConfirm(
            'Delete this product? This cannot be undone.',
            { variant: 'danger', confirmLabel: 'Delete' }
        );
        if (!confirmed) return;

        setDeleting(true);
        const ok = await service.deleteProduct({ rowId });
        if (ok && fileId) {
            service.deleteImage({ fileId: fileId }).catch(() => {});
        }
        setDeleting(false);

        if (ok) {
            setSelected((prev) => prev.filter((id) => id !== rowId));
            onRefresh();
        } else {
            await customAlert('Failed to delete product.', { variant: 'danger' });
        }
    }

    async function handleDeleteSelected() {
        if (selected.length === 0) return;

        const confirmed = await customConfirm(
            `Delete ${selected.length} product(s)? This cannot be undone.`,
            { variant: 'danger', confirmLabel: 'Delete' }
        );
        if (!confirmed) return;

        setDeleting(true);

        // grab fileIds before the rows are gone, so we can clean up images too
        const fileIdsToDelete = products
            .filter((p) => selected.includes(p['$id']) && p.fileId)
            .map((p) => p.fileId);

        const ok = await service.deleteProducts({ rowIds: selected });
        if (ok) {
            fileIdsToDelete.forEach((fileId) => {
                service.deleteImage({ fileId: fileId }).catch(() => {});
            });
        }

        setDeleting(false);

        if (ok) {
            setSelected([]);
            onRefresh();
        } else {
            await customAlert('Failed to delete selected products.', { variant: 'danger' });
        }
    }

    if (products.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-8 text-center dark:border-stone-700 dark:bg-stone-900">
                <p className="text-sm text-stone-500 dark:text-stone-400">No products found.</p>
            </div>
        );
    }

    const allSelected = selected.length === products.length;
    const someSelected = selected.length > 0 && !allSelected;

    return (
        <div>
            {selected.length > 0 && (
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-brand-200 bg-brand-50 px-3 py-2 dark:border-brand-500/30 dark:bg-brand-500/10">
                    <span className="text-sm font-medium text-brand-800 dark:text-brand-300">{selected.length} selected</span>
                    <button
                        onClick={handleDeleteSelected}
                        disabled={deleting}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-600"
                    >
                        Delete Selected
                    </button>
                </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <table className="w-full min-w-[48rem] text-left text-sm">
                <thead className="border-b border-stone-200 bg-stone-50 text-stone-500 dark:border-stone-800 dark:bg-stone-800/40 dark:text-stone-400">
                    <tr>
                        <th className="py-2.5 pl-4 pr-4">
                            <Checkbox
                                checked={allSelected}
                                indeterminate={someSelected}
                                onChange={toggleAll}
                                label="Select all products"
                            />
                        </th>
                        <th className="py-2.5 pr-4">Image</th>
                        <th className="py-2.5 pr-4">Name</th>
                        <th className="py-2.5 pr-4">Slug</th>
                        <th className="py-2.5 pr-4">Category</th>
                        <th className="py-2.5 pr-4">Group</th>
                        <th className="py-2.5 pr-4">Price-PKR</th>
                        <th className="py-2.5 pr-4">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((p) => (
                        <tr
                            key={p['$id']}
                            onClick={() => onView && onView(p)}
                            className={`border-b border-stone-100 transition-colors hover:bg-stone-50 dark:border-stone-800/60 dark:hover:bg-stone-800/60 peer ${
                                onView ? 'cursor-pointer' : ''
                            }`}
                        >
                            <td className="py-2 pl-4 pr-4" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                    checked={selected.includes(p['$id'])}
                                    onChange={() => toggleOne(p['$id'])}
                                    label={`Select ${p.name}`}
                                />
                            </td>
                            <td className="py-2 pr-4">
                                {p.fileId ? (
                                    <img
                                        src={service.getImagePreview({ fileId: p.fileId })}
                                        alt={p.name}
                                        className="h-10 w-10 rounded object-cover ring-1 ring-stone-200 dark:ring-stone-700"
                                    />
                                ) : (
                                    <div className="h-10 w-10 rounded bg-stone-100 dark:bg-stone-800" />
                                )}
                            </td>
                            <td className="py-2 pr-4 font-medium text-stone-900 dark:text-stone-100">{p.name}</td>
                            <td className="py-2 pr-4 text-stone-500 dark:text-stone-400 hover:text-blue-500 dark:text-blue-400 transition">{p.slug}</td>
                            <td className="py-2 pr-4">{p.category}</td>
                            <td className="py-2 pr-4">{p.group}</td>
                            <td className="py-2 pr-4">{Number(p.price).toFixed(1)}/-</td>
                            <td className="py-2 pr-4" onClick={(e) => e.stopPropagation()}>
                                <div className="flex gap-1.5">
                                    <button
                                        onClick={() => onEdit(p)}
                                        title="Edit"
                                        aria-label={`Edit ${p.name}`}
                                        className="rounded-md p-1.5 text-stone-500 transition-colors hover:bg-brand-50 hover:text-brand-700 dark:text-stone-400 dark:hover:bg-brand-500/15 dark:hover:text-brand-400"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteOne(p['$id'], p.fileId)}
                                        disabled={deleting}
                                        title="Delete"
                                        aria-label={`Delete ${p.name}`}
                                        className="rounded-md p-1.5 text-stone-500 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:text-stone-400 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            </div>
        </div>
    );
}

export default ProductList;