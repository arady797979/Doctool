
import React, { useState, useEffect, useRef } from 'react';
import { PersonaMode, ChatMessage, ExpertResponse, SupportResponse, Attachment, SavedNote } from './types';
import { generateTheraSyntResponse, getLiveConnection } from './services/geminiService';
import { ExpertView } from './components/ExpertView';
import { SupportView } from './components/SupportView';

// Audio helper functions for decoding base64 audio and encoding PCM data
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const NexusOrb = ({ mode, active, level }: { mode: PersonaMode, active: boolean, level: number }) => {
  const scale = active ? 1 + level * 0.8 : 1;
  return (
    <div className="relative flex items-center justify-center" style={{ transform: `scale(${scale})`, transition: 'transform 0.1s ease-out' }}>
      <div className={`absolute inset-0 rounded-full blur-[60px] opacity-20 transition-all duration-1000 ${mode === PersonaMode.EXPERT ? 'bg-indigo-600' : 'bg-rose-500'}`} style={{ transform: `scale(${2 + level * 3})` }}></div>
      <div className={`relative w-24 h-24 md:w-40 md:h-40 rounded-[3.5rem] flex items-center justify-center transition-all duration-700 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] ${
        mode === PersonaMode.EXPERT ? 'bg-indigo-700' : 'bg-rose-600'
      }`}>
        <div className={`absolute inset-2 border-2 border-white/20 rounded-[3rem] ${active ? 'animate-spin-slow' : ''}`}></div>
        <svg width="60" height="60" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={active ? 'animate-pulse' : ''}>
          <rect x="10" y="10" width="20" height="20" rx="6" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="2.5" />
          <circle cx="20" cy="20" r="5" fill="white" />
          <path d="M20 4V8M20 32V36M4 20H8M32 20H36" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [mode, setMode] = useState<PersonaMode>(PersonaMode.EXPERT);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  
  // Audio State for Live API
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  
  const liveSessionRef = useRef<any>(null);
  const audioCtxRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isSpeaking, isLoading]);

  const saveNote = (content: ExpertResponse | SupportResponse) => {
    const newNote: SavedNote = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      mode: mode,
      summary: (content as any).differentialInsight || (content as any).message,
      tags: mode === PersonaMode.EXPERT ? ['Clinical', 'Expert'] : ['Recovery', 'Patient'],
      content: content
    };
    setSavedNotes(prev => [newNote, ...prev]);
  };

  const stopAudio = () => {
    if (liveSessionRef.current) {
      liveSessionRef.current.then((s: any) => s?.close());
      liveSessionRef.current = null;
    }
    activeSourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    activeSourcesRef.current.clear();
    if (audioCtxRef.current) {
      audioCtxRef.current.input.close();
      audioCtxRef.current.output.close();
      audioCtxRef.current = null;
    }
    setIsVoiceActive(false);
    setIsSpeaking(false);
    setMicLevel(0);
    nextStartTimeRef.current = 0;
  };

  const startVoiceMode = async () => {
    if (isVoiceActive) { stopAudio(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      await inputCtx.resume(); await outputCtx.resume();
      audioCtxRef.current = { input: inputCtx, output: outputCtx };
      setIsVoiceActive(true);

      const sessionPromise = getLiveConnection(mode, {
        onopen: () => {
          const micSource = inputCtx.createMediaStreamSource(stream);
          const scriptNode = inputCtx.createScriptProcessor(4096, 1, 1);
          scriptNode.onaudioprocess = (e) => {
            const channelData = e.inputBuffer.getChannelData(0);
            let sum = 0; for (let i = 0; i < channelData.length; i++) sum += channelData[i] * channelData[i];
            setMicLevel(Math.sqrt(sum / channelData.length));
            const pcmBuffer = new Int16Array(channelData.length);
            // Scaling PCM data using 32768 as recommended
            for (let i = 0; i < channelData.length; i++) pcmBuffer[i] = channelData[i] * 32768;
            sessionPromise.then((session: any) => {
              if (session) session.sendRealtimeInput({ media: { data: encode(new Uint8Array(pcmBuffer.buffer)), mimeType: 'audio/pcm;rate=16000' } });
            });
          };
          micSource.connect(scriptNode); scriptNode.connect(inputCtx.destination);
        },
        onmessage: async (msg: any) => {
          const b64 = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (b64) {
            setIsSpeaking(true);
            const buf = await decodeAudioData(decode(b64), outputCtx, 24000, 1);
            const src = outputCtx.createBufferSource(); src.buffer = buf; src.connect(outputCtx.destination);
            const now = outputCtx.currentTime;
            if (nextStartTimeRef.current < now) nextStartTimeRef.current = now;
            src.start(nextStartTimeRef.current); nextStartTimeRef.current += buf.duration;
            activeSourcesRef.current.add(src);
            src.onended = () => { activeSourcesRef.current.delete(src); if (activeSourcesRef.current.size === 0) setIsSpeaking(false); };
          }
          if (msg.serverContent?.interrupted) {
            activeSourcesRef.current.forEach(s => s.stop()); activeSourcesRef.current.clear();
            nextStartTimeRef.current = 0; setIsSpeaking(false);
          }
        },
        onclose: () => stopAudio(),
        onerror: () => stopAudio(),
      });
      liveSessionRef.current = sessionPromise;
    } catch (e) { console.error(e); setIsVoiceActive(false); }
  };

  // Handles file selection and base64 encoding for model attachments
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const base64 = result.split(',')[1];
      if (base64) {
        setAttachment({
          data: base64,
          mimeType: file.type,
          name: file.name,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (text?: string) => {
    const msgText = text || input;
    if (!msgText.trim() && !attachment) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: msgText, mode: mode, timestamp: Date.now(), attachment: attachment || undefined };
    setMessages(prev => [...prev, userMsg]); setInput(''); setAttachment(null); setIsLoading(true);
    try {
      const result = await generateTheraSyntResponse(mode, msgText, userMsg.attachment);
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: 'assistant', content: result, mode: mode, timestamp: Date.now() }]);
    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "Vault Sync Error. Retrying connection...", mode: mode, timestamp: Date.now() } as ChatMessage]);
    } finally { setIsLoading(false); }
  };

  return (
    <div className={`min-h-screen flex flex-col transition-all duration-1000 ${
      mode === PersonaMode.EXPERT ? 'bg-slate-50' : 'bg-rose-50'
    } bg-nexus-grid`}>
      
      {/* Zen Mode Background for Voice Interaction */}
      {isVoiceActive && (
        <div className={`fixed inset-0 z-[55] transition-all duration-1000 flex items-center justify-center pointer-events-none backdrop-blur-2xl ${
          mode === PersonaMode.EXPERT ? 'bg-indigo-950/80' : 'bg-rose-950/80'
        }`}>
          <div className="flex flex-col items-center space-y-12">
             <NexusOrb mode={mode} active={true} level={micLevel} />
             <div className="flex space-x-1 items-end h-12">
               {[...Array(24)].map((_, i) => (
                 <div key={i} className={`w-1 rounded-full transition-all duration-75 ${mode === PersonaMode.EXPERT ? 'bg-indigo-400' : 'bg-rose-400'}`}
                   style={{ height: `${20 + (isSpeaking ? Math.random() * 80 : micLevel * 500)}%`, opacity: 0.3 + (micLevel * 5) }} />
               ))}
             </div>
             <p className="text-white text-xl font-black uppercase tracking-[0.5em] animate-pulse">
               {isSpeaking ? 'Nexus Speaking' : 'Listening...'}
             </p>
          </div>
        </div>
      )}

      {/* Sidebar: Saved History */}
      {showHistory && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in">
           <div className="w-full max-w-md bg-white h-full shadow-2xl p-8 flex flex-col animate-slide-in">
              <div className="flex justify-between items-center mb-10">
                 <h2 className="text-2xl font-black uppercase tracking-tighter">Session History</h2>
                 <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                 {savedNotes.length === 0 ? (
                   <p className="text-slate-400 font-bold text-center mt-20">No saved insights in this session.</p>
                 ) : savedNotes.map(n => (
                   <div key={n.id} className={`p-4 rounded-2xl border transition-all hover:shadow-lg ${n.mode === PersonaMode.EXPERT ? 'border-indigo-100 bg-indigo-50/30' : 'border-rose-100 bg-rose-50/30'}`}>
                      <div className="flex justify-between mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{new Date(n.timestamp).toLocaleString()}</span>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${n.mode === PersonaMode.EXPERT ? 'bg-indigo-600 text-white' : 'bg-rose-600 text-white'}`}>{n.mode}</span>
                      </div>
                      <p className="text-sm font-bold text-slate-800 line-clamp-2 leading-tight">{n.summary}</p>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-xl border-b flex items-center justify-between px-6 py-4 md:px-12 transition-all duration-500 ${
        mode === PersonaMode.EXPERT ? 'bg-white/70 border-indigo-100' : 'bg-white/70 border-rose-100'
      }`}>
        <div className="flex items-center space-x-6">
          <button onClick={() => setShowHistory(true)} className="group p-1.5 rounded-xl border border-slate-200 bg-white hover:shadow-lg transition-all active:scale-95">
             <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center">
              THERASYNTH <span className={`ml-2 px-3 py-1 rounded-xl text-[10px] text-white ${mode === PersonaMode.EXPERT ? 'bg-indigo-600' : 'bg-rose-600'}`}>NEXUS</span>
            </h1>
            <p className="text-[9px] uppercase font-black text-slate-400 tracking-[0.3em] mt-1">Mental Health & Addiction Intelligence</p>
          </div>
        </div>

        <div className="flex items-center bg-white/50 rounded-2xl p-1 shadow-xl border border-white">
          <button onClick={() => { setMode(PersonaMode.EXPERT); setMessages([]); stopAudio(); }} className={`px-6 py-2 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all ${mode === PersonaMode.EXPERT ? 'bg-white text-indigo-700 shadow-xl scale-105' : 'text-slate-400 hover:text-indigo-400'}`}>Scholar</button>
          <button onClick={() => { setMode(PersonaMode.SUPPORT); setMessages([]); stopAudio(); }} className={`px-6 py-2 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all ${mode === PersonaMode.SUPPORT ? 'bg-white text-rose-600 shadow-xl scale-105' : 'text-slate-400 hover:text-rose-400'}`}>Privacy</button>
        </div>
      </header>

      {/* Main Stream Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 md:py-12 flex flex-col h-[calc(100vh-180px)] relative">
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-12 pb-48 scroll-smooth pr-4 custom-scrollbar">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-12 py-10">
              <NexusOrb mode={mode} active={false} level={0} />
              <div className="space-y-6 max-w-2xl">
                <h2 className={`text-6xl font-black tracking-tighter ${mode === PersonaMode.EXPERT ? 'text-slate-900' : 'text-rose-950'}`}>
                  {mode === PersonaMode.EXPERT ? 'Scholar Dashboard' : 'Recovery Space'}
                </h2>
                <p className="text-slate-500 text-xl font-medium max-w-lg mx-auto leading-relaxed">
                  {mode === PersonaMode.EXPERT 
                    ? "Deep clinical mapping for addiction and psychiatric markers. Scanned reports analyzed via advanced NLP." 
                    : "Empathic recovery companion. detect crisis points and secure priority clinical escalations."}
                </p>
                <div className="flex flex-wrap justify-center gap-4 pt-10">
                  {(mode === PersonaMode.EXPERT 
                    ? ["Scan Opioid Toxicity Report", "Tone Analysis of Session", "Co-occurring Disorder Mapping", "Cite latest ADHD Research"] 
                    : ["I am having a relapse", "CBT breathing help", "Book Clinical Consultation", "Listen to me speak"]
                  ).map((s, i) => (
                    <button key={i} onClick={() => handleSendMessage(s)} className={`px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest border transition-all hover:shadow-2xl bg-white ${mode === PersonaMode.EXPERT ? 'border-indigo-100 text-indigo-700' : 'border-rose-100 text-rose-600'}`}>{s}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}>
              <div className={`max-w-[85%] md:max-w-[80%] rounded-[3rem] p-8 ${
                msg.role === 'user' 
                  ? `${mode === PersonaMode.EXPERT ? 'bg-indigo-700' : 'bg-rose-600'} text-white shadow-2xl rounded-tr-none` 
                  : 'bg-white border border-slate-100 text-slate-800 shadow-2xl rounded-tl-none ring-1 ring-slate-100/50'
              }`}>
                {msg.role === 'user' ? (
                  <div className="space-y-4">
                    {msg.attachment && <div className="p-3 bg-white/20 rounded-2xl flex items-center space-x-3"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg><span className="text-xs font-bold truncate">{msg.attachment.name}</span></div>}
                    <p className="font-bold leading-relaxed text-2xl tracking-tight">{msg.content as string}</p>
                  </div>
                ) : (
                  <div className="animate-fade-in">
                    {msg.mode === PersonaMode.EXPERT ? (
                      <ExpertView data={msg.content as ExpertResponse} onSaveNote={saveNote} />
                    ) : (
                      <SupportView data={msg.content as SupportResponse} onBookAppointment={() => handleSendMessage("I need to book a clinical consultation.")} />
                    )}
                  </div>
                )}
              </div>
              <span className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-6">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Nexus Verified</span>
            </div>
          ))}
          {isLoading && <div className="flex items-center space-x-6 animate-pulse px-6"><div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center shadow-lg ${mode === PersonaMode.EXPERT ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600'}`}><svg className="w-10 h-10 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></div><div className="bg-white/70 rounded-[2.5rem] p-8 shadow-xl flex-1 max-w-[400px]"><div className="h-4 bg-slate-200 rounded-full w-3/4 mb-3"></div><div className="h-3 bg-slate-100 rounded-full w-1/2"></div></div></div>}
        </div>
      </main>

      {/* Control Dock */}
      <footer className="fixed bottom-0 left-0 right-0 p-8 md:p-12 bg-transparent pointer-events-none z-[60]">
        <div className="max-w-5xl mx-auto flex items-end space-x-6 pointer-events-auto">
          <button onClick={startVoiceMode} className={`group relative p-8 rounded-[3rem] shadow-2xl transition-all duration-700 transform hover:scale-110 active:scale-90 ${isVoiceActive ? 'bg-red-600 text-white animate-pulse' : mode === PersonaMode.EXPERT ? 'bg-indigo-700 text-white' : 'bg-rose-600 text-white'}`}>
            <div className={`absolute inset-0 rounded-[3rem] opacity-0 group-hover:opacity-100 blur-2xl transition-all duration-700 ${isVoiceActive ? 'bg-red-500' : mode === PersonaMode.EXPERT ? 'bg-indigo-500' : 'bg-rose-500'}`}></div>
            <div className="relative">{isVoiceActive ? <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg> : <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>}</div>
          </button>
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex-1 flex items-center bg-white/95 backdrop-blur-3xl rounded-[3.5rem] p-4 shadow-2xl border border-white ring-1 ring-slate-200/50">
            <div className="flex items-center px-4"><input type="file" id="file-input" onChange={handleFile} className="hidden" /><button type="button" onClick={() => document.getElementById('file-input')?.click()} className={`p-5 rounded-[2rem] transition-all ${attachment ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:bg-slate-50'}`}>{attachment ? <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg> : <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>}</button></div>
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={mode === PersonaMode.EXPERT ? "Scholar Search..." : "Tell me how you're feeling..."} className="flex-1 bg-transparent px-6 py-6 text-slate-950 placeholder-slate-400 focus:outline-none text-2xl font-black tracking-tight" />
            <button type="submit" disabled={(!input.trim() && !attachment) || isLoading} className={`p-6 rounded-[2.5rem] transition-all duration-500 ${(!input.trim() && !attachment) || isLoading ? 'bg-slate-100 text-slate-300' : mode === PersonaMode.EXPERT ? 'bg-indigo-700 text-white shadow-2xl hover:scale-105 active:scale-95' : 'bg-rose-600 text-white shadow-2xl hover:scale-105 active:scale-95'}`}><svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 12h14M12 5l7 7-7 7" /></svg></button>
          </form>
        </div>
      </footer>
      
      <style>{`
        @keyframes slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-in { animation: slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
};

export default App;
