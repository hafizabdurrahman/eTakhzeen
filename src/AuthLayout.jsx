import React from 'react';
import { Outlet, useLocation } from 'react-router';

function catmullRomToBezierPath(points) {
    const n = points.length;
    const d = [`M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`];
    for (let i = 0; i < n; i++) {
        const p0 = points[(i - 1 + n) % n];
        const p1 = points[i];
        const p2 = points[(i + 1) % n];
        const p3 = points[(i + 2) % n];
        const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
        const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
        const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
        const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
        d.push(
            `C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`
        );
    }
    d.push('Z');
    return d.join(' ');
}

function blobPath(cx, cy, r, offsets) {
    const points = offsets.map((offset, i) => {
        const angle = (i / offsets.length) * Math.PI * 2;
        const radius = r * (1 + offset);
        return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
    });
    return catmullRomToBezierPath(points);
}

// Small, fixed radius nudges (roughly ±5%) at 8 points around each ring —
// enough to read as irregular, not so much it looks lumpy or spiky.
const ROSE_OFFSETS = [0.03, -0.02, 0.05, -0.04, 0.02, -0.05, 0.04, -0.03];
const GREEN_OFFSETS = [-0.04, 0.03, -0.02, 0.05, -0.03, 0.02, -0.05, 0.04];
const YELLOW_OFFSETS = [0.02, -0.05, 0.04, -0.02, 0.05, -0.03, 0.02, -0.04];

const ROSE_PATH = blobPath(300, 290, 230, ROSE_OFFSETS);
const GREEN_PATH = blobPath(290, 310, 222, GREEN_OFFSETS);
const YELLOW_PATH = blobPath(312, 300, 234, YELLOW_OFFSETS);

function AuthLayout() {
    const location = useLocation();

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-cream px-4 py-12 dark:bg-[#07070a]">
            {/* ...backgrounds unchanged... */}

            {/* key={location.pathname} forces a full unmount + fresh mount
                whenever the auth route changes (welcome-back <-> create-account),
                instead of React trying to reconcile/reuse the previous
                page's DOM subtree. This eliminates any leftover sizing,
                scroll position, or local state bleeding between Login and
                Signup. */}

            <div className="auth-bg-simple pointer-events-none absolute inset-0 sm:hidden" aria-hidden="true" />

            {/* Desktop/tablet: the animated ring system */}
            <div className="pointer-events-none absolute inset-0 hidden items-center justify-center overflow-hidden sm:flex">
                <svg viewBox="0 0 600 600" className="h-[640px] w-[640px]" aria-hidden="true">
                    <defs>
                        <filter id="authGlow" x="-60%" y="-60%" width="220%" height="220%">
                            <feGaussianBlur stdDeviation="6" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Blue ring */}
                    <g className="auth-ring auth-ring--rose" style={{ transformOrigin: '300px 290px' }}>
                        <path d={ROSE_PATH} className="auth-ring-base" strokeWidth="7" fill="none" filter="url(#authGlow)" />
                        <path
                            d={ROSE_PATH}
                            className="auth-comet auth-comet--rose"
                            strokeWidth="9"
                            fill="none"
                            filter="url(#authGlow)"
                            strokeLinecap="round"
                        />
                    </g>

                    {/* Purple ring */}
                    <g className="auth-ring auth-ring--green" style={{ transformOrigin: '290px 310px' }}>
                        <path d={GREEN_PATH} className="auth-ring-base" strokeWidth="7" fill="none" filter="url(#authGlow)" />
                        <path
                            d={GREEN_PATH}
                            className="auth-comet auth-comet--green"
                            strokeWidth="9"
                            fill="none"
                            filter="url(#authGlow)"
                            strokeLinecap="round"
                        />
                    </g>

                    {/* Teal ring */}
                    <g className="auth-ring auth-ring--yellow" style={{ transformOrigin: '312px 300px' }}>
                        <path d={YELLOW_PATH} className="auth-ring-base" strokeWidth="7" fill="none" filter="url(#authGlow)" />
                        <path
                            d={YELLOW_PATH}
                            className="auth-comet auth-comet--yellow"
                            strokeWidth="9"
                            fill="none"
                            filter="url(#authGlow)"
                            strokeLinecap="round"
                        />
                    </g>
                </svg>
            </div>
            <div className="relative z-10 flex w-full justify-center">
                <Outlet key={location.pathname} />
            </div>

            <style>{`
                /* Simple mobile background: soft two-tone diagonal wash,
                   no animation, no SVG — just gradients. */
                .auth-bg-simple {
                    background: radial-gradient(circle at 20% 15%, rgba(244, 63, 94, 0.12), transparent 55%),
                                radial-gradient(circle at 85% 80%, rgba(250, 204, 21, 0.10), transparent 55%),
                                radial-gradient(circle at 75% 10%, rgba(34, 197, 94, 0.10), transparent 50%);
                }
                .dark .auth-bg-simple {
                    background: radial-gradient(circle at 20% 15%, rgba(244, 63, 94, 0.18), transparent 55%),
                                radial-gradient(circle at 85% 80%, rgba(250, 204, 21, 0.14), transparent 55%),
                                radial-gradient(circle at 75% 10%, rgba(34, 197, 94, 0.14), transparent 50%);
                }

                .auth-ring { transform-box: view-box; }

                /* Whole ring slowly spinning on its own axis. */
                .auth-ring--rose   { animation: authSpin 34s linear infinite; }
                .auth-ring--green { animation: authSpin 40s linear infinite reverse; }
                .auth-ring--yellow   { animation: authSpin 46s linear infinite; }
                @keyframes authSpin {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }

                /* Solid base stroke per ring, color + opacity per theme. */
                .auth-ring--rose .auth-ring-base   { stroke: #f43f5e; }
                .auth-ring--green .auth-ring-base { stroke: #22c55e; }
                .auth-ring--yellow .auth-ring-base   { stroke: #facc15; }
                .dark .auth-ring-base  { opacity: 0.85; }
                .light .auth-ring-base { opacity: 0.5; }

                /* Bright comet segment traveling around the same path —
                   long gap, short dash, so only one glowing arc is ever
                   visible at a time. Offset animates continuously. */
                .auth-comet { stroke-linecap: round; }
                .auth-comet--rose   { stroke: #fda4af; stroke-dasharray: 90 1355; animation: authComet 5s linear infinite; }
                .auth-comet--green { stroke: #86efac; stroke-dasharray: 90 1305; animation: authComet 6.5s linear infinite reverse; }
                .auth-comet--yellow   { stroke: #fef08a; stroke-dasharray: 90 1380; animation: authComet 7.5s linear infinite; }
                @keyframes authComet {
                    from { stroke-dashoffset: 0; }
                    to   { stroke-dashoffset: -1445; }
                }
                .dark .auth-comet  { opacity: 0.95; }
                .light .auth-comet { opacity: 0.7; }

                @media (prefers-reduced-motion: reduce) {
                    .auth-ring, .auth-comet { animation: none; }
                }
            `}</style>
        </div>
    );
}

export default AuthLayout;