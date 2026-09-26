import { createSlice, createAsyncThunk, createSelector } from "@reduxjs/toolkit";
import socialMedia from "../../backend/socialMedia"; // ⚠️ adjust path to match where backend/ actually lives relative to this file

// ---------------------------------------------------------------------------
// This slice backs the adminSocialMedia page:
//   - `generate...`  -> the "Generate" button on the post generator
//   - `posts`        -> a single platform tab's paginated list
//                       (youtube / tiktok / instagram / whatsappstatus / facebook)
//   - `overview`      -> ALL rows (unpaginated, capped), used to compute the
//                       Overview tab's graphs (heatmap, timeline, per-platform counts)
//
// `posts` and `overview` are kept separate on purpose: a platform tab only
// needs one page of its own rows, while Overview needs the whole table to
// draw accurate charts. Fetching them independently means switching tabs
// never re-triggers the (heavier) overview fetch, and vice versa.
// ---------------------------------------------------------------------------

const initialState = {
    // Platform tabs (youtube/tiktok/instagram/whatsappstatus/facebook) list view
    posts: {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        status: 'idle', // idle | loading | succeeded | failed
        error: null,
        currentRequestId: null,
    },

    // Overview tab's raw data source for graphs
    overview: {
        items: [],
        total: 0,
        status: 'idle',
        error: null,
        currentRequestId: null,
    },

    // Post generator button state
    generate: {
        status: 'idle',
        error: null,
        lastCreated: null,
    },

    filters: {
        platform: null, // null = all/overview; else 'youtube' | 'tiktok' | 'instagram' | 'whatsappstatus' | 'facebook'
    },
};

// ---- Thunks ----------------------------------------------------------------

// Fired by the "Generate" button after the post HTML has been built.
export const generateSocialMediaPost = createAsyncThunk(
    'socialMedia/generatePost',
    async ({ platform, postData, products = [] }, { rejectWithValue }) => {
        const row = await socialMedia.createPost({ platform, postData, products });
        if (!row) return rejectWithValue('Failed to save the generated post.');
        return row;
    }
);

export const updateSocialMediaPost = createAsyncThunk(
    'socialMedia/updatePost',
    async ({ rowId, platform, postData, products }, { rejectWithValue }) => {
        const row = await socialMedia.updatePost({ rowId, platform, postData, products });
        if (!row) return rejectWithValue('Failed to update the post.');
        return row;
    }
);

export const deleteSocialMediaPost = createAsyncThunk(
    'socialMedia/deletePost',
    async (rowId, { rejectWithValue }) => {
        const ok = await socialMedia.deletePost(rowId);
        if (!ok) return rejectWithValue('Failed to delete the post.');
        return rowId;
    }
);

// One page of a single platform tab (or everything, if platform is omitted).
export const fetchSocialMediaPosts = createAsyncThunk(
    'socialMedia/fetchPosts',
    async ({ platform, page = 1, pageSize = 20 } = {}, { rejectWithValue }) => {
        const offset = (page - 1) * pageSize;
        const result = await socialMedia.getPosts({ platform, limit: pageSize, offset });
        if (!result) return rejectWithValue('Failed to load posts.');
        return { ...result, page, pageSize };
    }
);

// Every row (capped), for the Overview tab's graphs.
export const fetchSocialMediaOverview = createAsyncThunk(
    'socialMedia/fetchOverview',
    async ({ platform } = {}, { rejectWithValue }) => {
        const result = await socialMedia.getAllPosts({ platform });
        if (!result) return rejectWithValue('Failed to load overview data.');
        return result;
    }
);

// ---- Slice ------------------------------------------------------------------

