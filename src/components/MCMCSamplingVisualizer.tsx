import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── 2D Posterior Contour + MCMC Path Visualizer ──────────────────────────
// Target: joint posterior P(log_mu, sigma_obs | data)
//   Data:  80 observations from LogNormal(1.1, 0.6)
//   Prior: log_mu ~ N(0,1), sigma_obs ~ HalfNormal(1)
//
// We precompute sufficient statistics from synthetic data
// so the log-likelihood uses the correct LogNormal form:
//   log L = -n*log(σ) - (1/2σ²) * Σ(log(xi) - μ)²

interface Point { x: number; y: number; }

// --- Generate synthetic data once ---
const SEED_DATA = 42;
const N_OBS = 80;
const TRUE_MU = 1.1;
const TRUE_SIG = 0.6;

// Deterministic pseudo-random data via seeded LCG
const genData = (seed: number, n: number, mu: number, sig: number) => {
    // Box-Muller from seeded uniform
    let s = seed;
    const u = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 4294967296; };
    const normals: number[] = [];
    for (let i = 0; i < n; i += 2) {
        const u1 = u(), u2 = u();
        const z0 = Math.sqrt(-2 * Math.log(u1 + 1e-12)) * Math.cos(2 * Math.PI * u2);
        const z1 = Math.sqrt(-2 * Math.log(u1 + 1e-12)) * Math.sin(2 * Math.PI * u2);
        normals.push(z0, z1);
    }
    // LogNormal: x = exp(mu + sig * z)
    return normals.slice(0, n).map(z => Math.exp(mu + sig * z));
};

const DATA = genData(SEED_DATA, N_OBS, TRUE_MU, TRUE_SIG);
const SUM_LOG_X = DATA.reduce((s, x) => s + Math.log(x), 0);
const SUM_LOG_X_SQ = DATA.reduce((s, x) => s + Math.log(x) ** 2, 0);

// --- Log posterior (unnormalized) ---
const TARGET_LOG_PROB = (mu: number, sig: number): number => {
    if (sig <= 0) return -Infinity;
    const sig2 = sig * sig;
    // LogNormal log-likelihood: -n*log(sig) - (1/(2*sig^2)) * Sum[(log(xi) - mu)^2]
    // = -n*log(sig) - (1/(2*sig^2)) * [Sum(log(xi)^2) - 2*mu*Sum(log(xi)) + n*mu^2]
    const logLik = -N_OBS * Math.log(sig)
        - (1 / (2 * sig2)) * (SUM_LOG_X_SQ - 2 * mu * SUM_LOG_X + N_OBS * mu * mu);
    // Priors
    const logPriorMu = -0.5 * mu * mu;                   // N(0,1)
    const logPriorSig = -0.5 * sig * sig;                  // HalfNormal(1)
    return logLik + logPriorMu + logPriorSig;
};

// --- Metropolis-Hastings step ---
const mhStep = (muCurr: number, sigCurr: number, step: number, rng: () => number): [number, number, boolean] => {
    const muProp = muCurr + (rng() * 2 - 1) * step;
    const sigProp = sigCurr + (rng() * 2 - 1) * step;
    if (sigProp <= 0) return [muCurr, sigCurr, false];
    const logA = TARGET_LOG_PROB(muProp, sigProp) - TARGET_LOG_PROB(muCurr, sigCurr);
    if (Math.log(rng() + 1e-12) < logA) return [muProp, sigProp, true];
    return [muCurr, sigCurr, false];
};

const seededRNG = (seed: number) => {
    let s = seed;
    return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 4294967296; };
};

// --- Heatmap grid ---
const MU_MIN = 0.5, MU_MAX = 1.7, SIG_MIN = 0.2, SIG_MAX = 1.1;
const GRID_STEPS = 50;
const W = 600, H = 380;

const buildContourGrid = (): number[][] => {
    const grid: number[][] = [];
    let maxV = -Infinity;
    for (let i = 0; i < GRID_STEPS; i++) {
        grid[i] = [];
        for (let j = 0; j < GRID_STEPS; j++) {
            const mu = MU_MIN + (i / (GRID_STEPS - 1)) * (MU_MAX - MU_MIN);
            const sig = SIG_MIN + (j / (GRID_STEPS - 1)) * (SIG_MAX - SIG_MIN);
            const v = TARGET_LOG_PROB(mu, sig);
            grid[i][j] = v;
            if (isFinite(v)) maxV = Math.max(maxV, v);
        }
    }
    for (let i = 0; i < GRID_STEPS; i++)
        for (let j = 0; j < GRID_STEPS; j++)
            grid[i][j] = isFinite(grid[i][j]) ? Math.exp(grid[i][j] - maxV) : 0;
    return grid;
};

const toSVG = (mu: number, sig: number) => ({
    x: ((mu - MU_MIN) / (MU_MAX - MU_MIN)) * W,
    y: H - ((sig - SIG_MIN) / (SIG_MAX - SIG_MIN)) * H,
});

