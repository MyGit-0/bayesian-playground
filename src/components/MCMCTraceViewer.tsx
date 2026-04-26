import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function MCMCTraceViewer() {
    const [samples1, setSamples1] = useState<number[]>([]);
    const [samples2, setSamples2] = useState<number[]>([]);
    const [isSimulating, setIsSimulating] = useState(true);

    // Generate faux MCMC trace steps
    useEffect(() => {
        if (!isSimulating) return;

        const interval = setInterval(() => {
            setSamples1(prev => {
                const next = [...prev, 3.2 + (Math.random() - 0.5) * 0.4];
                if (next.length > 50) next.shift();
                return next;
            });
            setSamples2(prev => {
                // Second chain, starts higher, converges to same mean
                const next = [...prev, 3.2 + (Math.random() - 0.5) * 0.6 + (prev.length < 20 ? 0.3 : 0)];
                if (next.length > 50) next.shift();
                return next;
            });
        }, 100);

        return () => clearInterval(interval);
    }, [isSimulating]);

    return (
        <div className="bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-800 p-6 space-y-6 mt-6 max-w-4xl mx-auto w-full text-slate-200 text-sm">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-xl font-bold text-white mb-2">MCMC Sampling Process</h3>
                    <p className="text-slate-400">Watch the Markov Chains explore the posterior parameter space.</p>
                </div>
                <button
                    onClick={() => setIsSimulating(!isSimulating)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-medium transition"
                >
                    {isSimulating ? 'Pause Sampling' : 'Resume sampling'}
                </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Trace Plot */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 relative aspect-video flex items-end overflow-hidden">
                    <div className="absolute top-3 left-4 text-xs font-mono text-slate-500">Trace Plot</div>
                    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                        {/* Chain 1 */}
                        <motion.polyline
                            points={samples1.map((val, i) => `${i * 2},${100 - (val - 2.5) * 50}`).join(' ')}
                            fill="none" stroke="#60a5fa" strokeWidth="0.8" opacity="0.8"
                        />
                        {/* Chain 2 */}
                        <motion.polyline
                            points={samples2.map((val, i) => `${i * 2},${100 - (val - 2.5) * 50}`).join(' ')}
                            fill="none" stroke="#f472b6" strokeWidth="0.8" opacity="0.8"
                        />
                    </svg>
                </div>

                {/* Diagnostics */}
                <div className="space-y-4 font-mono text-xs">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                        <div className="flex justify-between">
                            <span className="text-slate-400">Total Draws</span>
                            <span className="text-white">{samples1.length * 40}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Effective Sample Size (ESS)</span>
                            <span className="text-emerald-400">{(samples1.length * 15).toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400">Convergence (R̂)</span>
                            <span className={`px-2 py-0.5 rounded ${isSimulating && samples1.length < 20 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                {isSimulating && samples1.length < 20 ? '1.42 (Not converged)' : '1.01 (Converged)'}
                            </span>
                        </div>
                    </div>
                    <p className="text-slate-500 leading-relaxed font-sans">
                        MCMC uses random walks to collect samples proportional to the posterior probability. R̂ checks if multiple independent chains have stabilized to the same distribution, while ESS estimates how many independent draws the autocorrelated samples are worth. If R̂ &gt; 1.01, increase draws, simplify the model, or reparameterize.
                    </p>
                </div>
            </div>
        </div>
    );
}
