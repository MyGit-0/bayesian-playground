
import { SyntaxHighlighter } from '../hooks/useSyntaxHighlighter'
import { Code } from 'lucide-react';

interface CodeBlockProps {
    code: string;
    language?: string;
    title?: string;
}

const customStyle = {
    margin: 0,
    borderRadius: 0,
    background: 'transparent',
    fontSize: '0.8125rem',    // 13px
    lineHeight: '1.75',
    padding: '0',
};

const codeTagStyle = {
    fontFamily: '"Fira Code", "JetBrains Mono", "Cascadia Code", ui-monospace, monospace',
};

export function CodeBlock({ code, language = 'python', title }: CodeBlockProps) {
    return (
        <div className="rounded-xl overflow-hidden shadow-xl border border-slate-700/50">
            {/* Header bar */}
            <div className="flex items-center gap-2.5 px-5 py-3 bg-[#1a1d27] border-b border-slate-700/60">
                {/* Traffic light dots */}
                <span className="w-3 h-3 rounded-full bg-red-500/80 block" />
                <span className="w-3 h-3 rounded-full bg-amber-400/80 block" />
                <span className="w-3 h-3 rounded-full bg-emerald-400/80 block" />
                <div className="flex items-center gap-2 ml-2 text-slate-400">
                    <Code size={14} />
                    {title && <span className="text-xs font-mono font-medium text-slate-300">{title}</span>}
                </div>
            </div>
            {/* Code */}
            <div className="bg-[#1e2030] overflow-x-auto p-5">
                <SyntaxHighlighter
                    code={code.trim()}
                    language={language}
                    customStyle={customStyle}
                    codeTagProps={{ style: codeTagStyle }}
                    wrapLongLines={false}
                >
                </SyntaxHighlighter>
            </div>
        </div>
    );
}
