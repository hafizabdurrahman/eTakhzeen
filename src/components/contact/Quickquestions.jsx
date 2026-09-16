// import React, { useEffect } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import faqService from '../../backend/faq'; // ⚠️ adjust path
// import { setFaqItems, setFaqLoading } from '../../store/slices/faqSlice'; // ⚠️ adjust path

// export default function QuickQuestions({ department, productId, onPick }) {
//     const dispatch = useDispatch();
//     const items = useSelector((state) => state.faq.items);
//     const loading = useSelector((state) => state.faq.loading);

//     useEffect(() => {
//         let active = true;
//         (async () => {
//             dispatch(setFaqLoading(true));
//             const rows = await faqService.listFor({ department, productId });
//             if (active) dispatch(setFaqItems(rows));
//             dispatch(setFaqLoading(false));
//         })();
//         return () => { active = false; };
//     }, [department, productId, dispatch]);

//     if (loading || items.length === 0) return null;

//     return (
//         <div className="quick-questions">
//             {items.map((item) => (
//                 <button
//                     key={item.$id}
//                     type="button"
//                     className="quick-questions__chip"
//                     onClick={() => onPick(item)}
//                 >
//                     {item.question}
//                 </button>
//             ))}
//         </div>
//     );
// }

import React from 'react'

function Quickquestions() {
  return (
    <div>Quickquestions</div>
  )
}

export default Quickquestions