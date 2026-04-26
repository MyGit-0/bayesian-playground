import { useEffect, useRef } from 'react'
import type { CSSProperties, HTMLAttributes } from 'react'
import hljs from 'highlight.js/lib/core'

// Pre-import common languages
import python from 'highlight.js/lib/languages/python'

import 'highlight.js/styles/github-dark.min.css'

hljs.registerLanguage('python', python)

interface SyntaxHighlighterProps {
  code: string
  language: string
  customStyle?: CSSProperties
  codeTagProps?: HTMLAttributes<HTMLElement>
  showLineNumbers?: boolean
  wrapLongLines?: boolean
}

export const SyntaxHighlighter = ({
  code,
  language,
  customStyle,
  codeTagProps,
  wrapLongLines = false
}: SyntaxHighlighterProps) => {
  const codeRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (codeRef.current && hljs.getLanguage(language)) {
      codeRef.current.textContent = code
      hljs.highlightElement(codeRef.current)
    }
  }, [code, language])

  return (
    <pre 
      style={customStyle} 
      className={`hljs ${wrapLongLines ? 'whitespace-pre-wrap' : ''}`}
    >
      <code 
        ref={codeRef}
        {...codeTagProps}
        className={`language-${language}`}
      />
    </pre>
  )
}
