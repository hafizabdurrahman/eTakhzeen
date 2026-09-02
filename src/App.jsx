import React from 'react';
import Layout from './Layout';
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router';
import { Home, Contact, Cart, Login, Signup, User, Products, Product, Error, Blocked, Orders, Order, Announcements } from './pages'; // ⚠️ add Orders, Order, Announcements to your pages barrel export
import { AllCategoriesPage, CategoryGroupsPage, AllGroupsPage, GroupProductsPage } from './pages'; // ⚠️ add these 4 to your pages barrel export
import { CheckUser, CheckAdmin, RedirectIfAuthenticated } from './protectedRoutes';
import {
  AdminAnnouncements,
  AdminAnnouncementDetail,
  AdminContact,
  AdminDashboard,
  AdminLayout,
  AdminProducts,
  AdminUsers,
  AdminUserProfile,
  AdminOrders,
  AdminOrderDetail,
} from "./admin"; // ⚠️ add AdminAnnouncementDetail to your admin barrel export
import { OrderForm } from './components'; // ⚠️ adjust path if components/ isn't directly under src/

// Built ONCE at module scope, not inside App(). Creating this inside the
// component body meant a fresh router (and everything under it — Layout,
// the Redux Provider, every page's local state) got rebuilt on every
// App re-render, which is a likely cause of pages randomly resetting to
// "Loading..." mid-fetch.
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path='/' element={<Layout />} errorElement={<Error />}>
      <Route path='' element={<Home />} />
      <Route path='contact' element={<Contact />} />
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
      <Route
        path='user/:username'
        element={(
          <CheckUser>
            <User />
          </CheckUser>
        )}
      />

      {/* checkout is intentionally NOT wrapped in CheckUser — guests
          and brand-new users need to reach it too. OrderForm itself
          handles logging them in or creating an account inline. */}
      <Route path='checkout' element={<OrderForm />} />

      {/* Cart, username-scoped. */}
      <Route
        path=':username/cart'
        element={(
          <CheckUser>
            <Cart />
          </CheckUser>
        )}
      />

      {/* Order history + cancel (only while a given order is Pending). */}
      <Route
        path=':username/orders'
        element={(
          <CheckUser>
            <Orders />
          </CheckUser>
        )}
      />

      {/* Single order detail — cancel button only shows while Pending. */}
      <Route
        path=':username/orders/:orderId'
        element={(
          <CheckUser>
            <Order />
          </CheckUser>
        )}
      />

      {/* Announcements — list and detail share one component, switching
          on whether :announcementId is present. Not wrapped in CheckUser:
          the popup/bell can deep-link here for guests too, per
          AnnouncementPopup.jsx's "eligible" gate handling read-tracking
          separately. */}
      <Route path='announcements' element={<Announcements />} />
      <Route path='announcements/:announcementId' element={<Announcements />} />

      <Route
        path='admin'
        element={(
          <CheckAdmin>
            <AdminLayout />
          </CheckAdmin>
        )}
      >
        <Route index element={<AdminDashboard />} />
        <Route path='products' element={<AdminProducts />} />
        <Route path='users' element={<AdminUsers />} />
        <Route path='users/:username' element={<AdminUserProfile />} />
        <Route path='orders' element={<AdminOrders />} />
        <Route path='orders/:orderId' element={<AdminOrderDetail />} />
        <Route path='announcements' element={<AdminAnnouncements />} />
        <Route path='announcements/new' element={<AdminAnnouncementDetail />} />
        <Route path='announcements/:announcementId' element={<AdminAnnouncementDetail />} />
        <Route path='contact' element={<AdminContact />} />
      </Route>

      {/* Products browsing — every click here opens a new route/page. */}
      <Route path='products' element={<Products />} />
      <Route path='products/categories' element={<AllCategoriesPage />} />
      <Route path='products/groups' element={<AllGroupsPage />} />
      <Route path='products/category/:categoryName' element={<CategoryGroupsPage />} />
      <Route path='products/category/:categoryName/groups' element={<AllGroupsPage />} />
      <Route path='products/category/:categoryName/group/:groupName' element={<GroupProductsPage />} />

      <Route path='products/:category/:group/:slug' element={<Product />} />
    </Route>
  )
);

function App() {
  return <RouterProvider router={router} />;
}

export default App;