# Order Handling System — How It Works

This document explains the checkout/order flow added to the app: what data
gets stored, how the different files talk to each other, and what rules
govern updates. It assumes familiarity with the existing cart system
(`cartSlice.js`, `user.js`'s cart methods) — this builds on top of that.

## 1. The core idea

An order is a **receipt**, not a live record. When someone checks out, we
snapshot everything about that moment — who they are, what they bought, at
what price, where it's going, how they're paying — into one row. Nothing
about that row ever changes afterward except its `status`, and even that is
tightly restricted (see §5).

This is different from the old design, where a cart checkout created one
order row **per product**. Now, **one checkout = one row**, whether it's a
single "Order Now" click or a full multi-item cart checkout.

## 2. The order table schema

| Column          | Type    | Notes |
|-----------------|---------|-------|
| `username`      | string  | Buyer's username at order time (snapshot) |
| `email`         | string  | Snapshot |
| `phone`         | string  | Snapshot |
| `name`          | string  | Snapshot |
| `address`       | string  | Delivery address for *this* order (snapshot) |
| `items`         | string  | `JSON.stringify([{ productId, name, price, quantity, fileId }])` — make this column large (5000+ chars) since a full-cart checkout can have many line items |
| `total`         | float   | `sum(price * quantity)` across `items`, computed server-side (well, client-side in `order.js`) at order time |
| `paymentMethod` | string  | `"Advance"` or `"COD"` |
| `status`        | string  | `"Pending"` → `"Out for Delivery"` → `"Delivered"`, or `"Pending"` → `"Cancelled"`. Always starts as `"Pending"` |

**Why snapshot the product name/price/image instead of just `productId`?**
If a product is later deleted, discounted, or renamed, past orders should
still show what the customer actually bought and paid — the same reasoning
`cartSlice.js` uses to store full product objects rather than just IDs.

## 3. Files touched

- **`src/backend/order.js`** — rewritten. `createOrder()` now takes an
  `items` array (works for 1 item or many) instead of one row per product.
  New methods: `getUserOrders()`, `getOrder()`, `cancelOrder()`,
  `updateOrderStatus()`.
- **`src/backend/user.js`** — one method added: `updateUserAddress()`. This
  is the *only* write path from checkout back into the user table.
- **`src/backend/auth.js`** — one method added: `loginOrSignup()`. Combines
  the existing `login()` and `signup()` for the "checking out without being
  logged in" case, without changing how those two behave anywhere else.
- **`src/components/forms/OrderForm.jsx`** — new. The actual checkout page.
- **`src/pages/Orders.jsx`** — new. Order history at `/:username/orders`.
- **`src/pages/Cart.jsx`** — `handleCheckout()` now navigates to
  `/checkout` with the cart items in route state, instead of calling
  `orderService` directly.
- **`src/pages/Product.jsx`** — `handleOrderNow()` adds the product to the
  cart (if logged in) then navigates to `/checkout` the same way.
- **`src/App.jsx`** — three new routes: `/checkout`, `/:username/cart`,
  `/:username/orders`.

## 4. The checkout flow, step by step

1. **Entry point.** Clicking "Order Now" on a product page, or "Checkout"
   on the cart page, calls `navigate('/checkout', { state: { items, mode } })`.
   - `items` is always `[{ product, quantity }, ...]` — the same shape
     `cartSlice.js` already uses.
   - `mode` is `'single'` (one product, from the product page) or `'cart'`
     (the whole cart).
2. **`/checkout` is public** — not wrapped in the `CheckUser` guard, because
   guests and brand-new users need to reach it too.
3. **`OrderForm` reads `location.state.items`.** If there's nothing there
   (someone typed the URL directly), it shows a "go to your cart" message
   instead of crashing.
4. **Identity resolution:**
   - If already logged in, the form skips straight to the order fields,
     pre-filled from the current profile — filled fields stay filled,
     empty ones (like a first-time `address`) are left blank.
   - If **not** logged in, the form shows a single "Your account" section
     (username, name, email, phone, password). On submit, it calls
     `auth.loginOrSignup()`, which:
     - looks the email up in the user table via the existing
       `getUniqueUser()`,
     - if found → calls the existing `login()`,
     - if not found → calls the existing `signup()` (unchanged — same
       account-creation path used by the normal signup page),
     - either way, returns the resulting user row so the order can be
       attached to a real account.
5. **Address sync.** If the address typed on the form differs from what's
   already on the user's profile, `updateUserAddress()` is called — and
   **only** that column is written. Name/email/phone typed into the order
   form are used for that order's receipt only and are never written back
   to the user table, even if they differ from the profile.
6. **Order creation.** `orderService.createOrder()` is called once, with the
   full `items` array, computing `total` internally and defaulting `status`
   to `"Pending"`.
7. **Cart cleanup prompt.** If the order came from the cart (or from a
   logged-in user's "Order Now"), a confirm dialog asks whether to remove
   those items from the cart. Guests checking out via "Order Now" never had
   the item in a cart to begin with, so they just see a success message.
8. **Redirect** to `/:username/orders` to see the new order.

## 5. Update rules — what can and can't change after an order exists

- **The order row itself:** nothing changes after creation except
  `status`, and only in one direction:
  - While `status === "Pending"`, the buyer can cancel it — this sets
    `status` to `"Cancelled"`. The "Cancel order" button only renders in
    `Orders.jsx` when `status === "Pending"`.
  - `cancelOrder()` re-checks the current status on the server before
    cancelling, so a stale page can't cancel an order that's already moved
    on to `"Out for Delivery"` or beyond.
  - Progressing status forward (`"Pending"` → `"Out for Delivery"` →
    `"Delivered"`) is handled by `updateOrderStatus()`, which exists in
    `order.js` but isn't wired to any UI yet — it's there for a future
    admin orders panel.
- **The user row:** the checkout flow can write to exactly one column,
  `address`. Nothing else on the profile (name, email, phone, username) is
  ever touched by placing an order, regardless of what's typed into the
  order form.

## 6. Status values

`"Pending"` → `"Out for Delivery"` → `"Delivered"`, with `"Cancelled"` as a
terminal state reachable only from `"Pending"`. ("Out for Delivery" is used
instead of a casual "on the way" for a more professional tone in the UI.)

## 7. Known follow-ups (not built yet)

- No admin UI for advancing order status — `updateOrderStatus()` is ready
  for it, but nothing calls it yet.
- `Orders.jsx` needs to be added to your `src/pages/index.js` barrel export
  (it's not there automatically).
- Confirm `eTakhzeenOrderTableId` exists in `envVars/vars.js` and points at
  a table with the columns listed in §2.