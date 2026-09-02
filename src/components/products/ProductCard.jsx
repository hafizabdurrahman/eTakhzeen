import React from 'react';
import { Link } from 'react-router';
import service from '../../backend/service'; // ⚠️ adjust path to match where backend/ actually lives relative to this file
import { formatPKR } from '../../utils/formatPrice'; // ⚠️ adjust path

// Grid tile for a single product — used by Products.jsx's catalog grid.
// NOTE: the previous version of this file was an accidental copy of
// Orders.jsx (wrong component entirely, checking userData/orderService
// instead of rendering the `product` prop). That's why every card in the
// Products grid was stuck on "Loading your orders..." regardless of the
// catalog data being correct in Redux.
function ProductCard({ product }) {
    if (!product) return null;

    const inStock = product.status === true;

    return (
        <Link
            to={`/products/${product.category}/${product.group}/${product.slug}`}
            className="block border border-neutral-800 rounded-md overflow-hidden hover:border-neutral-600"
        >
            {product.fileId ? (
                <img
                    src={service.getImagePreview({ fileId: product.fileId })}
                    alt={product.name}
                    className="w-full h-40 object-cover"
                />
            ) : (
                <div className="w-full h-40 bg-neutral-800" />
            )}
            <div className="p-3">
                <p className="text-sm font-medium truncate">{product.name}</p>
                <p className="text-neutral-500 text-xs mb-1">{formatPKR(product.price)}</p>
                <p className={`text-xs ${inStock ? 'text-green-400' : 'text-red-400'}`}>
                    {inStock ? 'In stock' : 'Out of stock'}
                </p>
            </div>
        </Link>
    );
}

export default ProductCard;