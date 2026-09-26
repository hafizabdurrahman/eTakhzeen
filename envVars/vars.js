const vars = {
    
    eTakhzeenURL: String(import.meta.env.VITE_ETAKHZEEN_URL),

    eTakhzeenProjectId: String(import.meta.env.VITE_ETAKHZEEN_PROJECT_ID),

    eTakhzeenDatabaseId: String(import.meta.env.VITE_ETAKHZEEN_DATABASE_ID),

    eTakhzeenTableId: String(import.meta.env.VITE_ETAKHZEEN_TABLE_ID),

    eTakhzeenBucketId: String(import.meta.env.VITE_ETAKHZEEN_BUCKET_ID),
    
    eTakhzeenConversionTableId: String(import.meta.env.VITE_ETAKHZEEN_CONVERSION_TABLE_ID), // as table id can't be change so conatct id is of the conversion table id and vise versa

    eTakhzeenContactTableId: String(import.meta.env.VITE_ETAKHZEEN_CONTACT_TABLE_ID),

    eTakhzeenResponseTable: String(import.meta.env.VITE_ETAKHZEEN_RESPONSE_TABLE_ID),

    eTakhzeenFAQTableId: String(import.meta.env.VITE_ETAKHZEEN_FAQ_TABLE_ID),

    eTakhzeenContactBucketId: String(import.meta.env.VITE_ETAKHZEEN_BUCKET_ID),

    eTakhzeenAllUsersTable: String(import.meta.env.VITE_ETAKHZEEN_ALL_USERS_TABLE_ID),

    eTakhzeenOrderTableId: String(import.meta.env.VITE_ETAKHZEEN_ORDER_TABLE_ID),

    eTakhzeenAnnouncementTableId: String(import.meta.env.VITE_ETAKHZEEN_ANNOUNCEMENT_TABLE_ID),
    
    eTakhzeenAnnouncementResponseTableId: String(import.meta.env.VITE_ETAKHZEEN_ANNOUNCEMENT_RESPONSE_TABLE_ID),

    eTakhzeenAnnouncementBucketId: String(import.meta.env.VITE_ETAKHZEEN_BUCKET_ID),
 
    eTakhzeenReviewsTableId: String(import.meta.env.VITE_ETAKHZEEN_REVIEWS_TABLE_ID),

    eTakhzeenReturnTableId: String(import.meta.env.VITE_ETAKHZEEN_RETURN_TABLE_ID),

    eTakhzeenSocialMediaTableId: String(import.meta.env.ETAKHZEEN_SOCIAL_MEDIA_POST_TABLE_ID),
}

export default vars;