export function MCMCSamplingVisualizer() {
    const [samples, setSamples] = useState<Point[]>([]);
    const [path, setPath] = useState<Point[]>([]);
    const [running, setRunning] = useState(false);
    const [numSamples, setNumSamples] = useState(300);
    const [stepSize, setStepSize] = useState(0.15);
    const [seed, setSeed] = useState(42);
    const [acceptance, setAcceptance] = useState<number | null>(null);

    const grid = useMemo(() => buildContourGrid(), []);
    const cellW = W / GRID_STEPS, cellH = H / GRID_STEPS;

    const runSampler = useCallback(() => {
        setRunning(true);
        const rng = seededRNG(seed);
        // Start near the posterior mode
        let mu = 1.0, sig = 0.6;
        const burnIn = 100;
        const newSamples: Point[] = [];
        const trajectory: Point[] = [{ x: mu, y: sig }];
        let accepted = 0;
        const total = numSamples + burnIn;

        for (let i = 0; i < total; i++) {
            const [nm, ns, acc] = mhStep(mu, sig, stepSize, rng);
            mu = nm; sig = ns;
            if (acc) accepted++;
            if (i >= burnIn) {
                newSamples.push({ x: mu, y: sig });
            }
            // Record trajectory for first 80 post-burnin steps
            if (i >= burnIn && i < burnIn + 80) {
                trajectory.push({ x: mu, y: sig });
            }
        }
        setSamples(newSamples);
        setPath(trajectory);
        setAcceptance(accepted / total);
        setRunning(false);
    }, [numSamples, stepSize, seed]);

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-purple-50/30">
                <h4 className="text-xl font-bold text-slate-800 mb-1">MCMC Sampling on a 2D Posterior</h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                    Watch a <strong>Metropolis-Hastings</strong> chain explore the joint posterior of
                    <strong> (log_mu, σ_obs)</strong>. The heat map shows the unnormalized posterior density.
                    Dots are chain positions (including repeats from rejected proposals); the yellow path shows the chain trajectory.
                    The posterior peak may differ from the true parameters due to prior regularization and finite-sample noise.
                    At each step, the sampler proposes a nearby point, accepts it if it improves posterior density,
                    and sometimes accepts worse points so it can still explore uncertainty.
                </p>
            </div>

            {/* Controls */}
            <div className="grid md:grid-cols-3 gap-4 px-6 py-4 border-b border-slate-100 bg-slate-50/40">
                {[
                    { label: 'Samples (after burn-in)', val: numSamples, set: setNumSamples, min: 50, max: 800, step: 50, fmt: (v: number) => String(v) },
                    { label: 'Step size', val: stepSize, set: setStepSize, min: 0.01, max: 0.3, step: 0.01, fmt: (v: number) => v.toFixed(2) },
                    { label: 'Seed', val: seed, set: setSeed, min: 1, max: 200, step: 1, fmt: (v: number) => String(v) },
                ].map(s => (
                    <div key={s.label} className="space-y-1.5">
                        <div className="flex justify-between text-sm font-semibold text-slate-600">
                            <span>{s.label}</span>
                            <span className="font-mono text-indigo-700 bg-indigo-50 px-2 rounded">{s.fmt(s.val)}</span>
                        </div>
                        <input type="range" min={s.min} max={s.max} step={s.step} value={s.val}
                            onChange={e => { s.set(s.step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value)); setSamples([]); setPath([]); setAcceptance(null); }}
                            className="w-full accent-purple-500" />
                    </div>
                ))}
            </div>

            {/* Chart */}
            <div className="px-6 pt-5">
                <svg viewBox={`-55 0 ${W + 115} ${H + 45}`} className="w-full" preserveAspectRatio="xMidYMid meet">
                    {/* Heatmap */}
                    {grid.map((col, i) => col.map((v, j) => (
                        <rect key={`${i}-${j}`}
                            x={i * cellW} y={H - (j + 1) * cellH}
                            width={cellW + 0.5} height={cellH + 0.5}
                            fill={`rgba(99,102,241,${(v ** 0.5) * 0.85})`} />
                    )))}
                    <text x="-40" y={H / 2} textAnchor="middle" fontSize="15" fill="#64748b" transform={`rotate(-90, -40, ${H / 2})`}>σ_obs</text>

                    {/* Axes */}
                    <line x1="0" y1={H} x2={W} y2={H} stroke="#475569" strokeWidth="1.5" />
                    <line x1="0" y1="0" x2="0" y2={H} stroke="#475569" strokeWidth="1.5" />

                    {/* X ticks: μ */}
                    {[0.6, 0.8, 1.0, 1.2, 1.4, 1.6].map(v => {
                        const sx = ((v - MU_MIN) / (MU_MAX - MU_MIN)) * W;
                        return (
                            <g key={v}>
                                <line x1={sx} y1={H} x2={sx} y2={H + 5} stroke="#94a3b8" strokeWidth="1" />
                                <text x={sx} y={H + 20} textAnchor="middle" fontSize="14" fill="#94a3b8">{v.toFixed(1)}</text>
                            </g>
                        );
                    })}
                    <text x={W / 2} y={H + 40} textAnchor="middle" fontSize="15" fill="#64748b">log_mu (μ)</text>

                    {/* Y ticks: σ */}
                    {[0.3, 0.5, 0.7, 0.9].map(v => {
                        const sy = H - ((v - SIG_MIN) / (SIG_MAX - SIG_MIN)) * H;
                        return sy >= 0 && sy <= H ? (
                            <g key={v}>
                                <line x1="-5" y1={sy} x2="0" y2={sy} stroke="#94a3b8" strokeWidth="1" />
                                <text x="-10" y={sy + 5} textAnchor="end" fontSize="14" fill="#94a3b8">{v.toFixed(1)}</text>
                            </g>
                        ) : null;
                    })}

                    {/* Chain trajectory */}
                    {path.length > 1 && (
                        <motion.polyline
                            points={path.map(p => { const s = toSVG(p.x, p.y); return `${s.x},${s.y}`; }).join(' ')}
                            fill="none" stroke="#facc15" strokeWidth="1.5" opacity={0.8}
                            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                            transition={{ duration: 1.2, ease: 'easeOut' }} />
                    )}

                    {/* Sample dots */}
                    <AnimatePresence>
                        {samples.map((p, i) => {
                            const s = toSVG(p.x, p.y);
                            return (
                                <motion.circle key={i} cx={s.x} cy={s.y} r={2.5}
                                    fill="#f0abfc" fillOpacity={0.7} stroke="#a855f7" strokeWidth={0.5}
                                    initial={{ r: 0, opacity: 0 }} animate={{ r: 2.5, opacity: 0.8 }}
                                    transition={{ delay: Math.min(i * 0.002, 0.6), duration: 0.12 }} />
                            );
                        })}
                    </AnimatePresence>

                    {/* True parameter marker */}
                    <g>
                        <circle cx={toSVG(TRUE_MU, TRUE_SIG).x} cy={toSVG(TRUE_MU, TRUE_SIG).y} r="8"
                            fill="none" stroke="#fbbf24" strokeWidth="2.5" />
                        <text x={toSVG(TRUE_MU, TRUE_SIG).x + 12} y={toSVG(TRUE_MU, TRUE_SIG).y + 5}
                            fontSize="13" fill="#fbbf24" fontWeight="700">True (μ=1.1, σ=0.6)</text>
                    </g>
                </svg>
            </div>

            {/* Run button + stats */}
            <div className="px-6 pb-6 space-y-4 border-t border-slate-100 pt-4">
                <div className="flex gap-4 items-center flex-wrap">
                    <button onClick={runSampler} disabled={running}
                        className="px-8 py-3.5 rounded-xl bg-purple-600 text-white font-bold text-lg hover:bg-purple-700 active:scale-95 transition-all shadow-lg shadow-purple-200 disabled:opacity-50">
                        {running ? '⚙ Running…' : '▶ Run Sampler'}
                    </button>
                    {acceptance !== null && (
                        <div className={`text-sm font-medium px-4 py-2 rounded-lg ${acceptance > 0.20 && acceptance < 0.5 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            Acceptance rate: <strong>{(acceptance * 100).toFixed(0)}%</strong>
                            {acceptance < 0.20 ? ' (too low — decrease step size)' : acceptance > 0.5 ? ' (too high — increase step size)' : ' ✓ good'}
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-2"><div className="w-4 h-2 rounded bg-purple-300/70" /><span>Posterior samples</span></div>
                    <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-yellow-400" /><span>Chain trajectory (first 80 steps)</span></div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full border-2 border-yellow-400" /><span>True parameter values</span></div>
                </div>
                <div className="text-xs text-slate-400 bg-slate-50 rounded-lg px-4 py-3 border border-slate-100 leading-relaxed space-y-1">
                    <p><strong className="text-slate-600">📋 Workflow reminder:</strong> In practice, always run <strong>prior predictive checks</strong> before sampling, and check <strong>R̂ &lt; 1.01</strong> and <strong>ESS &gt; 400/chain</strong> before trusting results.</p>
                    <p><strong className="text-slate-600">Acceptance rate:</strong> Very low means proposals are too aggressive and often rejected; very high means steps may be too timid and exploration can be slow.</p>
                    <p><strong className="text-slate-600">🔄 Iterative approach:</strong> Start with a simple model, verify it works, then add complexity one piece at a time — this makes debugging far easier than building a complex model all at once.</p>
                </div>
            </div>
        </div>
    );
}
