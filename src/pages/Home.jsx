import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import {
    ShoppingBag,
    Truck,
    ShieldCheck,
    RotateCcw,
    Sparkles,
    Tag,
    Package,
    Store,
    Users,
    ClipboardList,
    ImageOff,
    ArrowRight,
    ChevronDown,
} from 'lucide-react';
import { fetchCatalogCategories, fetchCatalogGroups } from '../store/slices/productSlice'; // ⚠️ adjust path
import { CategoryPreview, GroupPreview } from '../components'; // ⚠️ adjust path
import { Featured, Popular } from '../admin/components/layout'; // ⚠️ adjust path — same components Products.jsx already uses

// Headline rotates through these — swap for whatever categories matter most.
const ROTATING_WORDS = ['Electronics', 'Fashion', 'Home & Living', 'Beauty', 'Sports Gear'];

// All hero animation CSS lives here — one <style> tag, no Tailwind config
// changes, no external animation library. Everything degrades to "off"
// under prefers-reduced-motion.
const HERO_STYLES = `
@keyframes heroGradientMove {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
@keyframes heroAuroraSpin {
  from { transform: rotate(0deg) scale(1.5); }
  to { transform: rotate(360deg) scale(1.5); }
}
@keyframes heroCursorBlink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}
@keyframes heroIconPulse {
  0%, 100% { filter: hue-rotate(0deg) brightness(1); transform: scale(1); }
  50% { filter: hue-rotate(70deg) brightness(1.35); transform: scale(1.12); }
}
@keyframes heroBadgeFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
@keyframes heroFloatBob {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-14px) rotate(4deg); }
}
@keyframes heroScrollBounce {
  0%, 100% { transform: translateY(0); opacity: 0.6; }
  50% { transform: translateY(6px); opacity: 1; }
}

.hero-gradient-text {
  background-image: linear-gradient(90deg, #fb923c, #f472b6, #38bdf8, #facc15, #fb923c);
  background-size: 300% auto;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: heroGradientMove 6s ease-in-out infinite;
}
.hero-cursor {
  display: inline-block;
  width: 4px;
  height: 0.8em;
  margin-left: 6px;
  vertical-align: text-bottom;
  background: currentColor;
  animation: heroCursorBlink 1s step-start infinite;
}
.hero-aurora {
  background: conic-gradient(from 0deg, #fb923c, #f472b6, #38bdf8, #facc15, #fb923c);
  filter: blur(70px);
  animation: heroAuroraSpin 20s linear infinite;
}
.hero-bg-img {
  will-change: transform;
}
.hero-badge {
  animation: heroBadgeFloat 3.5s ease-in-out infinite;
}
.icon-pulse-1, .icon-pulse-2, .icon-pulse-3 {
  display: inline-block;
  animation: heroIconPulse 3s ease-in-out infinite;
}
.icon-pulse-2 { animation-delay: 0.5s; }
.icon-pulse-3 { animation-delay: 1s; }

.hero-float {
  animation: heroFloatBob 5s ease-in-out infinite;
}
.hero-float-d1 { animation-delay: 0s; }
.hero-float-d2 { animation-delay: 0.9s; }
.hero-float-d3 { animation-delay: 1.8s; }
.hero-float-d4 { animation-delay: 2.6s; }

.hero-scroll-cue {
  animation: heroScrollBounce 1.8s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .hero-gradient-text,
  .hero-aurora,
  .hero-cursor,
  .hero-badge,
  .icon-pulse-1,
  .icon-pulse-2,
  .icon-pulse-3,
  .hero-float,
  .hero-scroll-cue {
    animation: none !important;
  }
}
`;

/**
 * Simple typewriter: types a word, pauses, deletes it, moves to the next.
 * Falls back to a plain word-swap on an interval when the OS asks for
 * reduced motion, instead of per-character animation.
 */
function useTypewriter(words, { typingSpeed = 70, deletingSpeed = 40, pauseMs = 1400 } = {}) {
    const [text, setText] = useState('');
    const [wordIndex, setWordIndex] = useState(0);
    const [phase, setPhase] = useState('typing'); // 'typing' | 'deleting'
    const reducedMotion = useRef(
        typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );

    useEffect(() => {
        if (reducedMotion.current) {
            const id = setInterval(() => setWordIndex((i) => (i + 1) % words.length), 2200);
            return () => clearInterval(id);
        }

        const current = words[wordIndex];
        let timeout;

        if (phase === 'typing') {
            if (text.length < current.length) {
                timeout = setTimeout(() => setText(current.slice(0, text.length + 1)), typingSpeed);
            } else {
                timeout = setTimeout(() => setPhase('deleting'), pauseMs);
            }
        } else {
            if (text.length > 0) {
                timeout = setTimeout(() => setText(current.slice(0, text.length - 1)), deletingSpeed);
            } else {
                setWordIndex((i) => (i + 1) % words.length);
                setPhase('typing');
            }
        }

        return () => clearTimeout(timeout);
    }, [text, phase, wordIndex, words, typingSpeed, deletingSpeed, pauseMs]);

    return reducedMotion.current ? words[wordIndex] : text;
}

