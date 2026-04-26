import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Beta-Binomial conjugate update visualizer ──────────────────────────────
// Prior: Beta(α, β)  Likelihood: Binomial  Posterior: Beta(α+k, β+n−k)
// Shows live animation as user adds observations

const betaPDF = (x: number, a: number, b: number): number => {
    if (x <= 0 || x >= 1) return 0;
    // Numerically stable log-beta via log-gamma approximation
    const logBeta = (a: number, b: number) => {
        const logGamma = (z: number): number => {
            const c = [76.18009173, -86.50532033, 24.0140982,
                -1.23173957, 1.20865097e-3, -5.39523938e-6];
            let y = z;
            const x2 = z;
            const tmp = z + 5.5 - (z + 0.5) * Math.log(z + 5.5);
            let ser = 1.0000000002;
            for (let j = 0; j < 6; j++) { y += 1; ser += c[j] / y; }
            return -tmp + Math.log(2.5066282746 * ser / x2);
        };
        return logGamma(a) + logGamma(b) - logGamma(a + b);
    };
    return Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - logBeta(a, b));
};

const buildPath = (a: number, b: number, maxY: number): string => {
    const N = 180;
    const points: [number, number][] = [];
    for (let i = 0; i <= N; i++) {
        const x = 0.005 + (i / N) * 0.99;
        const y = betaPDF(x, a, b);
        points.push([x, y]);
    }
    const svgX = (x: number) => x * 800;
    const svgY = (y: number) => 220 - (y / maxY) * 200;
    let d = `M ${svgX(points[0][0])} ${svgY(points[0][1])}`;
    for (let i = 1; i < points.length; i++) {
        d += ` L ${svgX(points[i][0])} ${svgY(points[i][1])}`;
    }
    d += ` L 800 220 L 0 220 Z`;
    return d;
};

const PRESETS = [
    { label: 'Uninformative', a: 1, b: 1 },
    { label: 'Skeptical (~20%)', a: 2, b: 8 },
    { label: 'Optimistic (~60%)', a: 6, b: 4 },
    { label: 'Informed (~40%)', a: 4, b: 6 },
];

