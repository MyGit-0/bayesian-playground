import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface Props {
    mu: number;
    sigma: number;
}

const normalCDF = (z: number) => {
    const sign = z < 0 ? -1 : 1;
    const x = Math.abs(z) / Math.sqrt(2);
    const t = 1 / (1 + 0.3275911 * x);
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const erf = sign * (1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));
    return 0.5 * (1 + erf);
};

const lognormalPDF = (x: number, m: number, s: number) => {
    if (x <= 0) return 0;
    const safeSigma = Math.max(s, 0.05);
    return (1 / (x * safeSigma * Math.sqrt(2 * Math.PI))) *
        Math.exp(-0.5 * ((Math.log(x) - m) / safeSigma) ** 2);
};

const buildLognormalPath = (
    m: number,
    s: number,
    minX: number,
    maxX: number,
    chartWidth: number,
    chartHeight: number
) => {
    const points = 220;
    const step = (maxX - minX) / points;

    let maxY = 0;
    for (let i = 0; i <= points; i++) {
        const x = minX + i * step;
        maxY = Math.max(maxY, lognormalPDF(x, m, s));
    }

    let d = "";
    for (let i = 0; i <= points; i++) {
        const x = minX + i * step;
        const y = lognormalPDF(x, m, s);

        const svgX = ((x - minX) / (maxX - minX)) * chartWidth;
        const scaledY = maxY > 0 ? y / maxY : 0;
        const svgY = chartHeight - (scaledY * (chartHeight - 18));

        if (i === 0) d += `M ${svgX} ${svgY} `;
        else d += `L ${svgX} ${svgY} `;
    }
    d += `L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;
    return d;
};

export function PriorPredictiveVisualization({ mu, sigma }: Props) {
    // log_mu ~ Normal(mu, sigma)
    // log(x_i) = log_mu + observation noise, with a fixed visualized noise scale.
    // Marginally, x_i follows LogNormal(mu, sqrt(sigma^2 + observation_noise^2)).

    const observationSigma = 0.6;
    const ppcSigma = Math.sqrt(sigma ** 2 + observationSigma ** 2);
    const minX = 0.01;
    const maxX = 60;
    const chartWidth = 800;
    const chartHeight = 400;

    const pathPrior = useMemo(
        () => buildLognormalPath(mu, sigma, minX, maxX, chartWidth, chartHeight),
        [mu, sigma, minX, maxX, chartWidth, chartHeight]
    );
    const pathPPC = useMemo(
        () => buildLognormalPath(mu, ppcSigma, minX, maxX, chartWidth, chartHeight),
        [mu, ppcSigma, minX, maxX, chartWidth, chartHeight]
    );

    const tailProbability = useMemo(() => {
        const z = (Math.log(48) - mu) / ppcSigma;
        return Math.max(0, Math.min(100, (1 - normalCDF(z)) * 100));
    }, [mu, ppcSigma]);

    const medianPrior = Math.exp(mu);
    const medianPredictive = Math.exp(mu);
    const implausibleLine = ((48 - minX) / (maxX - minX)) * 100;
    const tailIsHeavy = tailProbability > 5;


    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-8 mt-6 max-w-4xl mx-auto w-full">
            <div>
                <h3 className="text-xl font-bold text-slate-800">Prior Predictive Checks (PPC)</h3>
                <p className="text-slate-500 mt-1">If we simulate data using just our prior beliefs, what does the data look like? This diagnostic reveals impossible or implausible assumptions before we fit the model.</p>
            </div>

            <div className="relative w-full aspect-[21/9] bg-slate-50 mt-4 rounded-xl overflow-hidden border border-slate-100 flex items-end">

                {/* Implausibly long-tail region */}
                <div
                    className="absolute top-0 bottom-0 right-0 bg-amber-100/35 border-l-2 border-amber-300"
                    style={{ left: `${implausibleLine}%` }}
                >
                    <div className="absolute top-4 left-4 text-amber-600 font-semibold text-sm">Very long tail<br /><span className="text-xs font-normal">&gt; 48 months</span></div>
                </div>

                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full relative z-10 overflow-visible" preserveAspectRatio="none">
                    <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#cbd5e1" strokeWidth="1.5" />
                    {[0, 6, 12, 24, 48, 60].map(v => {
                        const sx = ((Math.max(v, minX) - minX) / (maxX - minX)) * chartWidth;
                        return (
                            <g key={v}>
                                <line x1={sx} y1={chartHeight - 8} x2={sx} y2={chartHeight} stroke="#94a3b8" />
                                <text x={sx} y={chartHeight - 14} textAnchor="middle" fontSize="18" fill="#64748b">{v}</text>
                            </g>
                        );
                    })}
                    {/* Prior Parameter Path */}
                    <motion.path d={pathPrior} initial={false} animate={{ d: pathPrior }} transition={{ type: "spring", bounce: 0 }}
                        fill="none" strokeWidth="2" strokeDasharray="8 6" className="text-blue-500 stroke-current"
                    />
                    {/* Prior Predictive Data Path */}
                    <motion.path d={pathPPC} initial={false} animate={{ d: pathPPC }} transition={{ type: "spring", bounce: 0 }}
                        fill="url(#grad-ppc)" strokeWidth="3" className="text-indigo-600 stroke-current"
                    />
                    <defs>
                        <linearGradient id="grad-ppc" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="currentColor" stopOpacity="0.5" className="text-indigo-400" />
                            <stop offset="100%" stopColor="currentColor" stopOpacity="0.0" className="text-indigo-50" />
                        </linearGradient>
                    </defs>
                </svg>

                {/* Legend */}
                <div className="absolute top-4 right-4 bg-white/90 p-3 rounded-lg border border-slate-200 shadow-sm z-20 space-y-2 backdrop-blur-md text-sm">
                    <div className="flex items-center gap-2"><div className="w-4 border-t-2 border-blue-500 border-dashed"></div><span className="font-medium text-slate-700">Prior median</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-500"></div><span className="font-medium text-slate-900">Prior Predictive (Data)</span></div>
                </div>
            </div>

            <div className={`p-4 rounded-xl flex items-start gap-4 ${tailIsHeavy ? 'bg-amber-50 border border-amber-100 text-amber-800' : 'bg-emerald-50 border border-emerald-100 text-emerald-800'}`}>
                <div className="shrink-0 p-2 rounded-lg bg-white bg-opacity-50">
                    {tailIsHeavy ? '⚠️' : '✅'}
                </div>
                <div>
                    <p className="font-bold text-lg mb-1">{tailIsHeavy ? 'Prior may be too diffuse in the tail.' : 'Prior is structurally sound.'}</p>
                    <p className="text-sm opacity-90 leading-relaxed">
                        This LogNormal prior predictive assigns <strong>0%</strong> probability to negative durations.
                        The prior median is <strong>{medianPrior.toFixed(2)} months</strong>, the predictive median is <strong>{medianPredictive.toFixed(2)} months</strong>,
                        and approximately <strong>{tailProbability.toFixed(1)}%</strong> of simulated patients exceed 48 months.
                        If that tail is not plausible for the target study, narrow the log-scale prior or encode stronger clinical knowledge.
                    </p>
                </div>
            </div>
        </div>
    );
}
