import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { Plus } from 'lucide-react';
import service from '../../backend/service';
import ProductForm from '../components/ProductForm';
import ProductList from '../components/ProductList';
import CategoriesView from '../components/CategoriesView';
import GroupsView from '../components/GroupsView';
import BulkUploadForm from '../components/BulkUploadForm';
import ProductDetailModal from '../components/ProductDetailModal';
import { Select } from '../../ui';

function AdminProducts() {
    const location = useLocation();

    // 'products' | 'categories' | 'groups' | 'bulk'
    // Arriving from a Dashboard stat card (Categories / Groups) opens
    // straight onto that tab instead of always defaulting to Products.
    const [view, setView] = useState(location.state?.view || 'products');

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState({});
    const [groups, setGroups] = useState({});

    const [filterCategory, setFilterCategory] = useState('');
    const [filterGroup, setFilterGroup] = useState('');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [viewingProduct, setViewingProduct] = useState(null);

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

    const tabs = [
        { key: 'products', label: 'Products' },
        { key: 'categories', label: 'Categories' },
        { key: 'groups', label: 'Groups' },
        { key: 'bulk', label: 'Create Group (Bulk Upload)' },
    ];

    const categoryOptions = Object.entries(categories).map(([name, count]) => ({
        value: name,
        label: `${name} · ${count}`,
    }));
    const groupOptions = Object.entries(groups).map(([name, count]) => ({
        value: name,
        label: `${name} · ${count}`,
    }));

    return (
        <div>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 sm:text-3xl">Products</h1>
                {view === 'products' && !showForm && (
                    <button
                        onClick={openAddForm}
                        className="group flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 py-3 pl-4 pr-5 text-sm font-semibold text-white shadow-md shadow-brand-600/20 transition-all hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-600/25 active:translate-y-0 dark:bg-brand-500 dark:shadow-brand-500/20 dark:hover:bg-brand-600 sm:w-auto"
                    >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:rotate-90">
                            <Plus size={16} strokeWidth={2.75} />
                        </span>
                        Add Product
                    </button>
                )}
            </div>

            {/* Tabs — horizontally scrollable on narrow screens instead of wrapping/clipping */}
            <div className="mb-4 -mx-4 overflow-x-auto border-b border-stone-200 px-4 dark:border-stone-800 sm:mx-0 sm:px-0">
                <div className="flex gap-1 whitespace-nowrap">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => {
                                setShowForm(false);
                                setView(tab.key);
                            }}
                            className={`shrink-0 rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                                view === tab.key
                                    ? 'border-brand-600 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-500/10 dark:text-brand-400'
                                    : 'border-transparent text-stone-500 hover:bg-stone-50 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
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

                    <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                        <Select
                            value={filterCategory}
                            onChange={(next) => {
                                setFilterCategory(next);
                                setFilterGroup(''); // reset group filter when category changes
                            }}
                            options={categoryOptions}
                            placeholder="All Categories"
                            className="w-full sm:w-56"
                        />

                        <Select
                            value={filterGroup}
                            onChange={setFilterGroup}
                            options={groupOptions}
                            placeholder="All Groups"
                            className="w-full sm:w-56"
                        />
                    </div>

                    {loading && <p className="text-sm text-stone-500 dark:text-stone-400">Loading products...</p>}
                    {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                    {!loading && !error && (
                        <ProductList
                            products={products}
                            onEdit={openEditForm}
                            onView={setViewingProduct}
                            onRefresh={loadAll}
                        />
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

            {viewingProduct && (
                <ProductDetailModal
                    product={viewingProduct}
                    siblingProducts={products}
                    onClose={() => setViewingProduct(null)}
                />
            )}
        </div>
    );
}

export default AdminProducts;