import React from 'react';
import { Link } from 'react-router';
import service from '../../backend/service'; // ⚠️ adjust path to match where backend/ actually lives relative to this file

function GroupTile({ name, count, sampleFileID, categoryName }) {
    return (
        <Link
            to={`/products/category/${encodeURIComponent(categoryName)}/group/${encodeURIComponent(name)}`}
            className="block text-left border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-600 w-full"
        >
            {sampleFileID ? (
                <img
                    src={service.getImagePreview({ fileId: sampleFileID })}
                    alt={name}
                    className="w-full h-48 object-cover"
                />
            ) : (
                <div className="w-full h-48 bg-neutral-800" />
            )}
            <div className="px-4 py-3">
                <p className="font-semibold text-lg">{name}</p>
                <p className="text-neutral-500 text-sm">{count} product{count === 1 ? '' : 's'}</p>
            </div>
        </Link>
    );
}

export default GroupTile;