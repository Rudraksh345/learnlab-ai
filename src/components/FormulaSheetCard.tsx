import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { makeFormulaSheet } from "@/lib/study.functions";
import type { FormulaSheet } from "@/lib/study-types";

const hand = { fontFamily: "'Caveat', 'Segoe Script', cursive" } as const;

export function FormulaSheetCard({ context }: { context: string }) {
  const make = useServerFn(makeFormulaSheet);
  const [sheet, setSheet] = useState<FormulaSheet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      setSheet(await make({ data: { context } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build the formula sheet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 font-display text-base">
          <NotebookPen className="size-4 text-primary" /> Formula sheet
        </CardTitle>
        <Button size="sm" variant="outline" className="rounded-full" disabled={loading} onClick={run}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          {sheet ? "Regenerate" : "Make formula sheet"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
        )}
        {!sheet && !error && (
          <p className="text-sm text-muted-foreground">
            A clean handwritten-style sheet with only the formulas that matter here.
          </p>
        )}
        {sheet && (
          <div
            className="rounded-2xl border border-border bg-[repeating-linear-gradient(transparent,transparent_31px,hsl(var(--border))_32px)] bg-gradient-soft p-5"
            style={hand}
          >
            <h3 className="mb-4 text-2xl font-bold text-primary" style={hand}>
              {sheet.title}
            </h3>
            <div className="space-y-5">
              {sheet.sections?.map((s, i) => (
                <div key={i}>
                  <p className="text-xl font-bold underline decoration-primary/50">{s.heading}</p>
                  <ul className="mt-2 space-y-2">
                    {s.items?.map((it, j) => (
                      <li key={j} className="text-lg leading-8">
                        <span className="font-bold">{it.name}: </span>
                        <span>{it.formula}</span>
                        {it.condition ? (
                          <span className="text-muted-foreground"> ({it.condition})</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {sheet.reminders?.length ? (
              <div className="mt-5 border-t border-border pt-3">
                {sheet.reminders.map((r, i) => (
                  <p key={i} className="text-lg leading-7">
                    ★ {r}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
