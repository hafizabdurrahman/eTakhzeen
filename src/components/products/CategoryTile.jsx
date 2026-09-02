import React from 'react';
import { Link } from 'react-router';
import service from '../../backend/service'; // ⚠️ adjust path to match where backend/ actually lives relative to this file

function CategoryTile({ name, sampleFileID }) {
    return (
        <Link
            to={`/products/category/${encodeURIComponent(name)}`}
            className="block text-left border border-neutral-800 rounded-lg overflow-hidden hover:border-neutral-600 w-full"
        >
            {sampleFileID ? (
                <img
                    src={service.getImagePreview({ fileId: sampleFileID })}
                    alt={name}
                    className="w-full h-32 object-cover"
                />
            ) : (
                <div className="w-full h-32 bg-neutral-800" />
            )}
            <p className="font-medium px-3 py-2">{name}</p>
        </Link>
    );
}

export default CategoryTile;