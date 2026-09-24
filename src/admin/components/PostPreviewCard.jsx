import React from 'react';
import { ImageOff } from 'lucide-react';

// Deliberately NOT skinned with any platform's brand colors/gradients —
// theme.txt's color system is closed (stone + brand + semantic red/emerald
// only). This is a rough structural preview, not a pixel clone of the app.
export function PostPreviewCard({ platform, title, caption, hashtags = [], imageUrl }) {
    return (
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-cream shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="flex aspect-square items-center justify-center bg-stone-100 dark:bg-stone-800">
                {imageUrl ? (
                    <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                    <ImageOff size={28} className="text-stone-400 dark:text-stone-500" />
                )}
            </div>
            <div className="space-y-2 p-4">
                {title && <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{title}</p>}
                {caption && <p className="whitespace-pre-wrap text-sm text-stone-700 dark:text-stone-300">{caption}</p>}
                {hashtags.length > 0 && (
                    <p className="text-sm text-brand-600 dark:text-brand-500">
                        {hashtags.map((h) => `#${h}`).join(' ')}
                    </p>
                )}
                <p className="pt-1 text-xs uppercase tracking-normal text-stone-400 dark:text-stone-500">
                    Preview for {platform}
                </p>
            </div>
        </div>
    );
}

export default PostPreviewCard;