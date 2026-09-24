import { useEffect, useState } from 'react';
import service from '../../../backend/service'; // ⚠️ adjust path to match your project
import { parseKeywords } from '../../../utils/socialMedia/parseKeywords';

// Loads the same three catalog sources AdminDashboard.jsx already loads
// (products, categories, groups), using the same service calls, but keeps
// the loading local to this feature so AdminDashboard itself never needs
// to change. Every product's `keywords` string is parsed into an array
// here, once, so nothing downstream ever touches the raw comma string.
export default function useCatalogData() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState({});
    const [groups, setGroups] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                setLoading(true);
                setError(null);

                const [productRows, categoryMap, groupMap] = await Promise.all([
                    service.getProducts({}),
                    service.listCategories(),
                    service.listGroups({}),
                ]);

                if (cancelled) return;

                const normalizedProducts = (Array.isArray(productRows) ? productRows : []).map(
                    (p) => ({ ...p, keywords: parseKeywords(p.keywords) })
                );

                setProducts(normalizedProducts);
                setCategories(categoryMap && categoryMap !== false ? categoryMap : {});
                setGroups(groupMap && groupMap !== false ? groupMap : {});
            } catch (err) {
                if (!cancelled) setError('Failed to load catalog data.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    return { products, categories, groups, loading, error };
}