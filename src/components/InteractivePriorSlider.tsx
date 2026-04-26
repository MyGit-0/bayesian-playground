import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface Props {
    mu: number;
    sigma: number;
    onChange: (mu: number, sigma: number) => void;
    title?: string;
    description?: string;
}

export function InteractivePriorSlider({ mu, sigma, onChange, title = "Prior Distribution", description = "Adjust our initial beliefs about the parameter." }: Props) {

    // Generate curve path points based on Normal distribution PDF
    const pathData = useMemo(() => {
        const minX = -10;
        const maxX = 10;
        const points = 100;
        const step = (maxX - minX) / points;

        // Normal PDF: f(x) = (1 / (sigma * sqrt(2*PI))) * exp(-0.5 * ((x - mu)/sigma)^2)
        const pdf = (x: number) => {
            const coef = 1 / (Math.max(sigma, 0.1) * Math.sqrt(2 * Math.PI));
            const exponent = -0.5 * Math.pow((x - mu) / Math.max(sigma, 0.1), 2);
            return coef * Math.exp(exponent);
        };

        // Scale to SVG viewport (e.g. 800x400)
        // x from [-10, 10] maps to [0, 800]
        // y from [0, 1] maps to [400, 0] (since svg y goes down)

        let d = "";
        for (let i = 0; i <= points; i++) {
            const x = minX + i * step;
            const y = pdf(x);

            const svgX = ((x - minX) / (maxX - minX)) * 800;
            // Max possible Y roughly around 1.0 (for sigma=0.4), so we scale maxY=1 to svgY=0
            const svgY = 400 - (y * 400);

            if (i === 0) d += `M ${svgX} ${svgY} `;
            else d += `L ${svgX} ${svgY} `;
        }

        // Close path to fill
        d += `L 800 400 L 0 400 Z`;

        return d;
    }, [mu, sigma]);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-8 mt-6 max-w-4xl mx-auto w-full">
            <div>
                <h3 className="text-xl font-bold text-slate-800">{title}</h3>
                <p className="text-slate-500 mt-1">{description}</p>
            </div>

            <div className="relative w-full aspect-[2/1] bg-slate-50 mt-4 rounded-xl overflow-hidden border border-slate-100 flex items-end">

                {/* Grid lines */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:40px_40px] opacity-50"></div>

                {/* Zero Axis */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300 pointer-events-none border-dashed border-l border-slate-300"></div>

                <svg viewBox="0 0 800 400" className="w-full h-full relative z-10 overflow-visible" preserveAspectRatio="none">
                    <motion.path
                        d={pathData}
                        initial={false}
                        animate={{ d: pathData }}
                        transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                        fill="url(#gradient-fill)"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="text-blue-500"
                    />
                    <defs>
                        <linearGradient id="gradient-fill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" className="text-blue-400" />
                            <stop offset="100%" stopColor="currentColor" stopOpacity="0.0" className="text-blue-50" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm font-medium text-slate-700">
                        <span className="flex items-center gap-1 font-mono bg-slate-100 px-2 py-0.5 rounded">
                            <span className="italic">&mu;</span> (Mean)
                        </span>
                        <span className="tabular-nums font-semibold">{mu.toFixed(1)}</span>
                    </div>
                    <input
                        type="range"
                        min="-5" max="5" step="0.1"
                        value={mu}
                        onChange={(e) => onChange(parseFloat(e.target.value), sigma)}
                        className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-slate-400">
                        <span>-5</span>
                        <span>0</span>
                        <span>+5</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm font-medium text-slate-700">
                        <span className="flex items-center gap-1 font-mono bg-slate-100 px-2 py-0.5 rounded">
                            <span className="italic">&sigma;</span> (Std Dev)
                        </span>
                        <span className="tabular-nums font-semibold">{sigma.toFixed(2)}</span>
                    </div>
                    <input
                        type="range"
                        min="0.2" max="5" step="0.1"
                        value={sigma}
                        onChange={(e) => onChange(mu, parseFloat(e.target.value))}
                        className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-slate-400">
                        <span>Tight (confident)</span>
                        <span>Wide (Uncertain)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
