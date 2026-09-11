import React from 'react';
import RootLayout from './RootLayout';
import StorefrontLayout from './StorefrontLayout';
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider, Navigate } from 'react-router';
import { Home, Contact, ContactEmptyState, ContactThread, Cart, Login, Signup, User, Products, Product, Error, Blocked, Orders, Order, Announcements } from './pages';
import { AllCategoriesPage, CategoryGroupsPage, AllGroupsPage, GroupProductsPage } from './pages';
import { CheckUser, CheckAdmin, RedirectIfAuthenticated } from './protectedRoutes';
import { UserPanelLayout } from './components';

import {
  AdminAnnouncements,
  AdminAnnouncementDetail,
  AdminContact,
  AdminContactEmptyState,
  AdminContactThread,
  AdminContactNewConversation,
  AdminDashboard,
  AdminLayout,
  AdminProducts,
  AdminUsers,
  AdminUserProfile,
  AdminOrders,
  AdminOrderDetail,
  AdminFinance,
} from "./admin";

import { OrderForm } from './components';

const router = createBrowserRouter(
  createRoutesFromElements(
    // Root: Provider/Theme/Auth/BlockedGuard for the ENTIRE app, plus the
    // one errorElement that now catches everything below it — admin and
    // user panels no longer need their own, since they're still children
    // of this route, just not of StorefrontLayout.
    <Route path='/' element={<RootLayout />} errorElement={<Error />}>

      {/* STOREFRONT — gets Header/Footer/AnnouncementPopup via StorefrontLayout */}
      <Route element={<StorefrontLayout />}>
        <Route index element={<Home />} />
        <Route path='contact' element={<Contact />}>
          <Route index element={<ContactEmptyState />} />
          <Route path=':department' element={<ContactThread />} />
        </Route>
        <Route path='blocked' element={<Blocked />} />
        <Route
          path='welcome-back'
          element={(
            <RedirectIfAuthenticated>
              <Login />
            </RedirectIfAuthenticated>
          )}
        />
        <Route
          path='create-account'
          element={(
            <RedirectIfAuthenticated>
              <Signup />
            </RedirectIfAuthenticated>
          )}
        />

        <Route path='checkout' element={<OrderForm />} />

        <Route path='announcements' element={<Announcements />} />
        <Route path='announcements/:announcementId' element={<Announcements />} />

        <Route path='products' element={<Products />} />
        <Route path='products/categories' element={<AllCategoriesPage />} />
        <Route path='products/groups' element={<AllGroupsPage />} />
        <Route path='products/category/:categoryName' element={<CategoryGroupsPage />} />
        <Route path='products/category/:categoryName/groups' element={<AllGroupsPage />} />
        <Route path='products/category/:categoryName/group/:groupName' element={<GroupProductsPage />} />
        <Route path='products/:category/:group/:slug' element={<Product />} />
      </Route>

      {/* USER PANEL — sibling of StorefrontLayout, so no Header/Footer,
          but still a child of RootLayout, so Redux/theme/auth/BlockedGuard
          still apply. */}
      <Route
        path=':username'
        element={(
          <CheckUser>
            <UserPanelLayout />
          </CheckUser>
        )}
      >
        <Route index element={<Navigate to="profile" replace />} />
        <Route path='profile' element={<User />} />
        <Route path='cart' element={<Cart />} />
        <Route path='orders' element={<Orders />} />
        <Route path='orders/:orderId' element={<Order />} />
        <Route path='announcements' element={<Announcements />} />
        <Route path='announcements/:announcementId' element={<Announcements />} />
      </Route>

      {/* ADMIN PANEL — same deal: no Header/Footer, still inside RootLayout. */}
      <Route
        path='admin'
        element={(
          <CheckAdmin>
            <AdminLayout />
          </CheckAdmin>
        )}
      >
        <Route index element={<AdminDashboard />} />
        <Route path='finance' element={<AdminFinance />} />
        <Route path='products' element={<AdminProducts />} />
        <Route path='users' element={<AdminUsers />} />
        <Route path='users/:username' element={<AdminUserProfile />} />
        <Route path='orders' element={<AdminOrders />} />
        <Route path='orders/:orderId' element={<AdminOrderDetail />} />
        <Route path='announcements' element={<AdminAnnouncements />} />
        <Route path='announcements/new' element={<AdminAnnouncementDetail />} />
        <Route path='announcements/:announcementId' element={<AdminAnnouncementDetail />} />
        <Route path='contact' element={<AdminContact />}>
          <Route index element={<AdminContactEmptyState />} />
          <Route path='new' element={<AdminContactNewConversation />} />
          <Route path=':conversationId' element={<AdminContactThread />} />
        </Route>
      </Route>

      <Route path='*' element={<Error />} />
    </Route>
  )
);

function App() {
  return <RouterProvider router={router} />;
}

export default App;