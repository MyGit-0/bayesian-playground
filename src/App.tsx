import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, BookOpen, Activity, BarChart2, CheckCircle } from 'lucide-react';
import { ChapterMindset } from './chapters/ChapterMindset';
import { ChapterModelBuilding } from './chapters/ChapterModelBuilding';
import { ChapterInference } from './chapters/ChapterInference';
import { ChapterValidation } from './chapters/ChapterValidation';

const CHAPTERS = [
    { id: 'mindset', title: '1. The Bayesian Mindset', icon: BookOpen },
    { id: 'model_building', title: '2. Building the Model', icon: Activity },
    { id: 'inference', title: '3. Inference & Updating', icon: BarChart2 },
    { id: 'validation', title: '4. Model Validation', icon: CheckCircle },
];

function App() {
    const [activeChapter, setActiveChapter] = useState('mindset');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // States for Interactive Components
    const [priorMu, setPriorMu] = useState(0);
    const [priorSigma, setPriorSigma] = useState(1);
    const [dataMu, setDataMu] = useState(2.5);
    const [dataSigma, setDataSigma] = useState(0.8);

    const renderContent = () => {
        switch (activeChapter) {
            case "mindset":
                return <ChapterMindset />;
            case "model_building":
                return (
                    <ChapterModelBuilding
                        priorMu={priorMu} setPriorMu={setPriorMu}
                        priorSigma={priorSigma} setPriorSigma={setPriorSigma}
                    />
                );
            case "inference":
                return (
                    <ChapterInference
                        priorMu={priorMu} priorSigma={priorSigma}
                        dataMu={dataMu} setDataMu={setDataMu}
                        dataSigma={dataSigma} setDataSigma={setDataSigma}
                    />
                );
            case "validation":
                return <ChapterValidation />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row font-sans selection:bg-blue-200 selection:text-blue-900">

            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between p-4 bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Bayesian Guide
                </h1>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Sidebar */}
            <motion.aside
                initial={{ x: -300 }}
                animate={{ x: isSidebarOpen ? 0 : -300 }}
                transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                className={`fixed md:sticky top-0 left-0 z-40 h-screen w-72 bg-white/80 backdrop-blur-xl border-r border-slate-200 shrink-0 shadow-2xl md:shadow-none flex flex-col py-4 md:py-0 ${isSidebarOpen ? 'block' : 'hidden md:block'
                    }`}
            >
                <div className="p-8 hidden md:block">
                    <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-br from-blue-700 to-indigo-700 bg-clip-text text-transparent flex flex-col gap-1">
                        <span>Bayesian</span>
                        <span>Playground</span>
                    </h1>
                    <p className="text-sm text-slate-500 mt-3 font-medium border-l-2 border-blue-200 pl-3">Simulation-Based<br />Inference Guide</p>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-1.5 overflow-y-auto">
                    {CHAPTERS.map((chapter) => {
                        const Icon = chapter.icon;
                        const isActive = activeChapter === chapter.id;
                        return (
                            <button
                                key={chapter.id}
                                onClick={() => {
                                    setActiveChapter(chapter.id);
                                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                                }}
                                className={`w-full flex flex-col gap-1.5 px-4 py-3.5 rounded-xl transition-all duration-300 text-left relative overflow-hidden group ${isActive
                                    ? 'bg-blue-50 border-blue-100 shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-100/60 border-transparent hover:text-slate-900 font-medium'
                                    } border`}
                            >
                                {isActive && (
                                    <motion.div layoutId="sidebar-active" className="absolute inset-0 bg-white/40 ring-1 ring-inset ring-blue-500/10 rounded-xl -z-10"></motion.div>
                                )}
                                <div className={`flex items-center gap-3 ${isActive ? 'text-blue-800 font-semibold' : 'text-slate-700'}`}>
                                    <Icon size={18} className={`${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-500 transition-colors'}`} />
                                    {chapter.title}
                                </div>
                            </button>
                        );
                    })}
                </nav>

                {/* Footer Attribution */}
                <div className="px-5 py-4 border-t border-slate-100 shrink-0">
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                        Made with ❤️ in<br />
                        <span className="font-medium text-slate-500">Georg-August-Universität Göttingen</span>
                        <br />
                        <span className="italic">in publica commoda</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                        Authors:{' '}
                        <a
                            href="https://www.linkedin.com/in/amirreza-aleyasin/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700 font-medium transition-colors underline-offset-2 hover:underline"
                        >
                            Amir
                        </a>
                        {' & '}
                        <a
                            href="https://www.linkedin.com/in/vera-gna%C3%9F-4b0b85279/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700 font-medium transition-colors underline-offset-2 hover:underline"
                        >
                            Vera
                        </a>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                        <a
                            href="https://www.linkedin.com/in/mohammadreza-radnezhad-394056219/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700 font-medium transition-colors underline-offset-2 hover:underline"
                        >
                            Mohammadreza
                        </a>
                    </p>
                </div>
            </motion.aside>

            {/* Main Content Area */}
            <main className="flex-1 min-h-screen max-w-4xl w-full mx-auto pb-24">
                <div className="p-6 md:p-12 lg:px-20 lg:py-16">

                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-bold mb-8 shadow-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        Interactive Chapter
                    </div>

                    <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight mb-12">
                        {CHAPTERS.find(c => c.id === activeChapter)?.title.split('. ')[1]}
                    </h2>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeChapter}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.35, ease: 'easeOut' }}
                        >
                            {renderContent()}
                        </motion.div>
                    </AnimatePresence>

                </div>
            </main>
        </div>
    );
}

export default App;
