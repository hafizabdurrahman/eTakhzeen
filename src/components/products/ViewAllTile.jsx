import React from 'react';
import { Link } from 'react-router';

function ViewAllTile({ to, label }) {
    return (
        <Link
            to={to}
            className="flex items-center justify-center border border-dashed border-neutral-700 rounded-lg p-4 hover:border-neutral-500 text-neutral-400 hover:text-neutral-200 min-h-[8rem]"
        >
            <span className="font-medium">{label} →</span>
        </Link>
    );
}

export default ViewAllTile;