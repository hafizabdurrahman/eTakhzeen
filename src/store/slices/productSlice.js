import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import service from "../../backend/service"; // ⚠️ adjust path to match where backend/ actually lives relative to this file

// ---------------------------------------------------------------------------
// Random ordering (frontend only — service.js is untouched)
//
// Appwrite can't sort randomly, and shuffling each page separately would put
// the same product on two pages and hide others. So for sortBy === 'random':
//   1. load every product for the current category/group once (cached),
//   2. apply the price / stock / search filters in memory,
//   3. shuffle the WHOLE result with a seeded PRNG,
//   4. slice out the requested page.
// The same seed always gives the same order, so paging back and forth is
// stable. The seed is new on every page load, so each visit looks different.
// ---------------------------------------------------------------------------

const SESSION_SEED = Math.floor(Math.random() * 2 ** 32);
const newSeed = () => Math.floor(Math.random() * 2 ** 32);

// Small, fast, well-distributed seeded PRNG.
function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Sorting by $id first means the result depends only on the seed, not on the
// order Appwrite happened to return the rows in.
function seededShuffle(rows, seed) {
    const list = [...rows].sort((a, b) => (a['$id'] < b['$id'] ? -1 : a['$id'] > b['$id'] ? 1 : 0));
    const rand = mulberry32(seed);
    for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
}

// Same filter semantics as service.getProductsPage / service.searchProducts.
function filterRows(rows, { minPrice, maxPrice, stockFilter, searchTerm }) {
    const term = (searchTerm || '').trim().toLowerCase();
    const hasMin = minPrice != null && minPrice !== '';
    const hasMax = maxPrice != null && maxPrice !== '';

    return rows.filter((r) => {
        const price = Number(r.price);
        if (hasMin && !(price >= Number(minPrice))) return false;
        if (hasMax && !(price <= Number(maxPrice))) return false;
        if (stockFilter === 'in' && r.status !== true) return false;
        if (stockFilter === 'out' && r.status !== false) return false;
        if (term) {
            const name = (r.name || '').toLowerCase();
            const desc = (r.description || '').toLowerCase();
            if (!name.includes(term) && !desc.includes(term)) return false;
        }
        return true;
    });
}

// Cache of the full product list per category/group, so changing pages or
// filters doesn't re-download the whole catalog each time. The promise is
// cached (not just the rows) so simultaneous requests share one download.
const CACHE_TTL_MS = 2 * 60 * 1000;
let allRowsCache = { key: null, promise: null, at: 0 };

// Call this after adding / editing / deleting a product if you want the
// catalog to reflect it immediately instead of after the cache expires.
export function invalidateCatalogCache() {
    allRowsCache = { key: null, promise: null, at: 0 };
}

function loadAllRows({ category, group }) {
    const key = `${category || ''}|${group || ''}`;
    const fresh =
        allRowsCache.key === key &&
        allRowsCache.promise &&
        Date.now() - allRowsCache.at < CACHE_TTL_MS;
    if (fresh) return allRowsCache.promise;

    const promise = service.getProducts({ category, group }).then((rows) => {
        // service.getProducts returns `false` on failure
        if (!Array.isArray(rows)) throw new Error('Failed to load products.');
        return rows;
    });
    allRowsCache = { key, promise, at: Date.now() };
    // Don't keep a failed request cached.
    promise.catch(() => {
        if (allRowsCache.promise === promise) invalidateCatalogCache();
    });
    return promise;
}

const initialState = {
    // ---- existing state, unchanged ----
    products: [],       // sibling products (same category + group) for the current product page
    categories: [],
    product: {},         // the currently-viewed single product
    productId: null,
    productsCount: 0,
    categoryCount: 0,

    // ---- new: catalog browsing state ----
    catalog: {
        items: [],
        total: 0,
        page: 1,
        pageSize: 35,
        status: 'idle', // idle | loading | succeeded | failed
        error: null,
        currentRequestId: null, // FIX: tracks the latest in-flight fetchCatalogPage request
    },
    catalogCategories: {
        items: [], // [{ name, count, sampleFileID }]
        status: 'idle',
        error: null,
    },
    catalogGroups: {
        items: [], // [{ name, count, sampleFileID }]
        status: 'idle',
        error: null,
    },
    priceBounds: { min: 0, max: 0 },
    filters: {
        category: null,
        group: null,
        minPrice: null,
        maxPrice: null,
        sortBy: 'random', // 'random' | 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'newest'
        shuffleSeed: SESSION_SEED, // decides the random order; new on every page load
        searchTerm: '',
        stockFilter: 'all', // 'all' | 'in' | 'out' — reads the boolean `status` column
    },
}

export const fetchCatalogCategories = createAsyncThunk(
    'products/fetchCatalogCategories',
    async () => {
        const result = await service.listCategoriesWithSample();
        return Array.isArray(result) ? result : [];
    }
);

export const fetchCatalogGroups = createAsyncThunk(
    'products/fetchCatalogGroups',
    async ({ category } = {}) => {
        const result = await service.listGroupsWithSample({ category });
        return Array.isArray(result) ? result : [];
    }
);

export const fetchPriceBounds = createAsyncThunk(
    'products/fetchPriceBounds',
    async ({ category, group } = {}) => {
        return await service.getPriceRange({ category, group });
    }
);