export const socialMediaSlice = createSlice({
    name: "socialMedia",
    initialState,
    reducers: {
        setPlatformFilter: (s, a) => {
            s.filters.platform = a.payload;
            s.posts.page = 1;
        },
        setPostsPage: (s, a) => {
            s.posts.page = a.payload;
        },
        resetGenerateStatus: (s) => {
            s.generate.status = 'idle';
            s.generate.error = null;
        },
        clearSocialMediaPosts: (s) => {
            s.posts = initialState.posts;
        },
    },
    extraReducers: (builder) => {
        builder
            // ---- generate ----
            .addCase(generateSocialMediaPost.pending, (s) => {
                s.generate.status = 'loading';
                s.generate.error = null;
            })
            .addCase(generateSocialMediaPost.fulfilled, (s, a) => {
                s.generate.status = 'succeeded';
                s.generate.lastCreated = a.payload;

                // Reflect the new post immediately, without waiting on a refetch.
                if (!s.filters.platform || s.filters.platform === a.payload.platform) {
                    s.posts.items.unshift(a.payload);
                    s.posts.total += 1;
                }
                s.overview.items.unshift(a.payload);
                s.overview.total += 1;
            })
            .addCase(generateSocialMediaPost.rejected, (s, a) => {
                s.generate.status = 'failed';
                s.generate.error = a.payload || a.error.message;
            })

            // ---- update ----
            .addCase(updateSocialMediaPost.fulfilled, (s, a) => {
                const patch = (row) => (row['$id'] === a.payload['$id'] ? a.payload : row);
                s.posts.items = s.posts.items.map(patch);
                s.overview.items = s.overview.items.map(patch);
            })

            // ---- delete ----
            .addCase(deleteSocialMediaPost.fulfilled, (s, a) => {
                const rowId = a.payload;
                const hadInPosts = s.posts.items.some((row) => row['$id'] === rowId);
                const hadInOverview = s.overview.items.some((row) => row['$id'] === rowId);

                s.posts.items = s.posts.items.filter((row) => row['$id'] !== rowId);
                if (hadInPosts) s.posts.total = Math.max(0, s.posts.total - 1);

                s.overview.items = s.overview.items.filter((row) => row['$id'] !== rowId);
                if (hadInOverview) s.overview.total = Math.max(0, s.overview.total - 1);
            })

            // ---- fetchSocialMediaPosts (platform tab) ----
            // requestId is tracked so a slower, older request can't stomp a
            // newer one's results if the tab/platform is switched quickly.
            .addCase(fetchSocialMediaPosts.pending, (s, a) => {
                s.posts.status = 'loading';
                s.posts.error = null;
                s.posts.currentRequestId = a.meta.requestId;
            })
            .addCase(fetchSocialMediaPosts.fulfilled, (s, a) => {
                if (a.meta.requestId !== s.posts.currentRequestId) return; // stale response
                s.posts.status = 'succeeded';
                s.posts.items = a.payload.rows;
                s.posts.total = a.payload.total;
                s.posts.page = a.payload.page;
                s.posts.pageSize = a.payload.pageSize;
            })
            .addCase(fetchSocialMediaPosts.rejected, (s, a) => {
                if (a.meta.requestId !== s.posts.currentRequestId) return; // stale response
                s.posts.status = 'failed';
                s.posts.error = a.payload || a.error.message;
            })

            // ---- fetchSocialMediaOverview (Overview tab graphs) ----
            .addCase(fetchSocialMediaOverview.pending, (s, a) => {
                s.overview.status = 'loading';
                s.overview.error = null;
                s.overview.currentRequestId = a.meta.requestId;
            })
            .addCase(fetchSocialMediaOverview.fulfilled, (s, a) => {
                if (a.meta.requestId !== s.overview.currentRequestId) return; // stale response
                s.overview.status = 'succeeded';
                s.overview.items = a.payload.rows;
                s.overview.total = a.payload.total;
            })
            .addCase(fetchSocialMediaOverview.rejected, (s, a) => {
                if (a.meta.requestId !== s.overview.currentRequestId) return; // stale response
                s.overview.status = 'failed';
                s.overview.error = a.payload || a.error.message;
            });
    },
});

export const {
    setPlatformFilter, setPostsPage, resetGenerateStatus, clearSocialMediaPosts,
} = socialMediaSlice.actions;

export default socialMediaSlice.reducer;

// ---- Selectors (state.socialMedia — adjust key if you mount the reducer under a different name) ----

export const selectSocialMediaPosts = (state) => state.socialMedia.posts.items;
export const selectSocialMediaPostsStatus = (state) => state.socialMedia.posts.status;
export const selectSocialMediaPostsTotal = (state) => state.socialMedia.posts.total;

export const selectSocialMediaOverviewItems = (state) => state.socialMedia.overview.items;
export const selectSocialMediaOverviewStatus = (state) => state.socialMedia.overview.status;

export const selectGenerateStatus = (state) => state.socialMedia.generate.status;
export const selectGenerateError = (state) => state.socialMedia.generate.error;

export const selectPlatformFilter = (state) => state.socialMedia.filters.platform;

