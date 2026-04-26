import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface Props {
    mu: number;
    sigma: number;
}

export function PriorPredictiveVisualization({ mu, sigma }: Props) {
    // Simulate draws from the prior: Normal(mu, sigma)
    // For the sake of the visualization, we'll plot the distribution of expected data observations
    // Since Observation ~ Normal(true_duration, 1.5) and true_duration ~ Normal(mu, sigma)
    // The Prior Predictive Distribution analytically is Normal(mu, sqrt(sigma^2 + 1.5^2))

    const likelihoodSigma = 1.5;
    const ppcSigma = Math.sqrt(sigma ** 2 + likelihoodSigma ** 2);

    const getPath = (m: number, s: number) => {
        const minX = -10; const maxX = 20; const points = 150;
        const step = (maxX - minX) / points;

        const pdf = (x: number) => {
            const coef = 1 / (Math.max(s, 0.1) * Math.sqrt(2 * Math.PI));
            const exp = -0.5 * Math.pow((x - m) / Math.max(s, 0.1), 2);
            return coef * Math.exp(exp);
        };

        let d = "";
        for (let i = 0; i <= points; i++) {
            const x = minX + i * step;
            const y = pdf(x);

            const svgX = ((x - minX) / (maxX - minX)) * 800;
            // Max possible Y roughly around 0.5 (for sigma=0.8), scale maxY=0.5 to svgY=0
            const scaledY = Math.min(y * 1.5, 1);
            const svgY = 400 - (scaledY * 400);

            if (i === 0) d += `M ${svgX} ${svgY} `;
            else d += `L ${svgX} ${svgY} `;
        }
        d += `L 800 400 L 0 400 Z`;
        return d;
    };

    const pathPrior = useMemo(() => getPath(mu, sigma), [mu, sigma]);
    const pathPPC = useMemo(() => getPath(mu, ppcSigma), [mu, ppcSigma]);

    // Determine if the prior allows for "impossible" (negative) durations
    // Approximate probability of drawing a negative number from Normal
    // using rough ERF approximation heuristics
    const probNegative = useMemo(() => {
        const z = -mu / ppcSigma;
        // rough approximation for visualizing severity
        if (z > 2) return 99;
        if (z > 1) return 84;
        if (z > 0) return 50;
        if (z > -1) return 16;
        if (z > -2) return 2;
        return 0;
    }, [mu, ppcSigma]);


    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-8 mt-6 max-w-4xl mx-auto w-full">
            <div>
                <h3 className="text-xl font-bold text-slate-800">Prior Predictive Checks (PPC)</h3>
                <p className="text-slate-500 mt-1">If we simulate data using just our prior beliefs, what does the data look like? This diagnostic reveals impossible or implausible assumptions before we fit the model.</p>
            </div>

            <div className="relative w-full aspect-[21/9] bg-slate-50 mt-4 rounded-xl overflow-hidden border border-slate-100 flex items-end">

                {/* Impossible Negative region */}
                <div className="absolute left-0 top-0 bottom-0 w-[41%] bg-red-100/30 border-r-2 border-red-300">
                    <div className="absolute top-4 left-4 text-red-500 font-semibold text-sm">Negative Durations<br /><span className="text-xs font-normal">Impossible reality</span></div>
                </div>

                {/* Zero Axis */}
                <div className="absolute left-[41%] top-0 bottom-0 w-px bg-slate-400 z-0"></div>
                <div className="absolute top-4 left-[42%] text-slate-500 font-semibold text-sm">Zero Months</div>

                <svg viewBox="0 0 800 400" className="w-full h-full relative z-10 overflow-visible" preserveAspectRatio="none">
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
                    <div className="flex items-center gap-2"><div className="w-4 border-t-2 border-blue-500 border-dashed"></div><span className="font-medium text-slate-700">Prior (Parameter)</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-500"></div><span className="font-medium text-slate-900">Prior Predictive (Data)</span></div>
                </div>
            </div>

            <div className={`p-4 rounded-xl flex items-start gap-4 ${probNegative > 10 ? 'bg-red-50 border border-red-100 text-red-800' : 'bg-emerald-50 border border-emerald-100 text-emerald-800'}`}>
                <div className="shrink-0 p-2 rounded-lg bg-white bg-opacity-50">
                    {probNegative > 10 ? '⚠️' : '✅'}
                </div>
                <div>
                    <p className="font-bold text-lg mb-1">{probNegative > 10 ? 'Prior entails impossible data!' : 'Prior looks structurally sound.'}</p>
                    <p className="text-sm opacity-90 leading-relaxed">
                        Under this unconstrained demonstration, roughly <strong>~{probNegative}%</strong> of simulated patients have a negative Long COVID duration. That is physically impossible. Tightening sigma, shifting mu, or using a positive distribution such as LogNormal teaches the model that negative durations cannot occur.
                    </p>
                </div>
            </div>
        </div>
    );
}
