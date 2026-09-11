import { LayoutDashboard, Package, ShoppingCart, Users, Megaphone, Mail, Wallet } from 'lucide-react';

// Example — merge the `color` field into your existing adminNavItems array.
// Keep whatever icons/paths you already have; only the `color` field is new.
export const adminNavItems = [
    { label: 'Dashboard', path: '/admin', end: true, icon: LayoutDashboard, color: 'brand' },
    { label: 'Products', path: '/admin/products', icon: Package, color: 'violet' },
    { label: 'Orders', path: '/admin/orders', icon: ShoppingCart, color: 'orange' },
    { label: 'Users', path: '/admin/users', icon: Users, color: 'sky' },
    { label: 'Announcements', path: '/admin/announcements', icon: Megaphone, color: 'fuchsia' },
    { label: 'Contact', path: '/admin/contact', icon: Mail, color: 'green' },
    { label: 'Finance', path: '/admin/finance', icon: Wallet, color: 'emerald' },
    // ...keep any other items you already have, just add a `color` to each
];

