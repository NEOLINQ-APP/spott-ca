import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Crown, Mic, Square, Volume2, VolumeX, Loader2, Radio, Settings2, Pencil, Paperclip, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Voice = {
  id: string;
  label: string;
  gender: "male" | "female";
  tone: string;
  gradient: string; // CSS gradient — serves as the "voice avatar"
  accent: string;
};

const VOICES: Voice[] = [
  { id: "onyx",    label: "Onyx",    gender: "male",   tone: "Deep, authoritative", accent: "American English", gradient: "from-slate-700 to-slate-900" },
  { id: "echo",    label: "Echo",    gender: "male",   tone: "Calm, measured",       accent: "American English", gradient: "from-sky-600 to-indigo-700" },
  { id: "alloy",   label: "Alloy",   gender: "male",   tone: "Neutral, friendly",    accent: "American English", gradient: "from-zinc-500 to-zinc-800" },
  { id: "ash",     label: "Ash",     gender: "male",   tone: "Warm, conversational", accent: "American English", gradient: "from-amber-600 to-orange-800" },
  { id: "ballad",  label: "Ballad",  gender: "male",   tone: "Smooth, storyteller",  accent: "British English",  gradient: "from-emerald-600 to-teal-800" },
  { id: "nova",    label: "Nova",    gender: "female", tone: "Bright, energetic",    accent: "American English", gradient: "from-rose-500 to-pink-600" },
  { id: "shimmer", label: "Shimmer", gender: "female", tone: "Soft, soothing",       accent: "American English", gradient: "from-fuchsia-500 to-purple-600" },
  { id: "coral",   label: "Coral",   gender: "female", tone: "Confident, upbeat",    accent: "American English", gradient: "from-orange-400 to-red-500" },
  { id: "sage",    label: "Sage",    gender: "female", tone: "Calm, thoughtful",     accent: "American English", gradient: "from-teal-400 to-emerald-600" },
  { id: "fable",   label: "Fable",   gender: "female", tone: "Expressive, warm",     accent: "British English",  gradient: "from-violet-500 to-indigo-700" },
];

