// Turns "  My Cool Product!! " into "my-cool-product"
export function slugify(text) {
    return (text || '')
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // strip special chars
        .replace(/\s+/g, '-')         // spaces -> dashes
        .replace(/-+/g, '-')          // collapse multiple dashes
        .replace(/^-+|-+$/g, '');     // trim leading/trailing dashes
}

// Turns a filename like "blue_running-shoe.jpg" into "Blue Running Shoe"
export function nameFromFilename(filename) {
    const withoutExt = filename.replace(/\.[^/.]+$/, '');
    const spaced = withoutExt.replace(/[_-]+/g, ' ').trim();
    return spaced
        .split(' ')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

// If slug is taken, appends -2, -3, ... until existingSlugs doesn't contain it.
export function makeSlugUnique(baseSlug, existingSlugs) {
    if (!existingSlugs.has(baseSlug)) return baseSlug;
    let i = 2;
    let candidate = `${baseSlug}-${i}`;
    while (existingSlugs.has(candidate)) {
        i += 1;
        candidate = `${baseSlug}-${i}`;
    }
    return candidate;
}

// Case-insensitive replace of every occurrence of `templateName` inside
// `template` with `productName`. Used in bulk "same for all" descriptions,
// e.g. template = "The Sample Widget is great" + templateName = "Sample Widget"
// + productName = "Red Mug" -> "The Red Mug is great"
export function buildDescriptionFromTemplate(template, templateName, productName) {
    if (!template) return template;
    if (!templateName || !templateName.trim()) return template;

    const escaped = templateName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(escaped, 'gi');
    return template.replace(pattern, productName);
}