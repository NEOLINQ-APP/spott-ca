import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Sparkles, X, Bot, Mic, Square, Volume2, VolumeX, Loader2, Radio, Settings2, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { getVoiceTrial, recordVoiceSeconds, type VoiceTrialStatus } from "@/lib/voice-trial.functions";
import { cn } from "@/lib/utils";


const VOICE_OPTIONS = [
  { id: "nova", label: "Nova (Female)", gender: "female" },
  { id: "shimmer", label: "Shimmer (Female)", gender: "female" },
  { id: "coral", label: "Coral (Female)", gender: "female" },
  { id: "sage", label: "Sage (Female)", gender: "female" },
  { id: "alloy", label: "Alloy (Male)", gender: "male" },
  { id: "echo", label: "Echo (Male)", gender: "male" },
  { id: "onyx", label: "Onyx (Male)", gender: "male" },
  { id: "ash", label: "Ash (Male)", gender: "male" },
  { id: "ballad", label: "Ballad (Male)", gender: "male" },
];

interface SparqChatProps {
  variant?: "floating" | "page";
  onClose?: () => void;
  greeting?: string;
}

export function SparqChat({ variant = "page", onClose, greeting }: SparqChatProps) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setToken(data.session?.access_token ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setToken(s?.access_token ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/sparq/chat",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }),
    [token],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: "sparq-main",
    transport,
  });

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [status]);

  const isBusy = status === "submitted" || status === "streaming";

  // ---------- Voice trial (7 days OR 20 minutes) ----------
  const fetchTrial = useServerFn(getVoiceTrial);
  const recordSeconds = useServerFn(recordVoiceSeconds);
  const [trial, setTrial] = useState<VoiceTrialStatus | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const refreshTrial = useCallback(async () => {
    if (!token) return;
    try { setTrial(await fetchTrial()); } catch { /* noop */ }
  }, [token, fetchTrial]);
  useEffect(() => { void refreshTrial(); }, [refreshTrial]);
  const voiceAllowed = trial?.allowed ?? true; // optimistic until loaded
  const requireVoice = useCallback(() => {
    if (trial && !trial.allowed) { setPaywallOpen(true); return false; }
    return true;
  }, [trial]);
  // Track active voice seconds (mic + TTS playback) and flush periodically
  const voiceStartRef = useRef<number | null>(null);
  const pendingSecondsRef = useRef(0);
  const beginVoiceTimer = useCallback(() => {
    if (voiceStartRef.current == null) voiceStartRef.current = performance.now();
  }, []);
  const endVoiceTimer = useCallback(() => {
    if (voiceStartRef.current == null) return;
    const secs = (performance.now() - voiceStartRef.current) / 1000;
    voiceStartRef.current = null;
    pendingSecondsRef.current += secs;
    if (pendingSecondsRef.current >= 3) {
      const s = pendingSecondsRef.current;
      pendingSecondsRef.current = 0;
      recordSeconds({ data: { seconds: s } }).then(() => refreshTrial()).catch(() => { /* noop */ });
    }
  }, [recordSeconds, refreshTrial]);

  // ---------- Voice playback (streaming TTS, sentence-by-sentence) ----------
  const [voiceOn, setVoiceOn] = useState(true);

  const [voiceId, setVoiceId] = useState<string>(() => {
    if (typeof window === "undefined") return "nova";
    return localStorage.getItem("sparq.voice") ?? "nova";
  });
  const [speakSpeed, setSpeakSpeed] = useState<number>(() => {
    if (typeof window === "undefined") return 1.0;
    const v = parseFloat(localStorage.getItem("sparq.speed") ?? "1");
    return Number.isFinite(v) ? v : 1.0;
  });
  useEffect(() => { try { localStorage.setItem("sparq.voice", voiceId); } catch { /* noop */ } }, [voiceId]);
  useEffect(() => { try { localStorage.setItem("sparq.speed", String(speakSpeed)); } catch { /* noop */ } }, [speakSpeed]);

  // One-time toast nudge about Live mode
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("sparq.liveHintShown") === "1") return;
    const t = setTimeout(() => {
      toast("Tap the 📻 radio icon for a live, hands-free conversation with Sparq", {
        duration: 7000,
      });
      try { localStorage.setItem("sparq.liveHintShown", "1"); } catch { /* noop */ }
    }, 800);
    return () => clearTimeout(t);
  }, []);

  const [liveMode, setLiveMode] = useState(false); // hands-free conversation
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsQueueRef = useRef<string[]>([]);
  const ttsPlayingRef = useRef(false);
  // For each assistant message id, how many chars we've already queued for TTS
  const spokenOffsetRef = useRef<Map<string, number>>(new Map());
  const finishedSpeakingMsgRef = useRef<Set<string>>(new Set());
  const voiceIdRef = useRef(voiceId);
  const speakSpeedRef = useRef(speakSpeed);
  useEffect(() => { voiceIdRef.current = voiceId; }, [voiceId]);
  useEffect(() => { speakSpeedRef.current = speakSpeed; }, [speakSpeed]);

  const stopAudio = useCallback(() => {
    ttsQueueRef.current = [];
    ttsPlayingRef.current = false;
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch { /* noop */ }
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setSpeaking(false);
  }, []);

  const playNextChunk = useCallback(async () => {
    if (ttsPlayingRef.current) return;
    const next = ttsQueueRef.current.shift();
    if (!next) {
      setSpeaking(false);
      endVoiceTimer();
      return;
    }
    // Gate TTS behind the trial / card
    if (trial && !trial.allowed) {
      ttsQueueRef.current = [];
      setSpeaking(false);
      setPaywallOpen(true);
      return;
    }
    ttsPlayingRef.current = true;
    setSpeaking(true);
    beginVoiceTimer();
    try {
      const res = await fetch("/api/sparq/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: next, voice: voiceIdRef.current, speed: speakSpeedRef.current }),
      });
      if (!res.ok) {
        ttsPlayingRef.current = false;
        playNextChunk();
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.playbackRate = 1.0;
      audioRef.current = audio;
      await new Promise<void>((resolve) => {
        audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
        audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
        audio.play().catch(() => resolve());
      });
    } catch {
      /* ignore */
    } finally {
      ttsPlayingRef.current = false;
      if (ttsQueueRef.current.length > 0) {
        playNextChunk();
      } else {
        setSpeaking(false);
        endVoiceTimer();
      }
    }
  }, [trial, beginVoiceTimer, endVoiceTimer]);


  const enqueueSpeech = useCallback((text: string) => {
    const t = text.trim();
    if (!t) return;
    ttsQueueRef.current.push(t);
    if (!ttsPlayingRef.current) playNextChunk();
  }, [playNextChunk]);

  // Split a streaming buffer into [completedSentences, remainder]
  const splitSentences = (buf: string): { chunks: string[]; rest: string } => {
    const chunks: string[] = [];
    let rest = buf;
    // Match through end punctuation followed by space/newline/end
    const re = /[^.!?\n]+[.!?\n]+/g;
    let m: RegExpExecArray | null;
    let lastIdx = 0;
    while ((m = re.exec(buf)) !== null) {
      chunks.push(m[0].trim());
      lastIdx = re.lastIndex;
    }
    rest = buf.slice(lastIdx);
    return { chunks, rest };
  };

  // Watch the LAST assistant message and speak each new sentence as it streams
  useEffect(() => {
    if (!voiceOn) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    const fullText = last.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
    if (!fullText) return;
    const offset = spokenOffsetRef.current.get(last.id) ?? 0;
    const pending = fullText.slice(offset);
    const { chunks, rest } = splitSentences(pending);
    if (chunks.length > 0) {
      chunks.forEach((c) => enqueueSpeech(c));
      spokenOffsetRef.current.set(last.id, offset + (pending.length - rest.length));
    }
    // When streaming has finished for this message, flush any tail remainder
    if (!isBusy && !finishedSpeakingMsgRef.current.has(last.id)) {
      const finalOffset = spokenOffsetRef.current.get(last.id) ?? 0;
      const tail = fullText.slice(finalOffset).trim();
      if (tail) {
        enqueueSpeech(tail);
        spokenOffsetRef.current.set(last.id, fullText.length);
      }
      finishedSpeakingMsgRef.current.add(last.id);
    }
  }, [messages, isBusy, voiceOn, enqueueSpeech]);

  useEffect(() => () => stopAudio(), [stopAudio]);

  // ---------- Microphone (STT) ----------
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const liveModeRef = useRef(false);
  useEffect(() => { liveModeRef.current = liveMode; }, [liveMode]);

  // VAD (voice-activity detection) refs for live mode auto-stop
  const vadCtxRef = useRef<AudioContext | null>(null);
  const vadRafRef = useRef<number | null>(null);
  const vadStopRef = useRef<(() => void) | null>(null);

  const stopMicTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const teardownVad = () => {
    if (vadRafRef.current) cancelAnimationFrame(vadRafRef.current);
    vadRafRef.current = null;
    if (vadCtxRef.current) {
      try { vadCtxRef.current.close(); } catch { /* noop */ }
      vadCtxRef.current = null;
    }
    vadStopRef.current = null;
  };

  const stopRecording = useCallback(() => {
    if (!recorderRef.current) return;
    setRecording(false);
    teardownVad();
    endVoiceTimer();
    try {
      recorderRef.current.stop();
    } catch {
      stopMicTracks();
    }
    recorderRef.current = null;
  }, [endVoiceTimer]);


  const startRecording = useCallback(async () => {
    if (recording || transcribing || !ready) return;
    if (!requireVoice()) return;
    // Barge-in: cut Sparq off if user starts talking
    stopAudio();
    beginVoiceTimer();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime =
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4"
        : "";
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stopMicTracks();
        teardownVad();
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        if (blob.size < 1200) return; // too short
        setTranscribing(true);
        try {
          const ext = type.includes("mp4") ? "mp4" : type.includes("webm") ? "webm" : "wav";
          const fd = new FormData();
          fd.append("file", new File([blob], `recording.${ext}`, { type }));
          const res = await fetch("/api/sparq/transcribe", { method: "POST", body: fd });
          if (res.ok) {
            const data = await res.json();
            const text = (data.text ?? "").trim();
            if (text) {
              setInput("");
              await sendMessage({ text });
            }
          }
        } finally {
          setTranscribing(false);
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);

      // In live mode, auto-stop on silence (~1.4s after detected speech)
      if (liveModeRef.current) {
        try {
          const AC: typeof AudioContext =
            window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
          const SILENCE_MS = 1400;
          const VOICE_THRESHOLD = 0.018; // RMS
          const MAX_MS = 30000; // hard cap
          let cancelled = false;
          vadStopRef.current = () => { cancelled = true; };

          const tick = () => {
            if (cancelled) return;
            analyser.getByteTimeDomainData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) {
              const v = (data[i] - 128) / 128;
              sum += v * v;
            }
            const rms = Math.sqrt(sum / data.length);
            const now = performance.now();
            if (rms > VOICE_THRESHOLD) {
              hasSpoken = true;
              lastVoiceAt = now;
            }
            const elapsed = now - startedAt;
            const quietFor = hasSpoken ? now - lastVoiceAt : 0;
            if ((hasSpoken && quietFor > SILENCE_MS) || elapsed > MAX_MS) {
              stopRecording();
              return;
            }
            vadRafRef.current = requestAnimationFrame(tick);
          };
          vadRafRef.current = requestAnimationFrame(tick);
        } catch {
          /* VAD optional — manual stop still works */
        }
      }
    } catch {
      stopMicTracks();
      setRecording(false);
    }
  }, [ready, recording, transcribing, sendMessage, stopAudio, stopRecording]);

  // Hands-free live mode: when Sparq finishes speaking, re-open the mic
  useEffect(() => {
    if (!liveMode || !voiceOn) return;
    if (isBusy || speaking || recording || transcribing) return;
    const t = setTimeout(() => {
      startRecording();
    }, 350);
    return () => clearTimeout(t);

  }, [liveMode, voiceOn, isBusy, speaking, recording, transcribing, startRecording]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isBusy || !ready) return;
    setInput("");
    await sendMessage({ text });
  };

  return (
    <div
      className={cn(
        "flex flex-col bg-background border border-border",
        variant === "floating"
          ? "fixed bottom-20 right-4 md:bottom-6 md:right-6 w-[calc(100vw-2rem)] md:w-[400px] h-[560px] max-h-[80vh] rounded-2xl shadow-2xl z-50"
          : "h-[calc(100vh-12rem)] rounded-xl",
      )}
    >
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/10 to-primary/5 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-sm">Sparq</div>
            <div className="text-[10px] text-muted-foreground">
              {liveMode ? (recording ? "Listening… just talk" : speaking ? "Speaking…" : "Live conversation on") : "Tap the radio icon for live talk"}
            </div>
          </div>

        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={liveMode ? "default" : "ghost"}
            size="icon"
            onClick={() => {
              const next = !liveMode;
              if (next && !requireVoice()) return;
              setLiveMode(next);
              if (next) setVoiceOn(true); // live needs voice on
              if (!next && recording) stopRecording();
            }}

            title={liveMode ? "Turn off live conversation" : "Live conversation (hands-free)"}
            aria-label="Toggle live conversation"
          >
            <Radio className={cn("h-4 w-4", liveMode && "animate-pulse")} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              if (voiceOn) { stopAudio(); setVoiceOn(false); if (liveMode) setLiveMode(false); return; }
              if (!requireVoice()) return;
              setVoiceOn(true);
            }}

            title={voiceOn ? "Mute voice replies" : "Hear Sparq's replies"}
            aria-label={voiceOn ? "Mute voice replies" : "Enable voice replies"}
          >
            {voiceOn ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="icon" title="Voice settings" aria-label="Voice settings">
                <Settings2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Sparq's voice</label>
                <Select value={voiceId} onValueChange={(v) => { stopAudio(); setVoiceId(v); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">Female</div>
                    {VOICE_OPTIONS.filter((v) => v.gender === "female").map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
                    ))}
                    <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">Male</div>
                    {VOICE_OPTIONS.filter((v) => v.gender === "male").map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Speaking speed</label>
                  <span className="text-xs tabular-nums">{speakSpeed.toFixed(2)}×</span>
                </div>
                <Slider
                  min={0.7}
                  max={1.5}
                  step={0.05}
                  value={[speakSpeed]}
                  onValueChange={(vals) => setSpeakSpeed(vals[0] ?? 1)}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Slower</span><span>Normal</span><span>Faster</span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Tip: tap the 📻 radio icon for hands-free live conversation.
              </p>
            </PopoverContent>
          </Popover>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <Bot className="h-10 w-10 mx-auto text-primary mb-2" />
            <p className="text-sm text-muted-foreground">
              {greeting ?? "Hi! I'm Sparq. Ask me anything about Spott.ca — or let me help you post an ad, write a description, or find a business."}
            </p>
          </div>
        )}
        {messages.map((m) => {
          const text = m.parts
            .map((p) => (p.type === "text" ? p.text : ""))
            .join("");
          return (
            <div
              key={m.id}
              className={cn(
                "flex",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted rounded-bl-sm",
                )}
              >
                {m.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1">
                    <ReactMarkdown>{text}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{text}</div>
                )}
              </div>
            </div>
          );
        })}
        {isBusy && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-muted-foreground">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        )}
        {error && (
          <div className="text-xs text-destructive text-center">
            {error.message ?? "Something went wrong. Try again."}
          </div>
        )}
      </div>

      {/* composer */}
      <form onSubmit={handleSubmit} className="border-t p-3 flex gap-2">
        <Button
          type="button"
          size="icon"
          variant={recording ? "destructive" : "outline"}
          onClick={recording ? stopRecording : startRecording}
          disabled={!ready || isBusy || transcribing}
          title={recording ? "Stop recording" : "Speak to Sparq"}
          aria-label={recording ? "Stop recording" : "Start recording"}
        >
          {transcribing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : recording ? (
            <Square className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={recording ? "Listening…" : transcribing ? "Transcribing…" : "Message Sparq…"}
          disabled={!ready || isBusy || recording || transcribing}
          autoFocus
        />
        <Button type="submit" size="icon" disabled={!ready || isBusy || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>

      <div className="px-3 pb-2 text-[10px] text-muted-foreground text-center">
        AI-generated · may make mistakes · Spott.ca
      </div>
    </div>
  );
}