export function ZeusChat() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(() => {
      if (!active) return;
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(() => setReady(true));
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  // Customizable name
  const [name, setName] = useState<string>(() =>
    (typeof window !== "undefined" && localStorage.getItem("zeus.name")) || "Zeus"
  );
  const nameRef = useRef(name);
  const [editingName, setEditingName] = useState(false);
  useEffect(() => { nameRef.current = name; }, [name]);
  useEffect(() => { try { localStorage.setItem("zeus.name", name); } catch { /* noop */ } }, [name]);

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: "/api/zeus/chat",
      headers: async (): Promise<Record<string, string>> => {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
      }
    }),
    []
  );

  const { messages, sendMessage: sendChatMessage, status, error } = useChat({
    transport,
  });

  const [input, setInput] = useState("");

  // Alias to match existing function consumers smoothly
  const sendMessage = useCallback(
    async (payload: { text: string; files?: any[] }) => {
      await sendChatMessage({ text: payload.text });
    },
    [sendChatMessage]
  );


  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((list: FileList | File[] | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    const MAX = 15 * 1024 * 1024;
    const ok: File[] = [];
    for (const f of incoming) {
      if (f.size > MAX) { toast.error(`${f.name} is over 15MB`); continue; }
      ok.push(f);
    }
    if (ok.length) setAttachments((prev) => [...prev, ...ok].slice(0, 6));
  }, []);

  const removeAttachment = (i: number) => setAttachments((p) => p.filter((_, idx) => idx !== i));
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, status]);
  useEffect(() => { inputRef.current?.focus(); }, [status]);
  const isBusy = status === "submitted" || status === "streaming";

  // ---------- Voice ----------
  const [voiceOn, setVoiceOn] = useState(true);
  const [voiceId, setVoiceId] = useState<string>(() => (typeof window !== "undefined" && localStorage.getItem("zeus.voice")) || "onyx");
  const [speed, setSpeed] = useState<number>(() => {
    if (typeof window === "undefined") return 1.0;
    const v = parseFloat(localStorage.getItem("zeus.speed") ?? "1");
    return Number.isFinite(v) ? v : 1.0;
  });
  useEffect(() => { try { localStorage.setItem("zeus.voice", voiceId); } catch { /* noop */ } }, [voiceId]);
  useEffect(() => { try { localStorage.setItem("zeus.speed", String(speed)); } catch { /* noop */ } }, [speed]);

  const [liveMode, setLiveMode] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<string[]>([]);
  const playingRef = useRef(false);
  const spokenOffsetRef = useRef<Map<string, number>>(new Map());
  const finishedMsgRef = useRef<Set<string>>(new Set());
  const voiceIdRef = useRef(voiceId);
  const speedRef = useRef(speed);
  useEffect(() => { voiceIdRef.current = voiceId; }, [voiceId]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  const stopAudio = useCallback(() => {
    queueRef.current = [];
    playingRef.current = false;
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch { /* noop */ }
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setSpeaking(false);
  }, []);

  const playNext = useCallback(async () => {
    if (playingRef.current) return;
    const next = queueRef.current.shift();
    if (!next) { setSpeaking(false); return; }
    playingRef.current = true;
    setSpeaking(true);
    try {
      const res = await fetch("/api/sparq/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: next, voice: voiceIdRef.current, speed: speedRef.current }),
      });
      if (!res.ok) { playingRef.current = false; playNext(); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      await new Promise<void>((resolve) => {
        audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
        audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
        audio.play().catch(() => resolve());
      });
    } catch { /* noop */ }
    finally {
      playingRef.current = false;
      if (queueRef.current.length > 0) playNext(); else setSpeaking(false);
    }
  }, []);

  const enqueue = useCallback((text: string) => {
    const t = text.trim();
    if (!t) return;
    queueRef.current.push(t);
    if (!playingRef.current) playNext();
  }, [playNext]);

  const splitSentences = (buf: string) => {
    const chunks: string[] = [];
    const re = /[^.!?\n]+[.!?\n]+/g;
    let m: RegExpExecArray | null;
    let lastIdx = 0;
    while ((m = re.exec(buf)) !== null) { chunks.push(m[0].trim()); lastIdx = re.lastIndex; }
    return { chunks, rest: buf.slice(lastIdx) };
  };

  useEffect(() => {
    if (!voiceOn) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    const fullText = last.parts?.map((p) => (p.type === "text" ? p.text : "")).join("") || "";
    if (!fullText) return;
    // Strip code blocks from spoken output
    const spoken = fullText.replace(/```[\s\S]*?```/g, " (code block omitted) ");
    const offset = spokenOffsetRef.current.get(last.id) ?? 0;
    const pending = spoken.slice(offset);
    const { chunks, rest } = splitSentences(pending);
    if (chunks.length > 0) {
      chunks.forEach((c) => enqueue(c));
      spokenOffsetRef.current.set(last.id, offset + (pending.length - rest.length));
    }
    if (!isBusy && !finishedMsgRef.current.has(last.id)) {
      const finalOffset = spokenOffsetRef.current.get(last.id) ?? 0;
      const tail = spoken.slice(finalOffset).trim();
      if (tail) { enqueue(tail); spokenOffsetRef.current.set(last.id, spoken.length); }
      finishedMsgRef.current.add(last.id);
    }
  }, [messages, isBusy, voiceOn, enqueue]);

  useEffect(() => () => stopAudio(), [stopAudio]);

  // ---------- Mic / STT / live mode (same approach as SparqChat) ----------
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const liveModeRef = useRef(false);
  useEffect(() => { liveModeRef.current = liveMode; }, [liveMode]);
  const vadCtxRef = useRef<AudioContext | null>(null);
  const vadRafRef = useRef<number | null>(null);

  const stopMicTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };
  const teardownVad = () => {
    if (vadRafRef.current) cancelAnimationFrame(vadRafRef.current);
    vadRafRef.current = null;
    if (vadCtxRef.current) { try { vadCtxRef.current.close(); } catch { /* noop */ } vadCtxRef.current = null; }
  };
  const stopRecording = useCallback(() => {
    if (!recorderRef.current) return;
    setRecording(false);
    teardownVad();
    try { recorderRef.current.stop(); } catch { stopMicTracks(); }
    recorderRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    if (recording || transcribing || !ready) return;
    stopAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data?.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stopMicTracks();
        teardownVad();
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        if (blob.size < 1200) return;
        setTranscribing(true);
        try {
          const ext = type.includes("mp4") ? "mp4" : type.includes("webm") ? "webm" : "wav";
          const fd = new FormData();
          fd.append("file", new File([blob], `recording.${ext}`, { type }));
          const res = await fetch("/api/sparq/transcribe", { method: "POST", body: fd });
          if (res.ok) {
            const data = await res.json();
            const text = (data.text ?? "").trim();
            if (text) { setInput(""); await sendMessage({ text }); }
          }
        } finally { setTranscribing(false); }
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);

      if (liveModeRef.current) {
        try {
          const AC: typeof AudioContext = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const ctx = new AC();
          vadCtxRef.current = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 1024;
          source.connect(analyser);
          const data = new Uint8Array(analyser.fftSize);
          const startedAt = performance.now();
          let lastVoiceAt = 0;
          let hasSpoken = false;
          const tick = () => {
            analyser.getByteTimeDomainData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
            const rms = Math.sqrt(sum / data.length);
            const now = performance.now();
            if (rms > 0.018) { hasSpoken = true; lastVoiceAt = now; }
            const elapsed = now - startedAt;
            const quietFor = hasSpoken ? now - lastVoiceAt : 0;
            if ((hasSpoken && quietFor > 1400) || elapsed > 30000) { stopRecording(); return; }
            vadRafRef.current = requestAnimationFrame(tick);
          };
          vadRafRef.current = requestAnimationFrame(tick);
        } catch { /* noop */ }
      }
    } catch {
      stopMicTracks();
      setRecording(false);
      toast.error("Microphone access denied");
    }
  }, [ready, recording, transcribing, sendMessage, stopAudio, stopRecording]);

  useEffect(() => {
    if (!liveMode || !voiceOn) return;
    if (isBusy || speaking || recording || transcribing) return;
    const t = setTimeout(() => startRecording(), 350);
    return () => clearTimeout(t);
  }, [liveMode, voiceOn, isBusy, speaking, recording, transcribing, startRecording]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if ((!text && attachments.length === 0) || isBusy || !ready) return;
    const fileParts = await Promise.all(
      attachments.map(
        (f) =>
          new Promise<{ type: "file"; mediaType: string; filename: string; url: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({ type: "file", mediaType: f.type || "application/octet-stream", filename: f.name, url: reader.result as string });
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(f);
          }),
      ),
    );
    setInput("");
    setAttachments([]);
    await sendMessage({ text: text || "(see attachment)", files: fileParts.length ? fileParts : undefined });
  };

  const activeVoice = VOICES.find((v) => v.id === voiceId) ?? VOICES[0];

  return (
    <div className="flex flex-col bg-background border border-border rounded-2xl shadow-xl h-[calc(100vh-9rem)] md:h-[calc(100vh-10rem)]">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-t-2xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn("h-10 w-10 rounded-full grid place-items-center text-white shadow-md bg-gradient-to-br", activeVoice.gradient)}>
            <Crown className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            {editingName ? (
              <form onSubmit={(e) => { e.preventDefault(); setEditingName(false); }} className="flex items-center gap-1">
                <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus onBlur={() => setEditingName(false)} className="h-7 w-36 text-sm" />
              </form>
            ) : (
              <button onClick={() => setEditingName(true)} className="group flex items-center gap-1 text-left">
                <span className="font-semibold text-base truncate">{name}</span>
                <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
              </button>
            )}
            <div className="text-[11px] text-muted-foreground truncate">
              {liveMode ? (recording ? "Listening…" : speaking ? "Speaking…" : "Live mode on") : `God Mode · ${activeVoice.label}`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" variant={liveMode ? "default" : "ghost"} size="icon"
            onClick={() => { const next = !liveMode; setLiveMode(next); if (next) setVoiceOn(true); if (!next && recording) stopRecording(); }}
            title={liveMode ? "Stop live conversation" : "Live conversation (hands-free)"}>
            <Radio className={cn("h-4 w-4", liveMode && "animate-pulse")} />
          </Button>
          <Button type="button" variant="ghost" size="icon"
            onClick={() => { if (voiceOn) stopAudio(); setVoiceOn((v) => !v); if (liveMode) setLiveMode(false); }}
            title={voiceOn ? "Mute voice" : "Hear replies"}>
            {voiceOn ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="icon" title="Voice & name"><Settings2 className="h-4 w-4" /></Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Assistant name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Voice</label>
                {(["male", "female"] as const).map((g) => (
                  <div key={g} className="space-y-1.5">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 pt-1">{g === "male" ? "Male voices" : "Female voices"}</div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {VOICES.filter((v) => v.gender === g).map((v) => {
                        const active = v.id === voiceId;
                        return (
                          <button key={v.id} type="button" onClick={() => { stopAudio(); setVoiceId(v.id); }}
                            className={cn("flex items-center gap-3 rounded-lg border p-2 text-left transition", active ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:bg-accent")}>
                            <div className={cn("h-9 w-9 rounded-full bg-gradient-to-br grid place-items-center text-white text-xs font-semibold shadow-sm shrink-0", v.gradient)}>
                              {v.label.slice(0, 1)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium">{v.label}</div>
                              <div className="text-[11px] text-muted-foreground truncate">{v.tone} · {v.accent}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Speed</label>
                  <span className="text-xs tabular-nums">{speed.toFixed(2)}×</span>
                </div>
                <Slider min={0.7} max={1.5} step={0.05} value={[speed]} onValueChange={(v) => setSpeed(v[0] ?? 1)} />
              </div>
              <p className="text-[10px] text-muted-foreground">Tap the 📻 radio icon for hands-free live talk.</p>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-10 px-4">
            <div className={cn("h-16 w-16 mx-auto rounded-full grid place-items-center text-white bg-gradient-to-br shadow-lg", activeVoice.gradient)}>
              <Crown className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-xl font-semibold">{name} is unlocked.</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Ask anything. Code, design feedback, video scripts, reel hooks, ad copy, strategy, or life. Tap the radio for live talk.
            </p>
          </div>
        )}
        {messages.map((m) => {
          const text = m.parts?.map((p) => (p.type === "text" ? p.text : "")).join("") || m.content;
          const fileParts = m.parts?.filter((p): p is { type: "file"; mediaType: string; url: string; filename?: string } => p.type === "file") || [];
          return (
            <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[88%] rounded-2xl px-3 py-2 text-sm space-y-2",
                m.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm")}>
                {fileParts.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {fileParts.map((fp, i) =>
                      fp.mediaType?.startsWith("image/") ? (
                        <a key={i} href={fp.url} target="_blank" rel="noreferrer" className="block">
                          <img src={fp.url} alt={fp.filename ?? "attachment"} className="max-h-48 rounded-lg border border-border/40" />
                        </a>
                      ) : (
                        <a key={i} href={fp.url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-md bg-background/40 px-2 py-1 text-xs underline">
                          <FileText className="h-3.5 w-3.5" />
                          {fp.filename ?? "file"}
                        </a>
                      ),
                    )}
                  </div>
                )}
                {text && (m.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_pre]:my-2">
                    <ReactMarkdown>{text}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{text}</div>
                ))}
              </div>
            </div>
          );
        })}
        {isBusy && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-muted-foreground">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        )}
        {error && <div className="text-xs text-destructive text-center">{error.message ?? "Something went wrong."}</div>}
      </div>

      {/* composer */}
      <form
        onSubmit={handleSubmit}
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
        className="border-t p-3 space-y-2"
      >
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((f, i) => {
              const isImg = f.type.startsWith("image/");
              const url = isImg ? URL.createObjectURL(f) : null;
              return (
                <div key={i} className="relative group rounded-md border border-border bg-muted/40 p-1 pr-6">
                  {isImg && url ? (
                    <img src={url} alt={f.name} className="h-14 w-14 object-cover rounded" onLoad={() => URL.revokeObjectURL(url)} />
                  ) : (
                    <div className="flex items-center gap-1.5 px-1.5 py-2 text-xs">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="max-w-[140px] truncate">{f.name}</span>
                    </div>
                  )}
                  <button type="button" onClick={() => removeAttachment(i)}
                    className="absolute -top-1.5 -right-1.5 bg-background border border-border rounded-full p-0.5 shadow-sm"
                    title="Remove">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,text/*,.md,.csv,.json"
            className="hidden"
            onChange={(e) => { addFiles(e.target.files); if (fileInputRef.current) fileInputRef.current.value = ""; }}
          />
          <Button type="button" size="icon" variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={!ready || isBusy} title="Attach images, screenshots, or files">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant={recording ? "destructive" : "outline"}
            onClick={recording ? stopRecording : startRecording}
            disabled={!ready || isBusy || transcribing}
            title={recording ? "Stop" : "Speak"}>
            {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Input ref={inputRef} value={input}
            onChange={(e) => setInput(e.target.value)}
            onPaste={(e) => {
              const files = Array.from(e.clipboardData.files ?? []);
              if (files.length) { e.preventDefault(); addFiles(files); }
            }}
            placeholder={recording ? "Listening…" : transcribing ? "Transcribing…" : `Message ${name}… (paste or drop files)`}
            disabled={!ready || isBusy || recording || transcribing} autoFocus />
          <Button type="submit" size="icon" disabled={!ready || isBusy || (!input.trim() && attachments.length === 0)}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>

      <div className="px-3 pb-2 text-[10px] text-muted-foreground text-center">
        God Mode · admin-only · everything stays between us
      </div>
    </div>
  );
}
