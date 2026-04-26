import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

// Normal PDF
const normalPDF = (x: number, mu: number, sigma: number) => {
    const s = Math.max(sigma, 0.05);
    return (1 / (s * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mu) / s) ** 2);
};

// LogNormal PDF  (x > 0)
const lognormalPDF = (x: number, mu: number, sigma: number) => {
    if (x <= 0) return 0;
    const s = Math.max(sigma, 0.05);
    return (1 / (x * s * Math.sqrt(2 * Math.PI))) *
        Math.exp(-0.5 * ((Math.log(x) - mu) / s) ** 2);
};

const build = (
    fn: (x: number) => number,
    xMin: number, xMax: number,
    yMax: number, w: number, h: number,
    N = 300
): string => {
    const pts: string[] = [];
    for (let i = 0; i <= N; i++) {
        const x = xMin + (i / N) * (xMax - xMin);
        const y = fn(x);
        const sx = ((x - xMin) / (xMax - xMin)) * w;
        const sy = h - (Math.min(y, yMax) / yMax) * (h - 20);
        pts.push(`${i === 0 ? 'M' : 'L'} ${sx.toFixed(1)} ${sy.toFixed(1)}`);
    }
    pts.push(`L ${w} ${h} L 0 ${h} Z`);
    return pts.join(' ');
};

const X_MIN = -3, X_MAX = 20;

const STAT_TEXT_CLASS: Record<string, string> = {
    slate: 'text-slate-600',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
};

