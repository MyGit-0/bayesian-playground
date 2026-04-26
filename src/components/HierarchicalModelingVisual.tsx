import { useState } from 'react';
import { motion } from 'framer-motion';

export function HierarchicalModelingVisual() {
    const [poolingType, setPoolingType] = useState<'complete' | 'no' | 'partial'>('partial');

    // Faux data for 4 hospitals mapping out "Long COVID Recovery Time"
    // Hospital 1 has lots of data, Hospital 4 has very little data.
    const groups = [
        { id: 'H1', name: 'Hospital A', n: 50, avg: 3.2 },
        { id: 'H2', name: 'Hospital B', n: 40, avg: 2.8 },
        { id: 'H3', name: 'Hospital C', n: 15, avg: 4.1 },
        { id: 'H4', name: 'Hospital D', n: 3, avg: 6.5 }, // Outlier with low N
    ];

    const axisMin = 2;
    const axisMax = 7;
    const globalAvg = groups.reduce((sum, group) => sum + group.avg * group.n, 0) /
        groups.reduce((sum, group) => sum + group.n, 0);
    const toAxisPct = (value: number) => ((value - axisMin) / (axisMax - axisMin)) * 100;

    // Target positions based on pooling type
    const getPositions = () => {
        switch (poolingType) {
            case 'complete': return [globalAvg, globalAvg, globalAvg, globalAvg];
            case 'no': return [3.2, 2.8, 4.1, 6.5];
            case 'partial': return [3.22, 2.9, 3.85, 4.25]; // Shrinkage towards global mean
        }
    };

    const positions = getPositions();

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6 max-w-4xl mx-auto w-full text-slate-800">
            <div className="flex flex-col sm:flex-row border-b border-slate-200">
                <button
                    onClick={() => setPoolingType('complete')}
                    className={`flex-1 py-3 px-4 text-sm sm:text-base text-center font-semibold transition ${poolingType === 'complete' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    Complete Pooling
                </button>
                <button
                    onClick={() => setPoolingType('no')}
                    className={`flex-1 py-3 px-4 text-sm sm:text-base text-center font-semibold transition ${poolingType === 'no' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    No Pooling
                </button>
                <button
                    onClick={() => setPoolingType('partial')}
                    className={`flex-1 py-3 px-4 text-sm sm:text-base text-center font-semibold transition ${poolingType === 'partial' ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    Partial Pooling
                </button>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
                <div className="h-16">
                    {poolingType === 'complete' && (
                        <p className="text-slate-600 animate-in fade-in duration-300">
                            <strong>Complete Pooling</strong> assumes every hospital shares one population mean. It ignores the specific groupings entirely and estimates one weighted global average. It underfits by ignoring real regional differences.
                        </p>
                    )}
                    {poolingType === 'no' && (
                        <p className="text-slate-600 animate-in fade-in duration-300">
                            <strong>No Pooling</strong> treats every hospital independently. It perfectly fits Hospital D's extreme 6.5 month average, but Hospital D only has 3 patients. This severely overfits to noise in small sample sizes.
                        </p>
                    )}
                    {poolingType === 'partial' && (
                        <p className="text-slate-600 animate-in fade-in duration-300">
                            <strong>Partial Pooling (Hierarchical)</strong> shares statistical strength. It honors the larger samples from Hospitals A & B, while shrinking the noisy estimate for Hospital D toward the global average.
                        </p>
                    )}
                </div>

                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 relative pt-12 pb-8">
                    {/* Global Average Line */}
                    <div className="absolute top-0 bottom-0 left-0 w-full flex items-center justify-center opacity-30 pointer-events-none">
                        <div
                            className="absolute top-0 bottom-0 w-px bg-slate-800 border-r border-dashed border-slate-400"
                            style={{ left: `${toAxisPct(globalAvg)}%` }}
                        />
                    </div>

                    {/* X Axis labels */}
                    <div className="absolute top-4 left-0 w-full px-6 text-xs font-semibold text-slate-400">
                        <span className="absolute left-6">Shorter Duration (2m)</span>
                        <span className="absolute -translate-x-1/2" style={{ left: `${toAxisPct(globalAvg)}%` }}>Global Avg ({globalAvg.toFixed(1)}m)</span>
                        <span className="absolute right-6">Longer Duration (7m)</span>
                    </div>

                    <div className="space-y-6 mt-4 relative z-10">
                        {groups.map((group, i) => (
                            <div key={group.id} className="relative flex items-center">
                                <div className="w-24 shrink-0 text-sm font-medium text-slate-700">
                                    {group.name}
                                    <div className="text-xs text-slate-400">n = {group.n}</div>
                                </div>

                                <div className="flex-1 relative h-6">
                                    {/* Line track */}
                                    <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-200 -translate-y-1/2"></div>

                                    {/* The raw data point (fixed) */}
                                    <div
                                        className="absolute top-1/2 w-2 h-2 rounded-full border-2 border-slate-400 bg-white -translate-y-1/2 -ml-1 z-0 opacity-50"
                                        style={{ left: `${toAxisPct(group.avg)}%` }}
                                        title={`Raw Average: ${group.avg}`}
                                    ></div>

                                    {/* The model estimate (animated) */}
                                    <motion.div
                                        className={`absolute top-1/2 w-4 h-4 rounded-full -translate-y-1/2 -ml-2 z-10 shadow-md ${poolingType === 'complete' ? 'bg-blue-500' :
                                                poolingType === 'no' ? 'bg-indigo-500' : 'bg-emerald-500'
                                            }`}
                                        animate={{ left: `${toAxisPct(positions[i])}%` }}
                                        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                                    >
                                        {/* Connecting line to global mean during partial pooling */}
                                        {poolingType === 'partial' && (
                                            <motion.div
                                                className="absolute top-1/2 right-full h-px bg-emerald-300 transform -translate-y-1/2 -mr-2 origin-right"
                                                initial={{ opacity: 0, scaleX: 0 }}
                                                animate={{
                                                    opacity: 1,
                                                    // approx distance to global mean line
                                                    scaleX: Math.abs(positions[i] - 3.1) * 30
                                                }}
                                            />
                                        )}
                                    </motion.div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-medium text-slate-500 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full border-2 border-slate-400 bg-white"></div> Raw Data Avg</div>
                    <div className="flex items-center gap-1">
                        <div className={`w-3 h-3 rounded-full ${poolingType === 'complete' ? 'bg-blue-500' : poolingType === 'no' ? 'bg-indigo-500' : 'bg-emerald-500'}`}></div>
                        Model Estimate
                    </div>
                </div>
            </div>
        </div>
    );
}
