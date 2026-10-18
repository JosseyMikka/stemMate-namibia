import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

function displayMath(math:string){
  const value=math.trim();
  // Bare display rows need an alignment environment for row spacing to render.
  const rows=/\\\\/.test(value)&&! /\\begin\{/.test(value);
  return `\n\n$$\n${rows?'\\begin{aligned}\n'+value+'\n\\end{aligned}':value}\n$$\n\n`;
}

// Models often put both display delimiters on one line. Markdown math expects
// a block; normalize outside code so those equations retain display layout.
function normalizeMath(content: string) {
  return content.split(/(`{3,}[\s\S]*?`{3,}|~{3,}[\s\S]*?~{3,}|`+[^`\n]*`+)/g)
    .map((part, index) => index % 2 ? part : part.replace(/\\n(?=\\n|\s|\d|[A-Z]|$)/g, '\n').replace(/\\\(([\s\S]*?)\\\)/g, (_, math: string) => '$' + math + '$').replace(/(?<!\\)\\\[([\s\S]*?)\\\]/g, (_, math: string) => '$$' + math + '$$').replace(/(?<!\\)\bN[ \t]*\$(?=[ \t]*\d)/g, 'N\\$').replace(/\$\$([\s\S]*?)\$\$/g,
      (_, math: string) => displayMath(math))).join('');
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
