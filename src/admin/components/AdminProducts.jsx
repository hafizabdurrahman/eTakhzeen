import React, { useCallback, useEffect, useState } from 'react';
import service from '../../backend/service';
import ProductForm from '../components/ProductForm';
import ProductList from '../components/ProductList';
import CategoriesView from '../components/CategoriesView';
import GroupsView from '../components/GroupsView';
import BulkUploadForm from '../components/BulkUploadForm';

function AdminProducts() {
    // 'products' | 'categories' | 'groups' | 'bulk'
    const [view, setView] = useState('products');

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState({});
    const [groups, setGroups] = useState({});

    const [filterCategory, setFilterCategory] = useState('');
    const [filterGroup, setFilterGroup] = useState('');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    const loadAll = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [productRows, categoryMap, groupMap] = await Promise.all([
                service.getProducts({
                    category: filterCategory || undefined,
                    group: filterGroup || undefined,
                }),
                service.listCategories(),
                service.listGroups({ category: filterCategory || undefined }),
            ]);

            setProducts(Array.isArray(productRows) ? productRows : []);
            setCategories(categoryMap && categoryMap !== false ? categoryMap : {});
            setGroups(groupMap && groupMap !== false ? groupMap : {});
        } catch (err) {
            console.error(err);
            setError('Failed to load products.');
        } finally {
            setLoading(false);
        }
    }, [filterCategory, filterGroup]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    function openAddForm() {
        setEditingProduct(null);
        setShowForm(true);
    }

    function openEditForm(product) {
        setEditingProduct(product);
        setShowForm(true);
    }

    function closeForm() {
        setShowForm(false);
        setEditingProduct(null);
    }

    function handleFormDone() {
        closeForm();
        loadAll();
    }

    function goToProductsFilteredByCategory(categoryName) {
        setFilterCategory(categoryName);
        setFilterGroup('');
        setView('products');
    }

    function goToProductsFilteredByGroup(groupName) {
        setFilterGroup(groupName);
        setView('products');
    }

    function handleBulkDone() {
        setView('products');
        loadAll();
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-semibold">Products</h1>
                <div className="flex gap-2">
                    {view === 'products' && !showForm && (
                        <button
                            onClick={openAddForm}
                            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium"
                        >
                            + Add Product
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4 border-b border-neutral-800">
                {[
                    { key: 'products', label: 'Products' },
                    { key: 'categories', label: 'Categories' },
                    { key: 'groups', label: 'Groups' },
                    { key: 'bulk', label: 'Create Group (Bulk Upload)' },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => {
                            setShowForm(false);
                            setView(tab.key);
                        }}
                        className={`px-3 py-2 text-sm ${
                            view === tab.key
                                ? 'border-b-2 border-blue-500 text-white'
                                : 'text-neutral-400'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {view === 'products' && (
                <>
                    {showForm && (
                        <ProductForm
                            initialData={editingProduct}
                            categories={categories}
                            groups={groups}
                            onDone={handleFormDone}
                            onCancel={closeForm}
                        />
                    )}

                    <div className="flex gap-3 mb-4">
                        <select
                            value={filterCategory}
                            onChange={(e) => {
                                setFilterCategory(e.target.value);
                                setFilterGroup(''); // reset group filter when category changes
                            }}
                            className="rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm"
                        >
                            <option value="">All Categories</option>
                            {Object.keys(categories).map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>

                        <select
                            value={filterGroup}
                            onChange={(e) => setFilterGroup(e.target.value)}
                            className="rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm"
                        >
                            <option value="">All Groups</option>
                            {Object.keys(groups).map((g) => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    </div>

                    {loading && <p className="text-neutral-400">Loading products...</p>}
                    {error && <p className="text-red-400">{error}</p>}
                    {!loading && !error && (
                        <ProductList products={products} onEdit={openEditForm} onRefresh={loadAll} />
                    )}
                </>
            )}

            {view === 'categories' && (
                <CategoriesView onSelect={goToProductsFilteredByCategory} />
            )}

            {view === 'groups' && (
                <GroupsView onSelect={goToProductsFilteredByGroup} />
            )}

            {view === 'bulk' && (
                <BulkUploadForm onDone={handleBulkDone} onCancel={() => setView('products')} />
            )}
        </div>
    );
}

export default AdminProducts;