export function BetaBinomialUpdater() {
    const [priorPreset, setPriorPreset] = useState(0);
    const [observations, setObservations] = useState<boolean[]>([]);
    const [animKey, setAnimKey] = useState(0);

    const priorA = PRESETS[priorPreset].a;
    const priorB = PRESETS[priorPreset].b;
    const successes = observations.filter(Boolean).length;
    const failures = observations.filter(v => !v).length;
    const postA = priorA + successes;
    const postB = priorB + failures;
    const n = observations.length;

    const posteriorMean = (postA / (postA + postB));

    const addObs = (success: boolean) => {
        setObservations(prev => [...prev, success]);
        setAnimKey(k => k + 1);
    };
    const reset = () => { setObservations([]); setAnimKey(k => k + 1); };

    const maxY = useMemo(() => {
        let m = 0;
        for (let i = 1; i <= 199; i++) {
            const x = i / 200;
            m = Math.max(m, betaPDF(x, postA, postB), betaPDF(x, priorA, priorB));
        }
        return Math.max(m * 1.15, 2);
    }, [postA, postB, priorA, priorB]);

    const pathPrior = useMemo(() => buildPath(priorA, priorB, maxY), [priorA, priorB, maxY]);
    const pathPost = useMemo(() => buildPath(postA, postB, maxY), [postA, postB, maxY]);

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
                <h4 className="text-xl font-bold text-slate-800 mb-1">Beta-Binomial Conjugate Updater</h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                    Flip coins, run clinical trials, observe successes. Watch the posterior update in real time.
                    <strong className="text-slate-700"> The Beta prior + Binomial likelihood = Beta posterior.</strong>
                    After k successes in n trials, Beta(α, β) becomes Beta(α + k, β + n − k).
                </p>
            </div>

            {/* Prior selector */}
            <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap gap-2 items-center">
                <span className="text-sm font-semibold text-slate-600 mr-1">Prior belief:</span>
                {PRESETS.map((p, i) => (
                    <button key={p.label} onClick={() => { setPriorPreset(i); reset(); }}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${priorPreset === i ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        {p.label}
                        <span className="ml-1.5 opacity-70 text-xs">α={p.a}, β={p.b}</span>
                    </button>
                ))}
            </div>

            {/* Main chart */}
            <div className="px-6 pt-5">
                <svg viewBox="0 0 800 240" className="w-full" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="bb-prior-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
                        </linearGradient>
                        <linearGradient id="bb-post-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
                        </linearGradient>
                    </defs>
                    {/* Axis */}
                    <line x1="0" y1="220" x2="800" y2="220" stroke="#e2e8f0" strokeWidth="1.5" />
                    {[0, 0.25, 0.5, 0.75, 1].map(v => (
                        <g key={v}>
                            <line x1={v * 800} y1="218" x2={v * 800} y2="225" stroke="#94a3b8" strokeWidth="1" />
                            <text x={v * 800} y="238" textAnchor="middle" fontSize="22" fill="#94a3b8">{v}</text>
                        </g>
                    ))}

                    {/* Prior */}
                    <motion.path key={`prior-${priorPreset}`} d={pathPrior}
                        fill="url(#bb-prior-grad)" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5 4"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} />

                    {/* Posterior */}
                    <motion.path key={`post-${animKey}`} d={pathPost}
                        fill="url(#bb-post-grad)" stroke="#6366f1" strokeWidth="3"
                        initial={{ opacity: 0, scaleY: 0.5 }} animate={{ opacity: 1, scaleY: 1 }}
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        style={{ transformOrigin: '50% 220px' }} />

                    {/* Posterior mean line */}
                    <line x1={posteriorMean * 800} y1="10" x2={posteriorMean * 800} y2="220"
                        stroke="#6366f1" strokeWidth="1.5" strokeDasharray="3 3" opacity={0.6} />
                    <text x={posteriorMean * 800 + 6} y="28" fontSize="20" fill="#6366f1" fontWeight="600">
                        μ={posteriorMean.toFixed(2)}
                    </text>
                </svg>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 divide-x divide-slate-100 border-t border-slate-100 text-center">
                {[
                    { label: 'Observations', value: n, color: 'slate' },
                    { label: 'Successes', value: successes, color: 'emerald' },
                    { label: 'Failures', value: failures, color: 'red' },
                    { label: 'Post. Mean', value: posteriorMean.toFixed(3), color: 'indigo' },
                ].map(s => (
                    <div key={s.label} className="py-4 px-2">
                        <AnimatePresence mode="popLayout">
                            <motion.div key={String(s.value)}
                                initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                                className={`text-2xl font-bold text-${s.color}-600 tabular-nums`}>
                                {s.value}
                            </motion.div>
                        </AnimatePresence>
                        <div className="text-xs text-slate-400 font-medium mt-0.5">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Observation buttons */}
            <div className="p-6 bg-slate-50/50 border-t border-slate-100 space-y-4">
                <div className="flex gap-3 flex-wrap items-center">
                    <button onClick={() => addObs(true)}
                        className="flex-1 min-w-[120px] py-3 rounded-xl bg-emerald-600 text-white font-bold text-lg hover:bg-emerald-700 active:scale-95 transition-all shadow-lg shadow-emerald-200">
                        ✓ Success
                    </button>
                    <button onClick={() => addObs(false)}
                        className="flex-1 min-w-[120px] py-3 rounded-xl bg-red-500 text-white font-bold text-lg hover:bg-red-600 active:scale-95 transition-all shadow-lg shadow-red-200">
                        ✗ Failure
                    </button>
                    <button onClick={() => { for (let i = 0; i < 5; i++) addObs(Math.random() < 0.4); }}
                        className="py-3 px-5 rounded-xl bg-indigo-100 text-indigo-700 font-semibold text-sm hover:bg-indigo-200 active:scale-95 transition-all">
                        +5 random
                    </button>
                    <button onClick={reset}
                        className="py-3 px-5 rounded-xl bg-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-300 active:scale-95 transition-all">
                        Reset
                    </button>
                </div>
                {/* Observation history */}
                {observations.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                        {observations.map((v, i) => (
                            <span key={i} className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${v ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                                {v ? '✓' : '✗'}
                            </span>
                        ))}
                    </div>
                )}
                <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 border-t-2 border-dashed border-blue-400 w-8" />
                        <span className="text-slate-500">Prior: Beta({priorA}, {priorB})</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-0.5 bg-indigo-500" />
                        <span className="text-slate-500">Posterior: Beta({postA}, {postB})</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
