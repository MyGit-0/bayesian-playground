export function CalibrationPITVisual() {
    return (
        <div className="bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-800 p-6 space-y-6 mt-6 max-w-4xl mx-auto w-full text-slate-200 text-sm">
            <div>
                <h3 className="text-xl font-bold text-white mb-2">LOO-PIT Calibration (Probability Integral Transform)</h3>
                <p className="text-slate-400 leading-relaxed">
                    A useful predictive model should not only make accurate predictions; it should also admit uncertainty at the right scale. LOO-PIT (Leave-One-Out Probability Integral Transform) checks whether held-out observations fall inside the model's predictive distributions as often as they should.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4 font-sans pt-4">

                {/* Underdispersed (Overconfident) */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 relative">
                    <div className="absolute top-2 right-2 text-xl opacity-20">⚠️</div>
                    <div className="font-bold text-amber-500">Overconfident</div>
                    <div className="text-xs text-slate-500 h-8">Model thinks it's strictly accurate, but real data falls in the extreme tails. (Under-dispersed).</div>

                    <div className="h-24 w-full flex items-end justify-between px-2 pt-4 border-b border-slate-700 gap-1 pb-1">
                        <div className="w-full bg-slate-700 rounded-t h-[80%]"></div>
                        <div className="w-full bg-slate-700 rounded-t h-[40%]"></div>
                        <div className="w-full bg-slate-700 rounded-t h-[20%]"></div>
                        <div className="w-full bg-slate-700 rounded-t h-[20%]"></div>
                        <div className="w-full bg-slate-700 rounded-t h-[40%]"></div>
                        <div className="w-full bg-slate-700 rounded-t h-[80%]"></div>
                    </div>
                    <div className="text-[10px] text-center text-slate-500 mt-1">U-Shape PIT Plot</div>
                </div>

                {/* Well Calibrated */}
                <div className="bg-slate-950 p-4 rounded-xl border border-emerald-900/50 shadow-[0_0_15px_rgba(16,185,129,0.1)] space-y-3 relative ring-1 ring-emerald-500/20">
                    <div className="absolute top-2 right-2 text-xl opacity-20">✅</div>
                    <div className="font-bold text-emerald-400">Well Calibrated</div>
                    <div className="text-xs text-slate-400 h-8">Uncertainty matches reality perfectly. Real data is distributed uniformly.</div>

                    <div className="h-24 w-full flex items-end justify-between px-2 pt-4 border-b border-emerald-900/50 gap-1 pb-1">
                        <div className="w-full bg-emerald-600/60 rounded-t h-[48%]"></div>
                        <div className="w-full bg-emerald-600/60 rounded-t h-[52%]"></div>
                        <div className="w-full bg-emerald-600/60 rounded-t h-[45%]"></div>
                        <div className="w-full bg-emerald-600/60 rounded-t h-[55%]"></div>
                        <div className="w-full bg-emerald-600/60 rounded-t h-[50%]"></div>
                        <div className="w-full bg-emerald-600/60 rounded-t h-[49%]"></div>
                    </div>
                    <div className="text-[10px] text-center text-emerald-600/80 mt-1">Uniform PIT Plot</div>
                </div>

                {/* Overdispersed (Underconfident) */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 relative">
                    <div className="absolute top-2 right-2 text-xl opacity-20">⚠️</div>
                    <div className="font-bold text-amber-500">Underconfident</div>
                    <div className="text-xs text-slate-500 h-8">Model is too vague. Real data is mostly falling exactly in the middle of predictions. (Over-dispersed).</div>

                    <div className="h-24 w-full flex items-end justify-between px-2 pt-4 border-b border-slate-700 gap-1 pb-1">
                        <div className="w-full bg-slate-700 rounded-t h-[20%]"></div>
                        <div className="w-full bg-slate-700 rounded-t h-[40%]"></div>
                        <div className="w-full bg-slate-700 rounded-t h-[80%]"></div>
                        <div className="w-full bg-slate-700 rounded-t h-[80%]"></div>
                        <div className="w-full bg-slate-700 rounded-t h-[40%]"></div>
                        <div className="w-full bg-slate-700 rounded-t h-[20%]"></div>
                    </div>
                    <div className="text-[10px] text-center text-slate-500 mt-1">Hump-Shape PIT Plot</div>
                </div>

            </div>
        </div>
    );
}
