// Save this as: src/utils/propertiesFile.js  (same folder as slug.js)
//
// Shared helpers for reading a "properties" file (JSON, or plain text with
// one `key: value` / `key=value` / `key,value` per line).

export const DESCRIPTION_FILE_NAME = 'description.txt';

// NOTE: the values here are FIELD NAMES, so they must be strings
// (never Number('price') etc.).
export const FIELD_ALIASES = {
    name: 'name', productname: 'name', title: 'name',
    description: 'description', desc: 'description',
    templatename: 'templateName',
    price: 'price', sellingprice: 'price',
    costprice: 'costPrice', cost: 'costPrice',
    category: 'category',
    group: 'group',
    slug: 'slug',
    isreturnable: 'isReturnable', returnable: 'isReturnable',
    keywords: 'keywords', tags: 'keywords',
    sellerlocation: 'sellerLocation', location: 'sellerLocation',
    // FIELD_ALIASES — add a line right after deliveryduration/delivery:
    deliveryduration: 'deliveryDuration', delivery: 'deliveryDuration',
    deliveryprice: 'deliveryPrice', deliveryfee: 'deliveryPrice', shippingcost: 'deliveryPrice', shippingprice: 'deliveryPrice',
    featured: 'featured', isfeatured: 'featured',
};

export const normalizeKey = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');

const stripQuotes = (s) => s.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');

// Returns an array of [key, value] pairs from JSON or "key: value" text.
export function parsePropertiesFile(rawText) {
    const text = rawText.replace(/^\uFEFF/, '').trim();
    if (!text) throw new Error('The file is empty.');

    if (text.startsWith('{')) {
        return Object.entries(JSON.parse(text));
    }

    const pairs = [];
    for (const line of text.split(/\r?\n/)) {
        const l = line.trim();
        if (!l || l.startsWith('#')) continue;
        const m = l.match(/^([^:=,\t]+?)\s*[:=,\t]\s*(.*)$/);
        if (!m) continue;
        pairs.push([stripQuotes(m[1].trim()), stripQuotes(m[2].trim())]);
    }
    if (pairs.length === 0) throw new Error('No "key: value" pairs found in the file.');
    return pairs;
}

export function toBool(v) {
    if (typeof v === 'boolean') return v;
    const s = String(v).trim().toLowerCase();
    if (['true', 'yes', 'y', '1', 'on'].includes(s)) return true;
    if (['false', 'no', 'n', '0', 'off', ''].includes(s)) return false;
    return null; // not understood
}

export function toKeywordString(v) {
    const list = Array.isArray(v) ? v : String(v).split(',');
    const seen = new Set();
    const out = [];
    for (const item of list) {
        const k = String(item).trim();
        if (k && !seen.has(k.toLowerCase())) {
            seen.add(k.toLowerCase());
            out.push(k);
        }
    }
    return out.join(',');
}

// Finds the description file among the files picked with a folder input.
// Tries, in order:
//   1. description.txt / description.json (any capitalisation)
//   2. any .txt/.json whose name starts with "description"
//      (e.g. "description.txt.txt", "Description (1).txt")
//   3. the only .txt/.json file in the folder, whatever it's called
// If several match, the one closest to the top of the folder wins.
export function findDescriptionFile(files) {
    const depth = (f) => (f.webkitRelativePath || f.name).split('/').length;
    const byDepth = (a, b) => depth(a) - depth(b);
    const clean = (f) => f.name.trim().toLowerCase();

    const textFiles = files.filter((f) => /\.(txt|json)$/i.test(f.name.trim()));

    const exact = textFiles
        .filter((f) => ['description.txt', 'description.json'].includes(clean(f)))
        .sort(byDepth);
    if (exact.length) return exact[0];

    const loose = textFiles.filter((f) => clean(f).startsWith('description')).sort(byDepth);
    if (loose.length) return loose[0];

    if (textFiles.length === 1) return textFiles[0];

    return null;
}