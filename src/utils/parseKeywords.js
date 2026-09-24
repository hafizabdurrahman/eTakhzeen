// Appwrite stores a product's `keywords` as one comma-separated string
// (e.g. "handmade, cotton, rug"), not an array. Every place in the app that
// needs to loop over keywords must go through this helper instead of
// splitting the string inline — that keeps the parsing rule in exactly one
// place if the storage format ever changes.
export function parseKeywords(raw) {
    if (Array.isArray(raw)) return raw.map((k) => String(k).trim()).filter(Boolean);
    if (!raw || typeof raw !== 'string') return [];
    return raw
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);
}

// Turns "Home Decor" -> "homedecor" for use as a hashtag/tag fragment.
// Strips everything but letters/numbers so multi-word categories and
// groups become valid, spaceless hashtags.
export function slugifyForTag(value) {
    if (!value || typeof value !== 'string') return '';
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');
}

// Dedupes a list of keyword strings case-insensitively while preserving
// the casing of the first occurrence — used when merging keywords across
// every product in a category+group pair.
export function dedupeKeywords(list) {
    const seen = new Set();
    const out = [];
    list.forEach((k) => {
        const key = k.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            out.push(k);
        }
    });
    return out;
}