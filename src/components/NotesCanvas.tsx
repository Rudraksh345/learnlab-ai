import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, PenLine, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { richNotes } from "@/lib/study.functions";
import type { NoteBlock, RichNotes } from "@/lib/study-types";

const hand = { fontFamily: "'Caveat', 'Segoe Script', cursive" } as const;

type Palette = { text: string; bg: string; border: string };

const COLORS: Record<string, Palette> = {
  blue: { text: "text-sky-600", bg: "bg-sky-500/10", border: "border-sky-500/40" },
  purple: { text: "text-violet-600", bg: "bg-violet-500/10", border: "border-violet-500/40" },
  green: { text: "text-emerald-600", bg: "bg-emerald-500/10", border: "border-emerald-500/40" },
  pink: { text: "text-pink-600", bg: "bg-pink-500/10", border: "border-pink-500/40" },
  amber: { text: "text-amber-600", bg: "bg-amber-500/10", border: "border-amber-500/40" },
};

function Block({ block, c }: { block: NoteBlock; c: Palette }) {
  const label = block.label ? <span className="font-bold">{block.label}: </span> : null;

  if (block.kind === "formula")
    return (
      <div
        className={`rounded-xl border-2 ${c.border} ${c.bg} px-4 py-2 text-center text-xl font-bold`}
      >
        {label}
        {block.text}
      </div>
    );

  if (block.kind === "box")
    return (
      <div className={`rounded-xl border-2 border-dashed ${c.border} px-4 py-2 text-lg leading-7`}>
        {label}
        {block.text}
      </div>
    );

  if (block.kind === "callout")
    return (
      <div className={`rounded-xl ${c.bg} px-4 py-2 text-lg leading-7`}>
        <span className="mr-1">⭐</span>
        {label}
        <span className="underline decoration-wavy decoration-1 underline-offset-4">
          {block.text}
        </span>
      </div>
    );

  if (block.kind === "example")
    return (
      <div className="rounded-xl bg-muted px-4 py-2 text-lg leading-7">
        <span className="mr-1">✏️</span>
        {label}
        {block.text}
      </div>
    );

  if (block.kind === "arrow")
    return (
      <p className={`pl-4 text-lg leading-7 ${c.text}`}>
        ➜ {label}
        {block.text}
      </p>
    );

  return (
    <p className="text-lg leading-8">
      • {label}
      {block.text}
    </p>
  );
}

export function NotesCanvas({ context }: { context: string }) {
  const make = useServerFn(richNotes);
  const [notes, setNotes] = useState<RichNotes | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<"english" | "hinglish">("english");

  const run = async (lang: "english" | "hinglish") => {
    setLanguage(lang);
    setLoading(true);
    setError(null);
    try {
      setNotes(await make({ data: { context, language: lang } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not write the notes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden shadow-[var(--shadow-card)]">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 font-display text-base">
          <PenLine className="size-4 text-primary" /> Handwritten notes
        </CardTitle>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={language === "english" && notes ? "secondary" : "outline"}
            className="rounded-full"
            disabled={loading}
            onClick={() => run("english")}
          >
            {loading && language === "english" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            English
          </Button>
          <Button
            size="sm"
            variant={language === "hinglish" && notes ? "secondary" : "outline"}
            className="rounded-full"
            disabled={loading}
            onClick={() => run("hinglish")}
          >
            {loading && language === "hinglish" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Hinglish
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
        )}
        {!notes && !error && !loading && (
          <p className="text-sm text-muted-foreground">
            Colourful handwritten-style revision notes made only from this content — pick a
            language to generate them.
          </p>
        )}
        {loading && !notes && (
          <p className="text-sm text-muted-foreground">Writing your notes by hand…</p>
        )}
        {notes && (
          <div
            className="rounded-2xl border border-border bg-gradient-soft p-5 sm:p-6"
            style={hand}
          >
            <h3 className="mb-5 text-3xl font-bold text-gradient">{notes.title}</h3>
            <div className="space-y-6">
              {notes.sections?.map((s, i) => {
                const c: Palette = COLORS[s.color] ?? {
                  text: "text-sky-600",
                  bg: "bg-sky-500/10",
                  border: "border-sky-500/40",
                };
                return (
                  <section key={i}>
                    <h4 className={`text-2xl font-bold ${c.text}`}>
                      <span className={`rounded-md px-1 ${c.bg}`}>{s.heading}</span>
                    </h4>
                    <div className={`mt-2 space-y-2 border-l-2 pl-4 ${c.border}`}>
                      {s.blocks?.map((b, j) => (
                        <Block key={j} block={b} c={c} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
