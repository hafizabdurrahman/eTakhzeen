import React, { useState } from 'react';
import service from '../../backend/service';

function ProductList({ products, onEdit, onRefresh }) {
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
        if (!confirm('Delete this product? This cannot be undone.')) return;
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
            alert('Failed to delete product.');
        }
    }

    async function handleDeleteSelected() {
        if (selected.length === 0) return;
        if (!confirm(`Delete ${selected.length} product(s)? This cannot be undone.`)) return;
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
            alert('Failed to delete selected products.');
        }
    }

    if (products.length === 0) {
        return <p className="text-neutral-400">No products found.</p>;
    }

    return (
        <div>
            {selected.length > 0 && (
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-neutral-400">{selected.length} selected</span>
                    <button
                        onClick={handleDeleteSelected}
                        disabled={deleting}
                        className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                    >
                        Delete Selected
                    </button>
                </div>
            )}

            <table className="w-full text-sm text-left">
                <thead className="text-neutral-400 border-b border-neutral-800">
                    <tr>
                        <th className="py-2 pr-4">
                            <input
                                type="checkbox"
                                checked={selected.length === products.length}
                                onChange={toggleAll}
                            />
                        </th>
                        <th className="py-2 pr-4">Image</th>
                        <th className="py-2 pr-4">Name</th>
                        <th className="py-2 pr-4">Slug</th>
                        <th className="py-2 pr-4">Category</th>
                        <th className="py-2 pr-4">Group</th>
                        <th className="py-2 pr-4">Price</th>
                        <th className="py-2 pr-4">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((p) => (
                        <tr key={p['$id']} className="border-b border-neutral-900">
                            <td className="py-2 pr-4">
                                <input
                                    type="checkbox"
                                    checked={selected.includes(p['$id'])}
                                    onChange={() => toggleOne(p['$id'])}
                                />
                            </td>
                            <td className="py-2 pr-4">
                                {p.fileId ? (
                                    <img
                                        src={service.getImagePreview({ fileId: p.fileId })}
                                        alt={p.name}
                                        className="w-10 h-10 object-cover rounded"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded bg-neutral-800" />
                                )}
                            </td>
                            <td className="py-2 pr-4">{p.name}</td>
                            <td className="py-2 pr-4 text-neutral-500">{p.slug}</td>
                            <td className="py-2 pr-4">{p.category}</td>
                            <td className="py-2 pr-4">{p.group}</td>
                            <td className="py-2 pr-4">${Number(p.price).toFixed(2)}</td>
                            <td className="py-2 pr-4">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onEdit(p)}
                                        className="text-blue-400 hover:underline"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDeleteOne(p['$id'], p.fileId)}
                                        disabled={deleting}
                                        className="text-red-400 hover:underline disabled:opacity-50"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default ProductList;