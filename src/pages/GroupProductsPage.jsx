import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCatalogPage, setPage } from '../store/slices/productSlice'; // ⚠️ adjust path
import { ProductCard, Pagination } from '../components'; // ⚠️ adjust path

function GroupProductsPage() {
    const { categoryName, groupName } = useParams();
    const dispatch = useDispatch();
    const catalog = useSelector((s) => s.products.catalog);

    useEffect(() => {
        dispatch(setPage(1));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categoryName, groupName]);

    useEffect(() => {
        dispatch(fetchCatalogPage({
            page: catalog.page,
            pageSize: catalog.pageSize,
            filters: {
                category: categoryName,
                group: groupName,
                minPrice: null,
                maxPrice: null,
                sortBy: 'name-asc',
                searchTerm: '',
            },
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, categoryName, groupName, catalog.page]);

    function handlePageChange(page) {
        dispatch(setPage(page));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    return (
        <div>
            <div className="flex items-center gap-2 text-sm text-neutral-400 mb-4">
                <Link to="/products" className="hover:underline">Products</Link>
                <span>/</span>
                <Link to={`/products/category/${encodeURIComponent(categoryName)}`} className="hover:underline">
                    {categoryName}
                </Link>
                <span>/</span>
                <span>{groupName}</span>
            </div>

            {catalog.status === 'loading' && <p className="text-neutral-400">Loading products...</p>}
            {catalog.status === 'failed' && <p className="text-red-400">Failed to load products.</p>}
            {catalog.status === 'succeeded' && catalog.items.length === 0 && (
                <p className="text-neutral-400">No products in this group yet.</p>
            )}
            {catalog.items.length > 0 && (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {catalog.items.map((p) => (
                            <ProductCard key={p['$id']} product={p} />
                        ))}
                    </div>
                    <Pagination page={catalog.page} pageSize={catalog.pageSize} total={catalog.total} onPageChange={handlePageChange} />
                </>
            )}
        </div>
    );
}

export default GroupProductsPage;