// Posts per platform, for a bar/pie chart: { youtube: 12, tiktok: 4, ... }
// createSelector memoizes on `items` — if the overview data hasn't changed,
// the same object reference is returned instead of a freshly-built one, so
// react-redux won't warn about (or re-render on) an "unchanged" result.
export const selectPlatformCounts = createSelector(
    [selectSocialMediaOverviewItems],
    (items) =>
        items.reduce((acc, row) => {
            const key = row.platform || 'unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {})
);

// Day-of-week x hour-of-day grid, for a heatmap of *when* posts get created.
// Returns a flat array of { day, hour, count } — day: 0=Sun ... 6=Sat.
export const selectPostsHeatmap = createSelector(
    [selectSocialMediaOverviewItems],
    (items) => {
        const grid = Array.from({ length: 7 }, () => Array(24).fill(0));

        items.forEach((row) => {
            const created = row['$createdAt'];
            if (!created) return;
            const d = new Date(created);
            grid[d.getDay()][d.getHours()] += 1;
        });

        const cells = [];
        for (let day = 0; day < 7; day++) {
            for (let hour = 0; hour < 24; hour++) {
                cells.push({ day, hour, count: grid[day][hour] });
            }
        }
        return cells;
    }
);

// Posts created per calendar day, for a line/bar timeline chart.
// Returns [{ date: 'YYYY-MM-DD', count }], sorted ascending by date.
export const selectPostsTimeline = createSelector(
    [selectSocialMediaOverviewItems],
    (items) => {
        const counts = {};

        items.forEach((row) => {
            const created = row['$createdAt'];
            if (!created) return;
            const date = created.slice(0, 10); // YYYY-MM-DD
            counts[date] = (counts[date] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    }
);

// Most recently created posts, for an "activity feed" on the Overview tab.
// A factory (not a single selector) because `limit` varies by call site;
// memoize the *instance* per limit at the call site, e.g.:
//   const selectRecent10 = useMemo(() => selectRecentSocialMediaPosts(10), []);
//   const recent = useSelector(selectRecent10);
// Calling `selectRecentSocialMediaPosts(10)` fresh inside useSelector every
// render defeats the memoization below — hoist it as shown above.
export const selectRecentSocialMediaPosts = (limit = 10) =>
    createSelector([selectSocialMediaOverviewItems], (items) => items.slice(0, limit));

// Entries in the exact shape src/ui/HeatmapCalendar expects:
// [{ date, count, item }] — one entry per post row, HeatmapCalendar buckets
// them by day itself. Memoized on `items` so an unchanged overview list
// doesn't produce a new array reference on every render.
export const selectSocialMediaHeatmapEntries = createSelector(
    [selectSocialMediaOverviewItems],
    (items) =>
        items
            .filter((row) => row['$createdAt'])
            .map((row) => ({ date: row['$createdAt'], count: 1, item: row }))
);

// How many distinct products have at least one post, and how many of those
// have more than one post (products col is an array of product IDs per row).
// Returns { productsWithPosts, productsWithMultiplePosts, countsByProduct }.
export const selectProductPostStats = createSelector(
    [selectSocialMediaOverviewItems],
    (items) => {
        const counts = {};

        items.forEach((row) => {
            const products = Array.isArray(row.products) ? row.products : [];
            products.forEach((id) => {
                counts[id] = (counts[id] || 0) + 1;
            });
        });

        const ids = Object.keys(counts);
        const multiple = ids.filter((id) => counts[id] > 1);

        return {
            productsWithPosts: ids.length,
            productsWithMultiplePosts: multiple.length,
            countsByProduct: counts,
        };
    }
);

// Daily post counts per platform, in the shape src/ui/TrendAreaChart expects
// for its `series`/`xLabels` props: one line per platform showing how many
// posts were created on each day in the data's date range.
// Returns { xLabels: string[], series: [{ key, name, values: number[] }] }
export const selectPlatformTrend = createSelector(
    [selectSocialMediaOverviewItems],
    (items) => {
        if (items.length === 0) return { xLabels: [], series: [] };

        const dayKey = (iso) => iso.slice(0, 10);
        const stamped = items.filter((r) => r['$createdAt']);
        if (stamped.length === 0) return { xLabels: [], series: [] };

        const sortedDays = stamped.map((r) => dayKey(r['$createdAt'])).sort();
        const start = new Date(sortedDays[0]);
        const end = new Date(sortedDays[sortedDays.length - 1]);

        const xLabels = [];
        const cursor = new Date(start);
        while (cursor <= end) {
            xLabels.push(dayKey(cursor.toISOString()));
            cursor.setDate(cursor.getDate() + 1);
        }

        const platforms = Array.from(new Set(stamped.map((r) => r.platform || 'unknown')));

        const series = platforms.map((platform) => {
            const counts = Object.fromEntries(xLabels.map((d) => [d, 0]));
            stamped.forEach((r) => {
                if ((r.platform || 'unknown') !== platform) return;
                const d = dayKey(r['$createdAt']);
                if (d in counts) counts[d] += 1;
            });
            return { key: platform, name: platform, values: xLabels.map((d) => counts[d]) };
        });

        return { xLabels, series };
    }
);