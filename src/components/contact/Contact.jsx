// import React, { useState, useEffect, useCallback } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import conversationService from '../../backend/conversation'; // ⚠️ adjust path
// import contactService from '../../backend/contact'; // ⚠️ adjust path
// import mainService from '../../backend/main'; // ⚠️ adjust path
// import { setCurrentConversation } from '../../store/slices/conversationsSlice'; // ⚠️ adjust path
// import { DepartmentTabs, ProductPicker, QuickQuestions, ChatThread } from '../.'; // ⚠️ adjust path

// export default function Contact() {
//     const dispatch = useDispatch();

//     // Real fields from your userSlice.
//     const isLoggedIn = useSelector((state) => state.user.status);
//     const userData = useSelector((state) => state.user.userData);

//     const [department, setDepartment] = useState('admin');
//     const [product, setProduct] = useState({ productId: null, productName: null });
//     const conversation = useSelector((state) => state.conversations.current);

//     const loadConversation = useCallback(async (dept) => {
//         if (!isLoggedIn || !userData?.$id) return;
//         const convo = await conversationService.getOrCreate({
//             userId: userData.$id,
//             userName: userData.name || null,
//             userEmail: userData.email || null,
//             department: dept,
//             productId: product.productId,
//             productName: product.productName,
//         });
//         if (convo) dispatch(setCurrentConversation(convo));
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [isLoggedIn, userData?.$id, dispatch]);

//     useEffect(() => {
//         loadConversation(department);
//     }, [department, loadConversation]);

//     const handleQuickQuestion = async (faqItem) => {
//         if (!conversation) return;

//         const userRow = await contactService.send({
//             conversationId: conversation.$id,
//             userId: userData.$id,
//             department,
//             content: faqItem.question,
//             type: 'quick_question',
//             quickQuestionId: faqItem.$id,
//         });
//         if (userRow) {
//             await conversationService.markUserMessage({ conversationId: conversation.$id, preview: faqItem.question });
//         }

//         // Auto-answer, written as an "admin" reply so it reads like an
//         // instant response instead of the user talking to themself.
//         // ⚠️ This writes to the Response table from the CLIENT — only works
//         // if buildRowPermissions grants the conversation owner
//         // (Role.user(userId)) create/update on Response rows, or if your
//         // Response table-level permissions allow `users` to create. If you'd
//         // rather keep Response writes staff-only, move this specific call
//         // into an Appwrite Function instead of calling it here.
//         const answerRow = await mainService.send({
//             conversationId: conversation.$id,
//             userId: userData.$id,
//             department,
//             adminId: 'auto-reply',
//             adminName: 'Quick Answer',
//             content: faqItem.answer,
//         });
//         if (answerRow) {
//             await conversationService.markAdminMessage({ conversationId: conversation.$id, preview: faqItem.answer });
//         }
//     };

//     if (!isLoggedIn) {
//         return <div className="contact-page">Please log in to contact us.</div>;
//     }

//     return (
//         <div className="contact-page">
//             <h1>Contact Us</h1>

//             <DepartmentTabs value={department} onChange={setDepartment} />

//             <ProductPicker value={product} onChange={setProduct} />

//             <QuickQuestions
//                 department={department}
//                 productId={product.productId}
//                 onPick={handleQuickQuestion}
//             />

//             <ChatThread
//                 conversation={conversation}
//                 currentRole="user"
//                 currentUserId={userData?.$id}
//             />
//         </div>
//     );
// }

import React from 'react'

function Contact() {
  return (
    <div>Contact</div>
  )
}

export default Contact