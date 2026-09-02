import { LayoutDashboard, Package, ClipboardList, Users, Megaphone, Mail } from 'lucide-react';

export const adminNavItems = [
    { label: 'Dashboard', path: '/admin', end: true, icon: LayoutDashboard },
    { label: 'Products', path: '/admin/products', end: false, icon: Package },
    { label: 'Orders', path: '/admin/orders', end: false, icon: ClipboardList },
    { label: 'Users', path: '/admin/users', end: false, icon: Users },
    { label: 'Announcements', path: '/admin/announcements', end: false, icon: Megaphone },
    { label: 'Contact', path: '/admin/contact', end: false, icon: Mail },
];