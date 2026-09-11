import { User as UserIcon, Package, ShoppingCart, Megaphone, Component, Home } from 'lucide-react';

// Mirrors adminNavConfig's shape ({ label, path, icon }) so
// UserPanelSidebar can render nav items exactly the way AdminLayout does.
// Unlike admin's fixed '/admin' prefix, this panel's base route is
// dynamic (/:username), so paths are generated per-username instead of
// being a static array.
//
// `color` is a Tailwind color name used for the icon's resting-state
// tint (text-{color}-500 / dark:text-{color}-400). It's dropped in favor
// of the brand accent whenever the item is active, so the active state
// always reads as one consistent color regardless of which item it is.
export function getUserNavItems(username) {
    return [
        { label: 'Profile', path: `/${username}/profile`, icon: UserIcon, color: 'sky' },
        { label: 'Orders', path: `/${username}/orders`, icon: Package, color: 'violet' },
        { label: 'Cart', path: `/${username}/cart`, icon: ShoppingCart, color: 'orange' },
        { label: 'Announcements', path: `/${username}/announcements`, icon: Megaphone, color: 'fuchsia' },
        { label: 'Browse Products', path: `/products`, icon: Component, color: 'emerald' },
        { label: 'Go back to home', path: `/`, icon: Home, color: 'stone' },
    ];
}