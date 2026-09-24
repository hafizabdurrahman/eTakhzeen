import { useCallback, useState } from 'react';

// There is no posts table or Redux slice for this feature yet — this is a
// deliberately in-memory, session-only store. It resets on refresh and is
// NOT wired to the Overview tab's stat cards (those stay static placeholders
// until a real backend exists). It exists so the composer can show a
// "saved this session" list and a save confirmation, without inventing a
// fake persistence layer.
export default function usePostDraftState() {
    const [posts, setPosts] = useState([]); // { id, platform, status: 'draft' | 'starred', content, createdAt }

    const savePost = useCallback((platform, content, status = 'draft') => {
        setPosts((prev) => [
            {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                platform,
                status,
                content,
                createdAt: new Date().toISOString(),
            },
            ...prev,
        ]);
    }, []);

    const toggleStar = useCallback((id) => {
        setPosts((prev) =>
            prev.map((p) => (p.id === id ? { ...p, status: p.status === 'starred' ? 'draft' : 'starred' } : p))
        );
    }, []);

    const removePost = useCallback((id) => {
        setPosts((prev) => prev.filter((p) => p.id !== id));
    }, []);

    return { posts, savePost, toggleStar, removePost };
}