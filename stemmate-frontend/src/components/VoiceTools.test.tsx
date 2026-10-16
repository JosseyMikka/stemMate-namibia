import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import VoiceTools from './VoiceTools';

// Rendering a learning page must never start audio capture or speak automatically.
let microphoneStarts = 0;
let speechStarts = 0;
Object.defineProperty(globalThis, 'window', {configurable: true, value: {
  SpeechRecognition: class {constructor() {microphoneStarts++;}},
  speechSynthesis: {speak() {speechStarts++;}},
}});
const html = renderToStaticMarkup(<VoiceTools onTranscript={() => {throw Error('Unsolicited transcript');}} readText="Try this question independently." />);
assert.equal(microphoneStarts, 0);
assert.equal(speechStarts, 0);
assert.match(html, /browser may send your voice/);
assert.match(html, /disabled="">Speak my response/);
assert.match(html, /Read the prompt aloud/);
Object.defineProperty(globalThis, 'window', {configurable: true, value: {}});
const unsupported = renderToStaticMarkup(<VoiceTools onTranscript={() => {}} />);
assert.match(unsupported, /does not support voice input/);
assert.match(unsupported, /You can type/);
console.log('Voice privacy defaults, explicit opt-in and unsupported-browser fallback checks passed.');
