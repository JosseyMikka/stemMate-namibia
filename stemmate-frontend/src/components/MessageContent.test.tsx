import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import MessageContent from './MessageContent';

const render = (content: string) => renderToStaticMarkup(<MessageContent content={content} />);
const math = render('Inline $x^2$ and display:\n\n$$\\frac{1}{2} = 0.5$$');
assert.match(math, /katex/);
assert.match(math, /<math/); // Accessible MathML is emitted alongside visible HTML.
assert.match(math, /katex-display/);
assert.doesNotMatch(render('<script>alert(1)</script><img src=x onerror=alert(1)>'), /<script|<img|onerror=/);
assert.doesNotMatch(render('![tracking](https://example.org/pixel) [go](javascript:alert(1))'), /<img|href=/);
assert.doesNotThrow(() => render('$\\notACommand{x}$'));
assert.doesNotMatch(render('$\\href{javascript:alert(1)}{click}$'), /href="javascript/);
assert.match(render('`$$x$$`'), /<code>\$\$x\$\$<\/code>/);
assert.match(render('1. First\n2. Second'), /<ol>/);
assert.match(render('$2H_2+O_2\\rightarrow2H_2O$'), /<math/);
assert.match(render('```text\ntotal <- 0\nOUTPUT total\n```'), /<pre><code/);
console.log('Math, accessibility markup, malformed input and content safety checks passed.');

const currency = render('A hire costs N$5 plus N$2 per hour. Solve $5+2h=15$.');
assert.match(currency, /N\$5 plus N\$2 per hour/);
assert.equal((currency.match(/<math/g)??[]).length, 1);