export function DistributionComparer() {
    const [logMu, setLogMu] = useState(1.1);   // log-mean
    const [logSigma, setLogSigma] = useState(0.6);   // log-sd

    // For Normal, we match the lognormal's *mean* and *sd* for fairness
    const lnMean = Math.exp(logMu + (logSigma ** 2) / 2);
    const lnVar = (Math.exp(logSigma ** 2) - 1) * Math.exp(2 * logMu + logSigma ** 2);
    const lnSD = Math.sqrt(lnVar);

    const xMin = X_MIN, xMax = X_MAX;
    const W = 800, H = 260;

    const maxY = useMemo(() => {
        let m = 0;
        for (let i = 1; i <= 400; i++) {
            const x = xMin + (i / 400) * (xMax - xMin);
            m = Math.max(m, lognormalPDF(x, logMu, logSigma));
            m = Math.max(m, normalPDF(x, lnMean, lnSD));
        }
        return m * 1.15;
    }, [logMu, logSigma, lnMean, lnSD, xMin, xMax]);

    const pathLN = useMemo(() =>
        build(x => lognormalPDF(x, logMu, logSigma), xMin, xMax, maxY, W, H),
        [logMu, logSigma, xMin, xMax, maxY, W, H]);
    const pathN = useMemo(() =>
        build(x => normalPDF(x, lnMean, lnSD), xMin, xMax, maxY, W, H),
        [lnMean, lnSD, xMin, xMax, maxY, W, H]);

    // Fraction of Normal mass below 0 (impossible for durations)
    const negMass = useMemo(() => {
        let sum = 0;
        const steps = 500;
        const dx = (-xMin) / steps;
        for (let i = 0; i <= steps; i++) {
            const xv = xMin + i * dx;
            sum += normalPDF(xv, lnMean, lnSD) * dx;
        }
        return Math.max(0, sum);
    }, [lnMean, lnSD, xMin]);

    const zeroLine = xMin < 0 ? ((0 - xMin) / (xMax - xMin)) * W : 0;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-amber-50/30">
                <h4 className="text-xl font-bold text-slate-800 mb-1">Normal vs. LogNormal — Why Distribution Choice Matters</h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                    Both distributions are parameterized to have the same <strong>mean</strong> and <strong>standard deviation</strong>.
                    Only LogNormal stays positive — Normal leaks probability mass into negative durations.
                </p>
            </div>

            {/* Sliders */}
            <div className="grid md:grid-cols-2 gap-5 px-6 py-5 border-b border-slate-100 bg-slate-50/40">
                {[
                    {
                        label: 'Log-mean (μ)', val: logMu, set: setLogMu, min: -0.5, max: 2.5, step: 0.05,
                        hint: `Median duration = exp(μ) = ${Math.exp(logMu).toFixed(2)} months`
                    },
                    {
                        label: 'Log-scale SD (σ)', val: logSigma, set: setLogSigma, min: 0.1, max: 1.8, step: 0.05,
                        hint: `Higher σ → heavier right tail (more long-haulers)`
                    },
                ].map(s => (
                    <div key={s.label} className="space-y-2">
                        <div className="flex justify-between text-sm font-semibold text-slate-700">
                            <span>{s.label}</span>
                            <span className="font-mono bg-white px-2 py-0.5 rounded shadow-sm text-indigo-700">{s.val.toFixed(2)}</span>
                        </div>
                        <input type="range" min={s.min} max={s.max} step={s.step} value={s.val}
                            onChange={e => s.set(parseFloat(e.target.value))} className="w-full accent-indigo-500" />
                        <div className="text-xs text-slate-400">{s.hint}</div>
                    </div>
                ))}
            </div>

            {/* Chart */}
            <div className="px-6 pt-4">
                <svg viewBox={`0 0 ${W} ${H + 30}`} className="w-full" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="dc-ln-g" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="dc-n-g" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Zero line */}
                    <line x1={zeroLine} y1="10" x2={zeroLine} y2={H} stroke="#ef4444" strokeWidth="2" opacity={0.5} strokeDasharray="5 3" />
                    <text x={zeroLine + 6} y="28" fontSize="20" fill="#ef4444" opacity={0.7}>0 months</text>

                    {/* Shaded negative area for Normal */}
                    {negMass > 0.001 && (
                        <rect x="0" y="10" width={zeroLine} height={H - 10} fill="#ef4444" opacity={0.06} />
                    )}

                    {/* Axis */}
                    <line x1="0" y1={H} x2={W} y2={H} stroke="#e2e8f0" strokeWidth="1.5" />
                    {[0, 5, 10, 15, 20].map(v => {
                        const sx = ((v - xMin) / (xMax - xMin)) * W;
                        return sx >= 0 && sx <= W ? (
                            <g key={v}>
                                <line x1={sx} y1={H} x2={sx} y2={H + 6} stroke="#94a3b8" strokeWidth="1" />
                                <text x={sx} y={H + 22} textAnchor="middle" fontSize="20" fill="#94a3b8">{v}</text>
                            </g>
                        ) : null;
                    })}
                    <text x={W / 2} y={H + 38} textAnchor="middle" fontSize="18" fill="#94a3b8">Duration (months)</text>

                    {/* LogNormal */}
                    <motion.path d={pathLN} fill="url(#dc-ln-g)" stroke="#6366f1" strokeWidth="3"
                        animate={{ d: pathLN }} transition={{ type: 'spring', bounce: 0 }} />
                    {/* Normal */}
                    <motion.path d={pathN} fill="url(#dc-n-g)" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="7 4"
                        animate={{ d: pathN }} transition={{ type: 'spring', bounce: 0 }} />
                </svg>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100 border-t border-slate-100 text-center">
                {[
                    { label: 'Shared Mean', value: lnMean.toFixed(2) + ' mo', color: 'slate' },
                    { label: 'Shared SD', value: lnSD.toFixed(2) + ' mo', color: 'slate' },
                    { label: 'LogNormal < 0', value: '0.0%', color: 'emerald' },
                    { label: 'Normal < 0 ⚠️', value: (negMass * 100).toFixed(1) + '%', color: negMass > 0.02 ? 'red' : 'amber' },
                ].map(s => (
                    <div key={s.label} className="py-4 px-2">
                        <motion.div animate={{ scale: [1.05, 1] }} transition={{ duration: 0.3 }}
                            className={`text-xl font-bold ${STAT_TEXT_CLASS[s.color]} tabular-nums`}>
                            {s.value}
                        </motion.div>
                        <div className="text-xs text-slate-400 font-medium mt-0.5">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="px-6 py-4 flex gap-6 text-sm border-t border-slate-50 bg-slate-50/30">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 bg-indigo-500" /><span className="text-slate-600">LogNormal (correct)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 border-dashed border-t-2 border-red-500" /><span className="text-slate-600">Normal (allows negatives!)</span>
                </div>
            </div>
        </div>
    );
}
