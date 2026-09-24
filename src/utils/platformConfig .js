// One entry per platform. `fields` drives which inputs PostComposer renders.
// Limits reflect each platform's published guidance — reconfirm these
// before shipping, as platforms change them without notice.
export const PLATFORM_CONFIG = {
    instagram: {
        label: 'Instagram',
        fields: ['caption', 'hashtags'],
        captionLimit: 2200,
        hashtagLimit: 30,
    },
    tiktok: {
        label: 'TikTok',
        fields: ['caption', 'hashtags'],
        captionLimit: 150,
        hashtagLimit: 5,
    },
    facebook: {
        label: 'Facebook',
        fields: ['caption'],
        captionLimit: 63206,
        hashtagLimit: null,
    },
    youtube: {
        label: 'YouTube',
        fields: ['title', 'description', 'tags'],
        titleLimit: 100,
        descriptionLimit: 5000,
        // YouTube's tag limit is a total character budget across every tag
        // combined, not a count of tags — enforce it as a sum, not a length.
        tagCharLimit: 500,
    },
};

export const PLATFORM_ORDER = ['instagram', 'tiktok', 'facebook', 'youtube'];