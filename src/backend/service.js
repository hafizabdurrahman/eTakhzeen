import envVars from '../../envVars/vars';
import { Client, Storage, TablesDB, Query, ID } from 'appwrite';

export class Service {
    client = new Client();
    table;
    bucket;

    databaseId = envVars.eTakhzeenDatabaseId;
    tableId = envVars.eTakhzeenTableId;
    bucketId = envVars.eTakhzeenBucketId; // ⚠️ confirm this exists in vars.js — see note below

    constructor() {
        this.client
            .setEndpoint(envVars.eTakhzeenURL)
            .setProject(envVars.eTakhzeenProjectId);
        this.table = new TablesDB(this.client);
        this.bucket = new Storage(this.client);
    }

    // ---------- Products ----------

    async addProduct({ data }) {
        try {
            const product = await this.table.createRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: ID.unique(),
                data,
            });
            return product ? product : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Bulk create — used by the "create a group" / folder-upload flow.
    // items: array of `data` objects (one per row). Returns array of created
    // rows on success, false if any row fails (nothing is rolled back —
    // caller can inspect which rowIds already exist via getProducts if a
    // partial failure needs cleanup).
    async addProducts({ items }) {
        try {
            const results = await Promise.all(
                items.map((data) =>
                    this.table.createRow({
                        databaseId: this.databaseId,
                        tableId: this.tableId,
                        rowId: ID.unique(),
                        data,
                    })
                )
            );
            return results;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async updateProduct({ rowId, data }) {
        try {
            const product = await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId,
                data,
            });
            return product ? product : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async deleteProduct({ rowId }) {
        try {
            await this.table.deleteRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId,
            });
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // delete more than one product — now actually awaits every deletion
    // and reports success/failure instead of firing promises and forgetting them
    async deleteProducts({ rowIds }) {
        try {
            await Promise.all(
                rowIds.map((rowId) =>
                    this.table.deleteRow({
                        databaseId: this.databaseId,
                        tableId: this.tableId,
                        rowId,
                    })
                )
            );
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async getProduct({ rowId }) {
        try {
            return await this.table.getRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId,
            });
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Filter by category and/or group — either, both, or neither (= all products).
    // Paginates internally so results beyond 25 rows aren't silently dropped.
    async getProducts({ category, group } = {}) {
        try {
            const queries = [];
            if (category) queries.push(Query.equal('category', category));
            if (group) queries.push(Query.equal('group', group));

            return await this._listAllRows(queries);
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Internal pagination helper — same cursor pattern as user.js's _getAllRows
    async _listAllRows(extraQueries = []) {
        const rows = [];
        const pageSize = 100;
        let cursor = null;

        while (true) {
            const queries = [...extraQueries, Query.limit(pageSize)];
            if (cursor) queries.push(Query.cursorAfter(cursor));

            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries,
            });

            if (!res?.rows?.length) break;

            rows.push(...res.rows);

            if (res.rows.length < pageSize) break;
            cursor = res.rows[res.rows.length - 1].$id;
        }

        return rows;
    }

    // Distinct groups, each with a product count. Optionally scoped to a category.
    async listGroups({ category } = {}) {
        try {
            const queries = category ? [Query.equal('category', category)] : [];
            const rows = await this._listAllRows(queries);
            const counts = {};
            rows.forEach((r) => {
                if (!r.group) return;
                counts[r.group] = (counts[r.group] || 0) + 1;
            });
            return counts; // { groupName: count }
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Distinct categories, each with a product count.
    async listCategories() {
        try {
            const rows = await this._listAllRows();
            const counts = {};
            rows.forEach((r) => {
                if (!r.category) return;
                counts[r.category] = (counts[r.category] || 0) + 1;
            });
            return counts; // { categoryName: count }
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // ---------- Slugs ----------

    // Fetch a single product by its slug — used by the public product
    // detail page (/products/:category/:group/:slug).
    async getProductBySlug({ slug }) {
        try {
            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries: [Query.equal('slug', slug), Query.limit(1)],
            });
            return res?.rows?.length ? res.rows[0] : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Returns true if `slug` is NOT already used by another row.
    // Pass excludeRowId when checking during an edit, so the product's own
    // current slug doesn't flag itself as taken.
    async isSlugAvailable({ slug, excludeRowId } = {}) {
        try {
            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries: [Query.equal('slug', slug), Query.limit(1)],
            });
            const rows = res?.rows || [];
            if (rows.length === 0) return true;
            if (excludeRowId && rows[0]['$id'] === excludeRowId) return true;
            return false;
        } catch (error) {
            console.error(error.message);
            // Fail closed: treat as unavailable so we don't silently create
            // a duplicate slug on a network/query error.
            return false;
        }
    }

    // All slugs currently in use, as a Set — handy for bulk-upload flows that
    // need to dedupe many candidate slugs against existing ones in one shot.
    async getAllSlugs() {
        try {
            const rows = await this._listAllRows();
            return new Set(rows.map((r) => r.slug).filter(Boolean));
        } catch (error) {
            console.error(error.message);
            return new Set();
        }
    }

    // ---------- Images ----------

    async uploadImage({ file }) {
        try {
            const uploaded = await this.bucket.createFile({
                bucketId: this.bucketId,
                fileId: ID.unique(),
                file,
            });
            return uploaded ? uploaded : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async deleteImage({ fileId }) {
        try {
            await this.bucket.deleteFile({
                bucketId: this.bucketId,
                fileId,
            });
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Synchronous — returns a URL string/object, not a promise. Safe to
    // call directly in JSX (e.g. <img src={service.getImagePreview(...)} />)
    //
    // Uses getFileView() (raw file, no server-side resizing) rather than
    // getFilePreview() (resize/crop/quality transforms) — transformations
    // are a paid-plan-only feature on Appwrite and return a 403
    // "storage_image_transformations_blocked" error on the free plan.
    // getFileView() works on every plan; you just don't get server-side
    // resizing, so images render at their original uploaded dimensions
    // (the existing Tailwind classes like `w-16 h-16 object-cover` still
    // crop/scale them fine on the frontend either way).
    getImagePreview({ fileId }) {
        try {
            const id = this._extractFileId(fileId);
            if (!id) return null;
            return this.bucket.getFileView({
                bucketId: this.bucketId,
                fileId: id,
            });
        } catch (error) {
            console.error(error.message);
            return null;
        }
    }

    // Defensive only — some existing product rows have a full preview/view
    // URL saved in the `fileId` column instead of the raw file ID (a bug in
    // whatever saves products after upload, not in this file). This pulls
    // the raw ID back out of a URL like ".../files/<id>/view?..." so those
    // rows still render instead of 400ing on Appwrite's ID validation.
    // Fix the save-time bug at the source — this is just a safety net.
    _extractFileId(fileId) {
        if (!fileId) return null;
        if (!fileId.includes('/')) return fileId; // already a raw id
        const match = fileId.match(/\/files\/([^/]+)\//);
        return match ? match[1] : fileId;
    }
    
        // ---------- Catalog Browsing (paginated / filtered) ----------

    // Paginated + filtered product listing — used by the main "Products" grid.
    // Unlike getProducts() (which pages internally and returns everything),
    // this returns exactly one page plus the total count so the UI can
    // render real pagination controls.
        async getProductsPage({
        category,
        group,
        minPrice,
        maxPrice,
        sortBy = 'name-asc',
        stockFilter = 'all', // 'all' | 'in' | 'out' — filters on the boolean `status` column (true = in stock)
        limit = 35,
        offset = 0,
    } = {}) {
        try {
            const queries = [];
            if (category) queries.push(Query.equal('category', category));
            if (group) queries.push(Query.equal('group', group));
            if (minPrice != null && minPrice !== '') queries.push(Query.greaterThanEqual('price', Number(minPrice)));
            if (maxPrice != null && maxPrice !== '') queries.push(Query.lessThanEqual('price', Number(maxPrice)));
            if (stockFilter === 'in') queries.push(Query.equal('status', true));
            if (stockFilter === 'out') queries.push(Query.equal('status', false));
            queries.push(...this._sortQueries(sortBy));
            queries.push(Query.limit(limit));
            queries.push(Query.offset(offset));

            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries,
            });

            return { rows: res?.rows || [], total: res?.total || 0 };
        } catch (error) {
            console.error(error.message);
            return { rows: [], total: 0 };
        }
    }

    _sortQueries(sortBy) {
        switch (sortBy) {
            case 'price-asc':
                return [Query.orderAsc('price')];
            case 'price-desc':
                return [Query.orderDesc('price')];
            case 'name-desc':
                return [Query.orderDesc('name')];
            case 'newest':
                return [Query.orderDesc('$createdAt')];
            case 'name-asc':
            default:
                return [Query.orderAsc('name')];
        }
    }

    // Text search across `name` and `description`, plus the same filters as
    // getProductsPage(). REQUIRES fulltext indexes on `name` and
    // `description` in the Appwrite console — without those, Query.search
    // throws and this quietly falls back to zero results for that half
    // rather than crashing the page (see console for the real error).
    //
    // Appwrite can't OR two fulltext searches in one query, so we run both
    // and merge client-side, each capped at 200 rows before merging/
    // sorting/paginating in memory. Fine for a catalog of a few thousand
    // items; not built to scale past that.
    async searchProducts({
        term,
        category,
        group,
        minPrice,
        maxPrice,
        sortBy = 'name-asc',
        stockFilter = 'all',
        limit = 35,
        offset = 0,
    } = {}) {
        try {
            const trimmed = (term || '').trim().toLowerCase();
            if (!trimmed) {
                return await this.getProductsPage({ category, group, minPrice, maxPrice, sortBy, stockFilter, limit, offset });
            }

            const queries = [];
            if (category) queries.push(Query.equal('category', category));
            if (group) queries.push(Query.equal('group', group));
            if (minPrice != null && minPrice !== '') queries.push(Query.greaterThanEqual('price', Number(minPrice)));
            if (maxPrice != null && maxPrice !== '') queries.push(Query.lessThanEqual('price', Number(maxPrice)));
            if (stockFilter === 'in') queries.push(Query.equal('status', true));
            if (stockFilter === 'out') queries.push(Query.equal('status', false));

            const rows = await this._listAllRows(queries);
            let matched = rows.filter((r) => {
                const name = (r.name || '').toLowerCase();
                const desc = (r.description || '').toLowerCase();
                return name.includes(trimmed) || desc.includes(trimmed);
            });

            matched = this._sortRowsInMemory(matched, sortBy);

            const total = matched.length;
            const paged = matched.slice(offset, offset + limit);
            return { rows: paged, total };
        } catch (error) {
            console.error(error.message);
            return { rows: [], total: 0 };
        }
    }

    _sortRowsInMemory(rows, sortBy) {
        const sorted = [...rows];
        switch (sortBy) {
            case 'price-asc':
                sorted.sort((a, b) => Number(a.price) - Number(b.price));
                break;
            case 'price-desc':
                sorted.sort((a, b) => Number(b.price) - Number(a.price));
                break;
            case 'name-desc':
                sorted.sort((a, b) => String(b.name).localeCompare(String(a.name)));
                break;
            case 'newest':
                sorted.sort((a, b) => new Date(b['$createdAt']) - new Date(a['$createdAt']));
                break;
            case 'name-asc':
            default:
                sorted.sort((a, b) => String(a.name).localeCompare(String(b.name)));
        }
        return sorted;
    }

    // Categories with a product count *and* the fileId of one product in
    // that category (first one found that has an image) — for the picture
    // tile on the browsing page. Walks every row like listCategories()
    // above, so it shares that method's "fine for a few thousand rows"
    // cost profile.
    async listCategoriesWithSample() {
        try {
            const rows = await this._listAllRows();
            const map = new Map();
            rows.forEach((r) => {
                if (!r.category) return;
                if (!map.has(r.category)) map.set(r.category, { count: 0, sampleFileID: null });
                const entry = map.get(r.category);
                entry.count += 1;
                if (!entry.sampleFileID && r.fileId) entry.sampleFileID = r.fileId;
            });
            return Array.from(map.entries()).map(([name, v]) => ({ name, ...v }));
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Same idea, one level down, optionally scoped to a category.
        async listGroupsWithSample({ category } = {}) {
        try {
            const queries = category ? [Query.equal('category', category)] : [];
            const rows = await this._listAllRows(queries);
            const map = new Map();
            rows.forEach((r) => {
                if (!r.group) return;
                if (!map.has(r.group)) {
                    map.set(r.group, { count: 0, sampleFileID: null, sampleCategory: r.category || null });
                }
                const entry = map.get(r.group);
                entry.count += 1;
                if (!entry.sampleFileID && r.fileId) entry.sampleFileID = r.fileId;
            });
            return Array.from(map.entries()).map(([name, v]) => ({ name, ...v }));
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Min/max price in the current scope, for a price-range filter's bounds.
    async getPriceRange({ category, group } = {}) {
        try {
            const queries = [];
            if (category) queries.push(Query.equal('category', category));
            if (group) queries.push(Query.equal('group', group));
            const rows = await this._listAllRows(queries);
            if (rows.length === 0) return { min: 0, max: 0 };
            const prices = rows.map((r) => Number(r.price) || 0);
            return { min: Math.min(...prices), max: Math.max(...prices) };
        } catch (error) {
            console.error(error.message);
            return { min: 0, max: 0 };
        }
    }

}

const service = new Service();

export default service;