import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import service from "../../backend/service"; // ⚠️ adjust path to match where backend/ actually lives relative to this file

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
        sortBy: 'name-asc',
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

// Drives the main grid whether or not there's a search term — mirrors the
// same choice already made inside service.searchProducts().
export const fetchCatalogPage = createAsyncThunk(
    'products/fetchCatalogPage',
    async ({ page, pageSize, filters }) => {
        const offset = (page - 1) * pageSize;
        const { category, group, minPrice, maxPrice, sortBy, searchTerm, stockFilter } = filters;
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
        resetFilters: (s) => {
            s.filters = { ...initialState.filters };
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
    setFilter, setSearchTerm, setPage, resetFilters,
} = productsSlice.actions;

export default productsSlice.reducer;