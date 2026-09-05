import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Turns the already-generated answer text into speech-friendly plain text. */
function speakable(text: string) {
  return text
    .replace(/\$\$([\s\S]*?)\$\$/g, " $1 ")
    .replace(/\$([^$]*)\$/g, " $1 ")
    .replace(/\\\(|\\\)|\\\[|\\\]/g, " ")
    .replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, " $1 over $2 ")
    .replace(/\\sqrt\s*\{([^{}]*)\}/g, " square root of $1 ")
    .replace(/\^\{?([^{}\s]+)\}?/g, " to the power $1 ")
    .replace(/_\{?([^{}\s]+)\}?/g, " sub $1 ")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[{}*\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function VoiceExplain({
  english,
  hinglish,
}: {
  english: string[];
  hinglish?: string[];
}) {
  const [lang, setLang] = useState<"english" | "hinglish">("english");
  const [state, setState] = useState<"idle" | "playing" | "paused">("idle");
  const [supported, setSupported] = useState(true);
  const langRef = useRef(lang);
  langRef.current = lang;

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) setSupported(false);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window)
        window.speechSynthesis.cancel();
    };
  }, []);

  const lines = (lang === "hinglish" && hinglish?.length ? hinglish : english).filter(Boolean);

  const start = () => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const text = speakable(lines.join(". "));
    if (!text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = langRef.current === "hinglish" ? "hi-IN" : "en-IN";
    u.rate = 0.98;
    u.onend = () => setState("idle");
    u.onerror = () => setState("idle");
    synth.speak(u);
    setState("playing");
  };

  const toggle = () => {
    const synth = window.speechSynthesis;
    if (state === "playing") {
      synth.pause();
      setState("paused");
    } else if (state === "paused") {
      synth.resume();
      setState("playing");
    } else {
      start();
    }
  };

  const switchLang = (next: "english" | "hinglish") => {
    setLang(next);
    langRef.current = next;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setState("idle");
    }
  };

  if (!supported) return null;

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-display text-base">
          <Volume2 className="size-4 text-primary" /> Explain with voice
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={toggle} className="rounded-full bg-gradient-hero">
          {state === "playing" ? (
            <>
              <Pause className="size-4" /> Pause
            </>
          ) : (
            <>
              <Play className="size-4" /> {state === "paused" ? "Resume" : "Play"}
            </>
          )}
        </Button>
        <Button size="sm" variant="outline" className="rounded-full" onClick={start}>
          <RotateCcw className="size-4" /> Replay
        </Button>
        <div className="ml-auto flex gap-1 rounded-full bg-muted p-1">
          {(["english", "hinglish"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => switchLang(l)}
              disabled={l === "hinglish" && !hinglish?.length}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors disabled:opacity-40 ${
                lang === l ? "bg-card shadow-sm" : "text-muted-foreground"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
