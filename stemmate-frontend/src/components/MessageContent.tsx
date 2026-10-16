import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// Models often put both display delimiters on one line. Markdown math expects
// a block; normalize outside code so those equations retain display layout.
function normalizeMath(content: string) {
  return content.split(/(`{3,}[\s\S]*?`{3,}|~{3,}[\s\S]*?~{3,}|`+[^`\n]*`+)/g)
    .map((part, index) => index % 2 ? part : part.replace(/\$\$([\s\S]*?)\$\$/g,
      (_, math: string) => `\n\n$$\n${math.trim()}\n$$\n\n`)).join('');
}

export default function MessageContent({ content, isTyping }: {content: string; isTyping?: boolean}) {
  if (isTyping) return <p role="status">Preparing your learning activity…</p>;
  return <div className="message-content"><ReactMarkdown
    remarkPlugins={[remarkMath]}
    rehypePlugins={[[rehypeKatex, {throwOnError: false, trust: false, strict: 'warn', maxExpand: 1000}]]}
    skipHtml
    components={{a: ({children}) => <span>{children}</span>, img: () => null}}
  >{normalizeMath(content)}</ReactMarkdown></div>;
}
