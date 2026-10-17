import { useEffect, useRef, useState } from 'react';

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: {results: ArrayLike<ArrayLike<{transcript: string}>>}) => void) | null;
  onerror: ((event: {error: string}) => void) | null;
  onend: (() => void) | null;
  start: () => void; abort: () => void;
};
type VoiceWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export default function VoiceTools({onTranscript, readText, disabled = false, allowDictation = true}: {
  onTranscript: (text: string) => void; readText?: string; disabled?: boolean; allowDictation?: boolean;
}) {
  const [allowed, setAllowed] = useState(false);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState('');
  const active = useRef<Recognition | null>(null);
  const supported = Boolean((window as VoiceWindow).SpeechRecognition || (window as VoiceWindow).webkitSpeechRecognition);
  function stop() {
    if (active.current) {
      active.current.onresult = null;
      active.current.abort();
      active.current = null;
    }
    setListening(false);
    window.speechSynthesis?.cancel();
  }
  useEffect(() => () => {
    const recognition = active.current;
    if (recognition) {recognition.onresult = null; recognition.onend = null; recognition.abort();}
    window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => {
    if (!allowDictation && active.current) {
      active.current.onresult = null;
      active.current.abort();
      active.current = null;
    }
  }, [allowDictation]);

  function dictate() {
    if (disabled || !allowDictation || !allowed || active.current) return;
    const Constructor = (window as VoiceWindow).SpeechRecognition || (window as VoiceWindow).webkitSpeechRecognition;
    if (!Constructor) return;
    window.speechSynthesis?.cancel();
    const recognition = new Constructor();
    active.current = recognition;
    recognition.lang = 'en-NA';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = event => {
      if (active.current !== recognition) return;
      const transcript = Array.from(event.results).map(result => result[0]?.transcript ?? '').join(' ').trim();
      if (transcript) onTranscript(transcript);
      setStatus('Words added. Check and edit them before continuing, especially numbers and equations.');
    };
    recognition.onerror = event => setStatus(event.error === 'not-allowed'
      ? 'Microphone permission was denied. You can still type your response.'
      : 'Voice input is unavailable. Please try again or type your response.');
    recognition.onend = () => {if (active.current === recognition) active.current = null; setListening(false);};
    try {recognition.start(); setListening(true); setStatus('Listening. Speak a short idea, then pause.');}
    catch {active.current = null; setListening(false); setStatus('Could not start the microphone. Please type instead.');}
  }
  function read() {
    if (!readText || !window.speechSynthesis) return;
    stop();
    const voice = window.speechSynthesis.getVoices().find(v => v.localService && v.lang.startsWith('en'));
    if (!voice) {setStatus('A local English voice is not available. Use the written prompt or your screen reader.'); return;}
    const utterance = new SpeechSynthesisUtterance(readText.replace(/[$*#`]/g, '').slice(0, 5000));
    utterance.voice = voice; utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
    setStatus('Reading the prompt. Equations may sound different from their written notation.');
  }
  return <details className="voice-tools" onToggle={event => {if (!event.currentTarget.open) stop();}}><summary>Voice input and spoken prompts</summary>
    <p>Voice is optional. STEMMate does not record or store audio. Your browser may send your voice to its speech service for transcription. Ask a teacher or guardian before enabling the microphone. Keep personal information out of your speech.</p>
    {!allowDictation && <p>Voice dictation is off for this activity. Typing and local spoken prompts remain available.</p>}
    {supported && allowDictation ? <label className="check"><input type="checkbox" checked={allowed} disabled={disabled || listening} onChange={e => {stop(); setAllowed(e.target.checked);}} /> I understand how voice input works and want to enable it.</label>
      : !supported ? <p>This browser does not support voice input. You can type, or use your device’s keyboard dictation.</p> : null}
    <button type="button" className="secondary" disabled={disabled || !allowDictation || !supported || !allowed || listening} onClick={dictate}>Speak my response</button>
    {readText && <button type="button" className="secondary" disabled={disabled || !('speechSynthesis' in window)} onClick={read}>Read the prompt aloud</button>}
    <button type="button" className="secondary" onClick={() => {stop(); setStatus('Voice stopped.');}}>Stop voice</button>
    <p role="status">{status}</p>
  </details>;
}
