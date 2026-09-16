import React from 'react';
import { Link } from 'react-router';
import { useSelector } from 'react-redux';
import { Mail, Sparkles } from 'lucide-react';

// lucide-react removed all trademarked brand icons (Facebook, Instagram,
// GitHub, Slack, etc.) in v1.0 for legal/trademark reasons — see
// https://lucide.dev/guide/react/migration. These two small inline SVGs
// stand in for them, drawn in the same stroke style as lucide's icons so
// they still blend in next to <Mail />.
function InstagramIcon({ size = 16, className = '' }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <rect x="3" y="3" width="18" height="18" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
    );
}

function FacebookIcon({ size = 16, className = '' }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
    );
}

function Footer() {
    const year = new Date().getFullYear();
    const status = useSelector((s) => s.user.status);
    const userData = useSelector((s) => s.user.userData);
    const loggedIn = Boolean(status && userData?.['$id']);

    // Cart/orders are per-user routes (":username/cart", ":username/orders"),
    // so send logged-out visitors to login instead of a broken link — same
    // fix as the Cart link in Header.jsx.
    const shopLinks = [
        { label: 'Home', to: '/' },
        { label: 'All products', to: '/products' },
        { label: 'Cart', to: loggedIn ? `/${userData['$id']}/cart` : '/welcome-back' },
        { label: 'Track an order', to: loggedIn ? `/${userData['$id']}/orders` : '/welcome-back' },
    ];

    const companyLinks = [
        { label: 'Contact', to: '/contact' },
        { label: 'Become a seller', to: '/sell' },
        { label: 'Shipping & returns', to: '/shipping-returns' }, // ⚠️ route not in App.jsx yet — see note below
        { label: 'Privacy policy', to: '/privacy' }, // ⚠️ route not in App.jsx yet — see note below
        { label: 'Terms of service', to: '/terms' }, // ⚠️ route not in App.jsx yet — see note below
    ];

    return (
        // Deliberately always-dark, in both themes — the same stone-900/950
        // the nav pill uses at lg, so it reads as a bookend to the header
        // rather than a plain content section.
        <footer className="border-t border-stone-800 bg-stone-900 text-stone-300 dark:bg-stone-950">
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="sm:col-span-2 lg:col-span-2">
                        <Link to="/" className="text-xl font-bold tracking-tight text-brand-400">
                            eTakhzeen
                        </Link>
                        <p className="mt-3 max-w-xs text-sm leading-relaxed text-stone-400">
                            Straightforward online shopping, with your order tracked from checkout to
                            your door.
                        </p>

                        <Link
                            to="/sell"
                            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-brand-400 transition-colors hover:bg-white/10"
                        >
                            <Sparkles size={12} />
                            Seller accounts coming soon
                        </Link>

                        <div className="mt-5 flex items-center gap-3">
                            <a
                                href="mailto:hello@etakhzeen.com" // ⚠️ adjust email
                                aria-label="Email us"
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-stone-300 transition-colors hover:bg-white/10 hover:text-white"
                            >
                                <Mail size={16} />
                            </a>
                            <a
                                href="https://instagram.com" // ⚠️ adjust handle
                                target="_blank"
                                rel="noreferrer"
                                aria-label="Instagram"
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-stone-300 transition-colors hover:bg-white/10 hover:text-white"
                            >
                                <InstagramIcon size={16} />
                            </a>
                            <a
                                href="https://facebook.com" // ⚠️ adjust handle
                                target="_blank"
                                rel="noreferrer"
                                aria-label="Facebook"
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-stone-300 transition-colors hover:bg-white/10 hover:text-white"
                            >
                                <FacebookIcon size={16} />
                            </a>
                        </div>
                    </div>

                    <div>
                        <p className="text-sm font-semibold text-white">Shop</p>
                        <ul className="mt-4 space-y-3 text-sm">
                            {shopLinks.map((link) => (
                                <li key={link.label}>
                                    <Link to={link.to} className="text-stone-400 transition-colors hover:text-brand-400">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <p className="text-sm font-semibold text-white">Company</p>
                        <ul className="mt-4 space-y-3 text-sm">
                            {companyLinks.map((link) => (
                                <li key={link.label}>
                                    <Link to={link.to} className="text-stone-400 transition-colors hover:text-brand-400">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="mt-10 flex flex-col-reverse items-center gap-4 border-t border-stone-800 pt-6 sm:flex-row sm:justify-between">
                    <p className="text-xs text-stone-500">© {year} eTakhzeen. All rights reserved.</p>
                    <p className="text-xs text-stone-500">Prices shown in PKR.</p>
                </div>
            </div>
        </footer>
    );
}

export default Footer;