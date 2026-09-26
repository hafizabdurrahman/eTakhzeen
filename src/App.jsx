import React from 'react';
import RootLayout from './RootLayout';
import StorefrontLayout from './StorefrontLayout';
import AuthLayout from './AuthLayout'; // ⚠️ adjust path — put AuthLayout.jsx alongside RootLayout/StorefrontLayout
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
  AdminSettings,
  AdminSocialMedia,
  UnderConstruction
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

      {/* AUTH — sibling of StorefrontLayout, so no Header/Footer/announcement
          popup, just AuthLayout's neon background centering the form. Still
          a child of RootLayout, so Redux/theme/auth/BlockedGuard still apply,
          and RedirectIfAuthenticated still bounces logged-in users away. */}
      <Route element={<AuthLayout />}>
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
        <Route path='settings' element={<AdminSettings />} />
        <Route path='users/:username' element={<AdminUserProfile />} />
        <Route path='orders' element={<AdminOrders />} />
        <Route path='orders/:orderId' element={<AdminOrderDetail />} />
        <Route path='announcements' element={<AdminAnnouncements />} />
        <Route path='announcements/new' element={<AdminAnnouncementDetail />} />
        <Route path='announcements/:announcementId' element={<AdminAnnouncementDetail />} />
        <Route path='socialMedia' element={<AdminSocialMedia />} />
        {/* <Route path='contact' element={<AdminContact />}>
          <Route index element={<AdminContactEmptyState />} />
          <Route path='new' element={<AdminContactNewConversation />} />
          <Route path=':conversationId' element={<AdminContactThread />} />
        </Route> */}
        <Route
          path="contact"
          element={
            <UnderConstruction
              title="Contact"
              description="Contact section is under construction"
              note="Expected in the next release"
              progress={22}
              onBack={() => window.history.back()}
            />
          }
        />
        <Route
          path="layout"
          element={
            <UnderConstruction
              title="Layout"
              description="Layout section is under construction"
              note="Expected in the next release"
              progress={15}
              onBack={() => window.history.back()}
            />
          }
        />
      </Route>
      <Route
          path="sell"
          element={
              <UnderConstruction
                  title="Seller Accounts"
                  description="Business and seller accounts are on the way — list your own products, manage orders, and reach shoppers already here."
                  note="Coming soon"
                  progress={35}
                  onBack={() => window.history.back()}
              />
          }
      />
      <Route path="privacy" element={<UnderConstruction title="Privacy Policy" description="Our privacy policy is being finalized." onBack={() => window.history.back()} />} />
      <Route path="terms" element={<UnderConstruction title="Terms of Service" description="Our terms of service are being finalized." onBack={() => window.history.back()} />} />
      <Route path="shipping-returns" element={<UnderConstruction title="Shipping & Returns" description="Our shipping and returns policy is being finalized." onBack={() => window.history.back()} />} />

      <Route path='*' element={<Error />} />
    </Route>
  )
);

function App() {
  return (
      <RouterProvider router={router} />
  )
}

export default App;