/**
 * Fades a section up into place the first time it enters the viewport.
 * State-driven (IntersectionObserver -> boolean), not a CSS autoplay class,
 * so the "from" state always paints before the "to" state applies.
 * No-ops (renders visible immediately) under reduced motion.
 */
function Reveal({ children, className = '' }) {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node) return undefined;
        if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setVisible(true);
            return undefined;
        }
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.15 }
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className={`transition-all duration-500 ease-out ${
                visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            } ${className}`}
        >
            {children}
        </div>
    );
}

/**
 * Lightweight scroll-parallax, GSAP-style but framework-free: reads scroll
 * position, throttled to one update per animation frame, and translates the
 * target element. No-ops under reduced motion.
 */
function useParallax(ref, speed = 0.15) {
    useEffect(() => {
        const node = ref.current;
        if (!node) return undefined;
        if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return undefined;
        }

        let ticking = false;
        const update = () => {
            const rect = node.parentElement.getBoundingClientRect();
            const offset = rect.top * speed;
            node.style.transform = `translate3d(0, ${offset}px, 0) scale(1.1)`;
            ticking = false;
        };
        const onScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(update);
                ticking = true;
            }
        };

        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, [ref, speed]);
}

/**
 * A small badge-icon that bobs on its own via CSS, and additionally drifts
 * toward the cursor via a CSS custom property (--mx / --my) set by the
 * parent's mousemove handler — two independent motions layered on two
 * different elements so they don't fight the same `transform`.
 */
