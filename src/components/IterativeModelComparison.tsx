import { useState } from 'react';

export function IterativeModelComparison() {
    const [selectedModel, setSelectedModel] = useState<'simple' | 'complex'>('simple');

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6 max-w-4xl mx-auto w-full text-slate-800">
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setSelectedModel('simple')}
                    className={`flex-1 py-4 px-6 text-center font-semibold transition ${selectedModel === 'simple' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    Model 1: Simple Mean
                </button>
                <button
                    onClick={() => setSelectedModel('complex')}
                    className={`flex-1 py-4 px-6 text-center font-semibold transition ${selectedModel === 'complex' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    Model 2: With Demographics
                </button>
            </div>

            <div className="p-8 space-y-8">
                {selectedModel === 'simple' ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h3 className="text-xl font-bold">The Constant Trend Model</h3>
                        <p className="text-slate-600">Assumes every patient has the same underlying expected duration (~3 months).</p>
                        <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 flex justify-center py-12">
                            <div className="w-full max-w-md relative h-32 border-l-2 border-b-2 border-slate-300">
                                <div className="absolute bottom-[-24px] right-0 text-xs text-slate-500">Patient Age</div>
                                <div className="absolute top-0 left-[-20px] -rotate-90 text-xs text-slate-500 origin-bottom-left">Duration</div>
                                {/* Flat constant line with uncertainty band */}
                                <div className="absolute top-1/2 left-0 right-0 h-8 -translate-y-1/2">
                                    <div className="absolute left-0 right-0 top-1/2 h-8 -translate-y-1/2 bg-blue-200/50 rounded blur-sm"></div>
                                    <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 bg-blue-500 rounded-full shadow-lg shadow-blue-500/20"></div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-lg flex items-start gap-3 border border-emerald-100">
                            <div className="font-bold">ELPD-LOO:</div>
                            <div className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-200">-1200.5</div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h3 className="text-xl font-bold">The Demographic Trend Model</h3>
                        <p className="text-slate-600">Accounts for varying baseline duration depending on Patient Age and prior health conditions. The line is a schematic posterior predictive trend: older or higher-risk patients are expected to have longer durations on average.</p>
                        <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 flex justify-center py-12">
                            <div className="w-full max-w-md relative h-32 border-l-2 border-b-2 border-slate-300">
                                <div className="absolute bottom-[-24px] right-0 text-xs text-slate-500">Patient Age</div>
                                <div className="absolute top-0 left-[-20px] -rotate-90 text-xs text-slate-500 origin-bottom-left">Duration</div>
                                {/* Upward trend line with uncertainty band */}
                                <div className="absolute bottom-4 left-0 w-[110%] h-12 origin-left -rotate-12">
                                    <div className="absolute left-0 right-0 top-1/2 h-12 -translate-y-1/2 bg-indigo-200/50 rounded blur-sm"></div>
                                    <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/20"></div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-lg flex items-start gap-3 border border-emerald-100">
                            <div>
                                <div className="font-bold flex items-center gap-2">ELPD-LOO: <span className="text-xs bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">Winner</span></div>
                            </div>
                            <div className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-200">-850.2</div>
                        </div>
                        <p className="text-sm text-slate-500 italic mt-2">On the log-score scale, higher ELPD-LOO suggests better expected out-of-sample prediction. Small differences should be judged against their standard errors.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
