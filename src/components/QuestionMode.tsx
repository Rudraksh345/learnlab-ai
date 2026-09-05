import { MathText } from "@/components/MathText";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  HelpCircle,
  Image as ImageIcon,
  Languages,
  Lightbulb,
  Loader2,
  Paperclip,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SimulationCard } from "@/components/SimulationCard";
import { StepExplain } from "@/components/StepExplain";
import { FormulaSheetCard } from "@/components/FormulaSheetCard";
import { NotesCanvas } from "@/components/NotesCanvas";
import { TutorPanel } from "@/components/TutorPanel";
import { VoiceExplain } from "@/components/VoiceExplain";
import { questionSimulation, solveQuestion } from "@/lib/study.functions";
import type { QuestionSolution, Simulation } from "@/lib/study-types";

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

export function QuestionMode() {
  const solve = useServerFn(solveQuestion);
  const makeSim = useServerFn(questionSimulation);
  const inputRef = useRef<HTMLInputElement>(null);
  const [question, setQuestion] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuestionSolution | null>(null);
  const [sims, setSims] = useState<Simulation[] | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [hinglish, setHinglish] = useState(false);

  const run = async () => {
    setLoading(true);
    setError(null);
    setSims(null);
    try {
      if (file && file.size > 8 * 1024 * 1024)
        throw new Error("Please upload a file smaller than 8 MB.");
      const dataUrl = file ? await readAsDataUrl(file) : undefined;
      const payload = {
        question: question.trim() || undefined,
        fileName: file?.name,
        mimeType: file?.type || (file ? "image/png" : undefined),
        dataUrl,
      };

      // Fire the visual in parallel so the answer never waits for it.
      setSimLoading(true);
      makeSim({ data: payload })
        .then((r) => setSims(r?.simulations ?? []))
        .catch(() => setSims([]))
        .finally(() => setSimLoading(false));

      const res = await solve({ data: payload });
      setResult(res);
      setHinglish(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/70 p-5 shadow-[var(--shadow-card)] sm:p-6">
        <p className="font-display text-lg font-semibold">Ask one question or example</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Type it, or attach a photo of the question — you&apos;ll get its meaning, an easy
          solution, a simulation made just for it, and a Hinglish explanation.
        </p>

        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Find the eigenvalues of [[2,1],[1,2]] and explain what they mean."
          className="mt-4 min-h-28 resize-none rounded-xl"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => inputRef.current?.click()}
          >
            <Paperclip className="size-4" /> Attach question image / PDF
          </Button>
          {file && (
            <span className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
              <ImageIcon className="size-3.5" />
              {file.name}
              <button type="button" onClick={() => setFile(null)} aria-label="Remove file">
                <X className="size-3.5" />
              </button>
            </span>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button
          size="lg"
          disabled={loading || (!question.trim() && !file)}
          onClick={run}
          className="mt-5 w-full bg-gradient-hero text-base font-semibold shadow-[var(--shadow-glow)] transition-transform hover:scale-[1.01]"
        >
          {loading ? (
            <>
              <Loader2 className="size-5 animate-spin" /> Solving your question…
            </>
          ) : (
            <>
              <Sparkles className="size-5" /> Explain & solve this question
            </>
          )}
        </Button>
      </Card>

      {result && (
        <div className="animate-in fade-in-50 space-y-4">
          <Card className="overflow-hidden border-0 shadow-[var(--shadow-glow)]">
            <div className="bg-gradient-hero p-6 text-primary-foreground">
              <Badge className="mb-3 border-0 bg-white/20 text-primary-foreground">
                {result.topic}
              </Badge>
              <h2 className="font-display text-xl font-bold sm:text-2xl">❓ Question</h2>
              <p className="mt-2 text-sm text-primary-foreground/90 sm:text-base">
                <MathText>{result.question}</MathText>
              </p>
            </div>
          </Card>

          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-base">
                <HelpCircle className="size-4 text-primary" /> What it means
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {result.meaning?.map((m, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-gradient-hero" />
                    <span><MathText>{m}</MathText></span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">🪜 Simple solution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.approach && (
                <p className="rounded-xl bg-muted p-3 text-sm"><MathText>{result.approach}</MathText></p>
              )}
              <ol className="space-y-3">
                {result.steps?.map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-gradient-hero text-xs font-semibold text-primary-foreground">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold"><MathText>{s.title}</MathText></span>
                      <span className="mt-0.5 block text-muted-foreground"><MathText>{s.detail}</MathText></span>
                      <StepExplain
                        step={`${s.title}: ${s.detail}`}
                        context={`Question: ${result.question}\nApproach: ${result.approach}\nAnswer: ${result.answer}`}
                      />
                    </span>
                  </li>
                ))}
              </ol>
              <p className="flex items-start gap-2 rounded-xl bg-success/10 p-3 text-sm font-semibold">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> Answer: <MathText>{result.answer}</MathText>
              </p>
              {result.tips?.length > 0 && (
                <ul className="space-y-2">
                  {result.tips.map((t, i) => (
                    <li
                      key={i}
                      className="flex gap-2 rounded-xl bg-accent/50 p-3 text-sm text-accent-foreground"
                    >
                      <Lightbulb className="mt-0.5 size-4 shrink-0" />
                      <MathText>{t}</MathText>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {(result.simulations?.length
            ? result.simulations
            : result.simulation
              ? [result.simulation]
              : []
          ).map((sim, i) => (
            <SimulationCard key={i} sim={sim} />
          ))}

          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
              <CardTitle className="flex items-center gap-2 font-display text-base">
                <Languages className="size-4 text-primary" /> Hinglish explanation
              </CardTitle>
              <Button
                variant={hinglish ? "secondary" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => setHinglish((v) => !v)}
              >
                {hinglish ? "Hide" : "Explain in Hinglish"}
              </Button>
            </CardHeader>
            {hinglish && (
              <CardContent>
                <ul className="space-y-3">
                  {result.hinglish?.map((h, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed">
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-gradient-hero" />
                      <span><MathText>{h}</MathText></span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            )}
          </Card>
          <NotesCanvas context={JSON.stringify({
              question: result.question,
              topic: result.topic,
              meaning: result.meaning,
              approach: result.approach,
              steps: result.steps,
              answer: result.answer,
              tips: result.tips,
            })} />
          <FormulaSheetCard context={JSON.stringify({
              question: result.question,
              topic: result.topic,
              meaning: result.meaning,
              approach: result.approach,
              steps: result.steps,
              answer: result.answer,
              tips: result.tips,
            })} />
          <TutorPanel
            topic={result.topic}
            context={JSON.stringify({
              question: result.question,
              topic: result.topic,
              meaning: result.meaning,
              approach: result.approach,
              steps: result.steps,
              answer: result.answer,
              tips: result.tips,
            })}
            quick={[
              { label: "Explain simply", prompt: "Explain this question and its solution in the simplest way." },
              { label: "Why this step?", prompt: "Explain why each step of the solution works." },
              { label: "Give me a hint", prompt: "Give me a hint for the trickiest part of this question." },
              { label: "Similar question", prompt: "Give me a similar practice question and solve it step by step." },
            ]}
          />
        </div>
      )}
    </div>
  );
}
