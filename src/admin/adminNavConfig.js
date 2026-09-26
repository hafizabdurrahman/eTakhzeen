import { LayoutDashboard, Package, ShoppingCart, Users, Megaphone, Mail, Wallet, Component, Settings, Share2 } from 'lucide-react';

// Example — merge the `color` field into your existing adminNavItems array.
// Keep whatever icons/paths you already have; only the `color` field is new.
export const adminNavItems = [
    { label: 'Dashboard', path: '/admin', end: true, icon: LayoutDashboard, color: 'brand' },
    { label: 'Products', path: '/admin/products', icon: Package, color: 'violet' },
    { label: 'Orders', path: '/admin/orders', icon: ShoppingCart, color: 'orange' },
    { label: 'Users', path: '/admin/users', icon: Users, color: 'sky' },
    { label: 'Announcements', path: '/admin/announcements', icon: Megaphone, color: 'fuchsia' },
    { label: 'Finance', path: '/admin/finance', icon: Wallet, color: 'tomato' },
    { label: 'Social Media', path: '/admin/socialMedia', icon: Share2, color: 'yellow' },
    { label: 'Contact', path: '/admin/contact', icon: Mail, color: 'green' },
    { label: 'Layout', path: '/admin/layout', icon: Component, color: 'warm' },
    { label: 'Settings', path: '/admin/settings', icon: Settings, color: 'setting' },
    // ...keep any other items you already have, just add a `color` to each
];

