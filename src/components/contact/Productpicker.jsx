// import React, { useState, useEffect, useRef } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import { fetchCatalogPage } from '../../store/slices/productSlice'; // ⚠️ adjust path/filename to match your real productSlice file

// /**
//  * Lightweight product search for tagging a conversation to a product.
//  * Deliberately calls fetchCatalogPage with its OWN throwaway filters object
//  * instead of dispatching setFilter — so it never touches
//  * state.products.filters, which your actual Products browsing pages own.
//  */
// export default function ProductPicker({ value, onChange }) {
//     const dispatch = useDispatch();
//     const [term, setTerm] = useState('');
//     const [open, setOpen] = useState(false);
//     const results = useSelector((state) => state.products.catalog.items);
//     const status = useSelector((state) => state.products.catalog.status);
//     const debounceRef = useRef(null);

//     useEffect(() => {
//         if (!term.trim()) return undefined;
//         clearTimeout(debounceRef.current);
//         debounceRef.current = setTimeout(() => {
//             dispatch(fetchCatalogPage({
//                 page: 1,
//                 pageSize: 8,
//                 filters: {
//                     category: null,
//                     group: null,
//                     minPrice: null,
//                     maxPrice: null,
//                     sortBy: 'name-asc',
//                     searchTerm: term,
//                     stockFilter: 'all',
//                 },
//             }));
//         }, 350);
//         return () => clearTimeout(debounceRef.current);
//     }, [term, dispatch]);

//     const pick = (product) => {
//         onChange({ productId: product.$id, productName: product.name });
//         setTerm(product.name);
//         setOpen(false);
//     };

//     const clear = () => {
//         onChange({ productId: null, productName: null });
//         setTerm('');
//     };

//     return (
//         <div className="product-picker">
//             <input
//                 type="text"
//                 placeholder="Search a product to attach (optional)..."
//                 value={term}
//                 onChange={(e) => { setTerm(e.target.value); setOpen(true); }}
//                 onFocus={() => setOpen(true)}
//             />
//             {value?.productId && (
//                 <button type="button" onClick={clear}>Clear</button>
//             )}
//             {open && term.trim() && (
//                 <ul className="product-picker__results">
//                     {status === 'loading' && <li>Searching...</li>}
//                     {status !== 'loading' && results.length === 0 && <li>No matches.</li>}
//                     {results.map((product) => (
//                         <li key={product.$id} onClick={() => pick(product)}>
//                             {product.name}
//                         </li>
//                     ))}
//                 </ul>
//             )}
//         </div>
//     );
// }

import React from 'react'

function Productpicker() {
  return (
    <div>Productpicker</div>
  )
}

export default Productpicker