function FloatIcon({ icon: Icon, depth = 24, className = '', bobClass = '', colorClass = 'text-white' }) {
    return (
        <div
            className={`pointer-events-none absolute ${className}`}
            style={{
                transform: `translate(calc(var(--mx, 0) * ${depth}px), calc(var(--my, 0) * ${depth}px))`,
                transition: 'transform 0.2s ease-out',
            }}
        >
            <div className={`hero-float ${bobClass}`}>
                <span
                    className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-lg backdrop-blur-sm ${colorClass}`}
                >
                    <Icon size={18} />
                </span>
            </div>
        </div>
    );
}

function Home() {
    const dispatch = useDispatch();
    const catalogTotal = useSelector((s) => s.products.catalog.total);

    const [heroImgError, setHeroImgError] = useState(false);
    const [sellImgError, setSellImgError] = useState(false);

    const rotatingWord = useTypewriter(ROTATING_WORDS);

    const heroImgRef = useRef(null);
    useParallax(heroImgRef, 0.12);

    // Cursor-follow drift for the floating icons — throttled to one update
    // per animation frame, and skipped entirely under reduced motion.
    const floatLayerRef = useRef(null);
    const heroRafRef = useRef(null);
    const reducedMotionRef = useRef(
        typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );

    const handleHeroMouseMove = (e) => {
        if (reducedMotionRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const mx = (e.clientX - rect.left) / rect.width - 0.5;
        const my = (e.clientY - rect.top) / rect.height - 0.5;
        if (heroRafRef.current) cancelAnimationFrame(heroRafRef.current);
        heroRafRef.current = requestAnimationFrame(() => {
            const layer = floatLayerRef.current;
            if (!layer) return;
            layer.style.setProperty('--mx', mx.toFixed(3));
            layer.style.setProperty('--my', my.toFixed(3));
        });
    };

    const handleHeroMouseLeave = () => {
        const layer = floatLayerRef.current;
        if (layer) {
            layer.style.setProperty('--mx', 0);
            layer.style.setProperty('--my', 0);
        }
    };

    // CategoryPreview / GroupPreview read from the catalog slice directly —
    // fetch here too (same as Products.jsx) so they're populated even when
    // Home is the very first page someone lands on.
    useEffect(() => {
        dispatch(fetchCatalogCategories());
        dispatch(fetchCatalogGroups());
    }, [dispatch]);

    return (
        <div className="bg-white dark:bg-stone-950">
            {/* ---------- HERO ---------- */}
            <section
                className="relative isolate flex min-h-[70vh] items-center justify-center overflow-hidden sm:min-h-[74vh] lg:min-h-[78vh]"
                onMouseMove={handleHeroMouseMove}
                onMouseLeave={handleHeroMouseLeave}
            >
                {/* Full-bleed background image */}
                <div className="absolute inset-0 -z-20 overflow-hidden">
                    {heroImgError ? (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-brand-700 via-stone-800 to-stone-950 text-stone-300">
                            <ImageOff size={28} />
                            <p className="px-6 text-center text-xs">
                                Add heroImage.webp to /public/images/home/
                            </p>
                        </div>
                    ) : (
                        <img
                            ref={heroImgRef}
                            src="/images/home/heroImage.webp"
                            alt="Featured products on our marketplace"
                            className="hero-bg-img h-full w-full object-cover"
                            onError={() => setHeroImgError(true)}
                        />
                    )}
                    {/* Legibility scrim — a touch darker at the edges, clearest center-top where the eye lands first */}
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-950/60 to-stone-950/35" />
                    {/* Slow-spinning color wash for a bit of life without breaking the palette */}
                    <div className="hero-aurora absolute inset-0 opacity-20 mix-blend-screen" aria-hidden="true" />
                </div>

                {/* Floating, live icons that drift slightly toward the cursor */}
                <div ref={floatLayerRef} className="absolute inset-0 -z-10 hidden sm:block">
                    <FloatIcon
                        icon={ShoppingBag}
                        depth={26}
                        className="left-[10%] top-[22%]"
                        bobClass="hero-float-d1"
                        colorClass="text-amber-300"
                    />
                    <FloatIcon
                        icon={Tag}
                        depth={18}
                        className="right-[12%] top-[18%]"
                        bobClass="hero-float-d2"
                        colorClass="text-sky-300"
                    />
                    <FloatIcon
                        icon={Sparkles}
                        depth={22}
                        className="left-[16%] bottom-[20%]"
                        bobClass="hero-float-d3"
                        colorClass="text-pink-300"
                    />
                    <FloatIcon
                        icon={Package}
                        depth={16}
                        className="right-[16%] bottom-[24%]"
                        bobClass="hero-float-d4"
                        colorClass="text-emerald-300"
                    />
                </div>

                {/* Centered content */}
                <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-20 text-center sm:px-6 lg:px-8">
                    <span className="hero-badge inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                        <Sparkles size={12} className="text-amber-300" />
                        New arrivals daily
                    </span>

                    <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.35)] sm:text-6xl lg:text-7xl">
                        Shop
                        <br />
                        <span className="hero-gradient-text">
                            {rotatingWord}
                            <span aria-hidden="true" className="hero-cursor" />
                        </span>
                    </h1>

                    <p className="mt-5 max-w-md text-base text-stone-200 sm:text-lg">
                        Fast delivery. Easy returns. Real value.
                    </p>

                    <div className="mt-8 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row sm:justify-center">
                        <Link
                            to="/products"
                            className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 py-3.5 pl-6 pr-5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-all hover:-translate-y-0.5 hover:bg-brand-400 hover:shadow-xl hover:shadow-brand-500/40 active:translate-y-0 sm:w-auto"
                        >
                            <ShoppingBag size={16} />
                            Start Shopping
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-0.5">
                                <ArrowRight size={14} strokeWidth={2.5} />
                            </span>
                        </Link>
                        <Link
                            to="/sell"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-3.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:w-auto"
                        >
                            <Store size={16} />
                            Become a Seller
                        </Link>
                    </div>

                    <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                        {[
                            [Truck, 'Nationwide delivery', 'icon-pulse-1'],
                            [ShieldCheck, 'Secure checkout', 'icon-pulse-2'],
                            [RotateCcw, 'Easy returns', 'icon-pulse-3'],
                        ].map(([Icon, label, animClass]) => (
                            <span
                                key={label}
                                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-stone-100 backdrop-blur-sm"
                            >
                                <Icon size={13} className={`${animClass} text-brand-300`} />
                                {label}
                            </span>
                        ))}
                    </div>

                    {catalogTotal > 0 && (
                        <div className="mt-8 inline-flex items-center gap-2.5 rounded-lg border border-white/15 bg-white/10 px-3 py-2.5 backdrop-blur-sm">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-brand-300">
                                <Package size={18} />
                            </span>
                            <div className="text-left">
                                <p className="text-sm font-semibold text-white">{catalogTotal}+ products</p>
                                <p className="text-xs text-stone-300">ready to ship</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Scroll cue */}
                <div className="hero-scroll-cue absolute bottom-5 left-1/2 -translate-x-1/2 text-white/70">
                    <ChevronDown size={20} />
                </div>

                <style>{HERO_STYLES}</style>
            </section>

            {/* ---------- VALUE PROPS ---------- */}
            <Reveal className="border-y border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-900/40">
                <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            [Sparkles, 'Curated selection', 'Everyday products chosen for quality and value.'],
                            [Tag, 'Transparent pricing', 'Straightforward prices with no unnecessary surprises.'],
                            [Truck, 'Fast delivery', 'Reliable shipping that gets your order to you quickly.'],
                            [RotateCcw, 'Easy returns', 'Changed your mind? Send it back, hassle-free.'],
                        ].map(([Icon, title, description]) => (
                            <div
                                key={title}
                                className="rounded-lg border border-stone-200 bg-cream p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-stone-800 dark:bg-stone-900"
                            >
                                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                                    <Icon size={18} />
                                </span>
                                <h2 className="mt-3 text-sm font-semibold text-stone-900 dark:text-stone-100">{title}</h2>
                                <p className="mt-1.5 text-sm leading-6 text-stone-500 dark:text-stone-400">{description}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </Reveal>

            {/* ---------- CATEGORIES ---------- */}
            <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
                <div className="mb-5 flex items-end justify-between gap-4">
                    <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Shop by category</h2>
                    <Link
                        to="/products/categories"
                        className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-500"
                    >
                        View all
                    </Link>
                </div>
                <CategoryPreview />
            </section>

            {/* ---------- FEATURED ---------- */}
            <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
                <h2 className="mb-5 text-xl font-semibold text-stone-900 dark:text-stone-100">Featured products</h2>
                <Featured />
            </section>

            {/* ---------- SELL WITH US (coming soon) ---------- */}
            <Reveal className="border-y border-stone-200 bg-brand-50 dark:border-stone-800 dark:bg-brand-500/10">
                <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                        <div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-cream px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-stone-900 dark:text-brand-400">
                                <Sparkles size={11} /> Coming soon
                            </span>

                            <h2 className="mt-3 text-2xl font-bold text-stone-900 dark:text-stone-100 sm:text-3xl">
                                Turn your business into a storefront.
                            </h2>

                            <p className="mt-3 max-w-md text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                                We&rsquo;re building seller and business accounts, so you can list your own
                                products, manage orders, and reach shoppers who are already browsing here —
                                the same way sellers do on Daraz or Amazon.
                            </p>

                            <ul className="mt-6 space-y-3">
                                {[
                                    [Package, 'List and manage your own products'],
                                    [Users, 'Reach thousands of shoppers browsing today'],
                                    [ClipboardList, 'Track and fulfill orders from one dashboard'],
                                ].map(([Icon, label]) => (
                                    <li key={label} className="flex items-center gap-3 text-sm text-stone-700 dark:text-stone-300">
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cream text-brand-600 dark:bg-stone-900 dark:text-brand-400">
                                            <Icon size={14} />
                                        </span>
                                        {label}
                                    </li>
                                ))}
                            </ul>

                            <Link
                                to="/sell"
                                className="mt-7 inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
                            >
                                <Store size={16} />
                                Get early access
                            </Link>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-stone-200 bg-cream shadow-sm dark:border-stone-800 dark:bg-stone-900">
                            {sellImgError ? (
                                <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-600">
                                    <ImageOff size={28} />
                                    <p className="px-6 text-center text-xs">
                                        Add sellWithUs.webp to /public/images/home/
                                    </p>
                                </div>
                            ) : (
                                <img
                                    src="/images/home/sellWithUs.webp"
                                    alt="Manage your storefront and orders"
                                    className="aspect-[4/3] w-full object-cover"
                                    onError={() => setSellImgError(true)}
                                />
                            )}
                        </div>
                    </div>
                </section>
            </Reveal>

            {/* ---------- POPULAR ---------- */}
            <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
                <h2 className="mb-5 text-xl font-semibold text-stone-900 dark:text-stone-100">Popular right now</h2>
                <Popular />
            </section>

            {/* ---------- GROUPS ---------- */}
            <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
                <div className="mb-5 flex items-end justify-between gap-4">
                    <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Shop by group</h2>
                    <Link
                        to="/products/groups"
                        className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-500"
                    >
                        View all
                    </Link>
                </div>
                <GroupPreview />
            </section>
        </div>
    );
}

export default Home;