import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Sparkles, X, Bot, Mic, Square, Volume2, VolumeX, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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

  // ---------- Voice playback (TTS) ----------
  const [voiceOn, setVoiceOn] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const spokenIdsRef = useRef<Set<string>>(new Set());

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;
    try {
      stopAudio();
      const res = await fetch("/api/sparq/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play().catch(() => {});
    } catch {
      /* ignore */
    }
  }, [stopAudio]);

  // Auto-speak new completed assistant messages when voice is on
  useEffect(() => {
    if (!voiceOn || isBusy) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (spokenIdsRef.current.has(last.id)) return;
    const text = last.parts.map((p) => (p.type === "text" ? p.text : "")).join("").trim();
    if (!text) return;
    spokenIdsRef.current.add(last.id);
    speak(text);
  }, [messages, isBusy, voiceOn, speak]);

  useEffect(() => () => stopAudio(), [stopAudio]);

  // ---------- Microphone (STT) ----------
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stopMicTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startRecording = async () => {
    if (recording || transcribing || !ready) return;
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
    } catch {
      stopMicTracks();
      setRecording(false);
    }
  };

  const stopRecording = () => {
    if (!recording) return;
    setRecording(false);
    try {
      recorderRef.current?.stop();
    } catch {
      stopMicTracks();
    }
    recorderRef.current = null;
  };

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
            <div className="text-[10px] text-muted-foreground">Your Spott.ca assistant</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              if (voiceOn) stopAudio();
              setVoiceOn((v) => !v);
            }}
            title={voiceOn ? "Mute voice replies" : "Hear Sparq's replies"}
            aria-label={voiceOn ? "Mute voice replies" : "Enable voice replies"}
          >
            {voiceOn ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4" />}
          </Button>
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