// Drives the main grid whether or not there's a search term.
// - sortBy === 'random': shuffled client-side (see the top of this file).
// - any other sort: paginated by Appwrite exactly as before.
export const fetchCatalogPage = createAsyncThunk(
    'products/fetchCatalogPage',
    async ({ page, pageSize, filters }) => {
        const offset = (page - 1) * pageSize;
        const { category, group, minPrice, maxPrice, sortBy, searchTerm, stockFilter, shuffleSeed } = filters;

        if (sortBy === 'random') {
            const all = await loadAllRows({ category, group });
            const matched = filterRows(all, { minPrice, maxPrice, stockFilter, searchTerm });
            const shuffled = seededShuffle(matched, shuffleSeed ?? SESSION_SEED);
            return {
                rows: shuffled.slice(offset, offset + pageSize),
                total: shuffled.length,
                page,
                pageSize,
            };
        }

        const result = searchTerm && searchTerm.trim()
            ? await service.searchProducts({ term: searchTerm, category, group, minPrice, maxPrice, sortBy, stockFilter, limit: pageSize, offset })
            : await service.getProductsPage({ category, group, minPrice, maxPrice, sortBy, stockFilter, limit: pageSize, offset });
        return { ...result, page, pageSize };
    }
);

export const productsSlice = createSlice({
    name: "products",
    initialState,
    reducers: {
        getProducts: (s, a) => {
            s.products = a.payload;
            s.productsCount = s.products.length;
        },
        getOneProduct: (s, a) => {
            s.product = a.payload || {};
            s.productId = s.product['$id'] || null;
        },
        getCategories: (s, a) => {
            s.categories = a.payload;
            s.categoryCount = s.categories.length;
        },

        // ---- new ----
        setFilter: (s, a) => {
            // a.payload: partial filters object, e.g. { minPrice: 10 }
            // No more auto-nulling group here — Products.jsx now dispatches
            // category AND group together straight from the URL params, so
            // forcing group to null on any category key would stomp a valid
            // deep link like /products/:category/:group.
            s.filters = { ...s.filters, ...a.payload };
            s.catalog.page = 1;
        },
        setSearchTerm: (s, a) => {
            s.filters.searchTerm = a.payload;
            s.catalog.page = 1;
        },
        setPage: (s, a) => {
            s.catalog.page = a.payload;
        },
        // Picks a new random order and jumps back to page 1.
        // Usage: dispatch(reshuffle())
        reshuffle: (s) => {
            s.filters.shuffleSeed = newSeed();
            s.catalog.page = 1;
        },
        resetFilters: (s) => {
            // Keeps the current shuffleSeed so "reset" doesn't reorder the grid.
            s.filters = { ...initialState.filters, shuffleSeed: s.filters.shuffleSeed };
            s.catalog.page = 1;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchCatalogCategories.pending, (s) => { s.catalogCategories.status = 'loading'; s.catalogCategories.error = null; })
            .addCase(fetchCatalogCategories.fulfilled, (s, a) => { s.catalogCategories.status = 'succeeded'; s.catalogCategories.items = a.payload; })
            .addCase(fetchCatalogCategories.rejected, (s, a) => { s.catalogCategories.status = 'failed'; s.catalogCategories.error = a.error.message; })

            .addCase(fetchCatalogGroups.pending, (s) => { s.catalogGroups.status = 'loading'; s.catalogGroups.error = null; })
            .addCase(fetchCatalogGroups.fulfilled, (s, a) => { s.catalogGroups.status = 'succeeded'; s.catalogGroups.items = a.payload; })
            .addCase(fetchCatalogGroups.rejected, (s, a) => { s.catalogGroups.status = 'failed'; s.catalogGroups.error = a.error.message; })

            .addCase(fetchPriceBounds.fulfilled, (s, a) => { s.priceBounds = a.payload; })

            // FIX: fetchCatalogPage can be dispatched multiple times in
            // quick succession (debounced search, rapid filter changes,
            // React StrictMode double-invoke in dev). Without tracking which
            // request is the *latest*, an older request's `fulfilled` could
            // resolve after a newer one and stomp fresher data with stale
            // data — or, if a stale request never resolves at all, a later
            // `pending` could leave `status` parked on 'loading' forever.
            // We stamp the requestId on every `pending` and ignore any
            // fulfilled/rejected whose requestId doesn't match the latest one.
            .addCase(fetchCatalogPage.pending, (s, a) => {
                s.catalog.status = 'loading';
                s.catalog.error = null;
                s.catalog.currentRequestId = a.meta.requestId;
            })
            .addCase(fetchCatalogPage.fulfilled, (s, a) => {
                if (a.meta.requestId !== s.catalog.currentRequestId) return; // stale response, ignore
                s.catalog.status = 'succeeded';
                s.catalog.items = a.payload.rows;
                s.catalog.total = a.payload.total;
                s.catalog.page = a.payload.page;
                s.catalog.pageSize = a.payload.pageSize;
            })
            .addCase(fetchCatalogPage.rejected, (s, a) => {
                if (a.meta.requestId !== s.catalog.currentRequestId) return; // stale response, ignore
                s.catalog.status = 'failed';
                s.catalog.error = a.error.message;
            });
    }
})

// Bug fix: actions come from `.actions`, not `.reducer`
export const {
    getProducts, getCategories, getOneProduct,
    setFilter, setSearchTerm, setPage, resetFilters, reshuffle,
} = productsSlice.actions;

export default productsSlice.reducer;