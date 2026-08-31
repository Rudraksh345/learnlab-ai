import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Languages, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hinglishNotes } from "@/lib/study.functions";
import type { HinglishNotes } from "@/lib/study-types";

const hand = { fontFamily: "'Caveat', 'Segoe Script', cursive" } as const;

export function HinglishNotesCard({ context }: { context: string }) {
  const make = useServerFn(hinglishNotes);
  const [notes, setNotes] = useState<HinglishNotes | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      setNotes(await make({ data: { context } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not write the Hinglish notes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 font-display text-base">
          <Languages className="size-4 text-primary" /> Hinglish handwritten notes
        </CardTitle>
        <Button size="sm" variant="outline" className="rounded-full" disabled={loading} onClick={run}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          {notes ? "Regenerate" : "Generate"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
        )}
        {!notes && !error && (
          <p className="text-sm text-muted-foreground">
            Same page, samjhane wale simple Hinglish notes — maths notation bilkul accurate.
          </p>
        )}
        {notes && (
          <div className="rounded-2xl border border-border bg-gradient-soft p-5" style={hand}>
            <h3 className="mb-4 text-2xl font-bold text-primary">{notes.title}</h3>
            <div className="space-y-4">
              {notes.sections?.map((s, i) => (
                <div key={i}>
                  <p className="text-xl font-bold underline decoration-primary/50">{s.heading}</p>
                  <ul className="mt-1 space-y-1">
                    {s.lines?.map((l, j) => (
                      <li key={j} className="text-lg leading-8">
                        • {l}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
