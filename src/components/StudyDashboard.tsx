import { MathText } from "@/components/MathText";
import {
  BookOpen,
  Bot,
  Brain,
  FlaskConical,
  Lightbulb,
  ListChecks,
  Sigma,
  Target,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { QuizCard } from "@/components/QuizCard";
import { SimulationCard } from "@/components/SimulationCard";
import { NotesCanvas } from "@/components/NotesCanvas";
import { FormulaSheetCard } from "@/components/FormulaSheetCard";
import { StepExplain } from "@/components/StepExplain";
import { TutorPanel } from "@/components/TutorPanel";
import { VoiceExplain } from "@/components/VoiceExplain";
import type { StudyPack } from "@/lib/study-types";

const TABS = [
  { value: "notes", label: "Notes", icon: BookOpen },
  { value: "concepts", label: "Concepts", icon: Brain },
  { value: "formulas", label: "Formulas", icon: Sigma },
  { value: "examples", label: "Examples", icon: ListChecks },
  { value: "simulation", label: "Simulation", icon: FlaskConical },
  { value: "quiz", label: "Quiz", icon: Target },
  { value: "tutor", label: "AI Tutor", icon: Bot },
];

export function StudyDashboard({ pack, onReset }: { pack: StudyPack; onReset: () => void }) {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-0 shadow-[var(--shadow-glow)]">
        <div className="bg-gradient-hero p-6 text-primary-foreground sm:p-8">
          <Badge className="mb-3 border-0 bg-white/20 text-primary-foreground">
            Study dashboard
          </Badge>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{pack.topic}</h1>
          <p className="mt-2 max-w-2xl text-sm text-primary-foreground/85 sm:text-base">
            <MathText>{pack.summary}</MathText>
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={onReset}
            className="mt-5 rounded-full font-semibold"
          >
            <Upload className="size-4" /> Upload another page
          </Button>
        </div>
      </Card>

      <VoiceExplain
        english={[
          pack.topic,
          pack.summary,
          ...(pack.examPoints ?? []),
          ...(pack.examples?.flatMap((ex) => [
            `Example: ${ex.problem}`,
            ...(ex.steps ?? []),
            `Answer: ${ex.answer}`,
          ]) ?? []),
        ].filter(Boolean)}
      />

      <Tabs defaultValue="notes" className="w-full">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="h-auto w-max gap-1 rounded-2xl bg-card p-1.5 shadow-[var(--shadow-card)]">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="gap-1.5 rounded-xl px-3 py-2 text-sm data-[state=active]:bg-gradient-hero data-[state=active]:text-primary-foreground"
              >
                <t.icon className="size-4" />
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="mt-4">
          <TabsContent value="notes" className="animate-in fade-in-50 space-y-4">
            <NotesCanvas
              context={JSON.stringify({
                topic: pack.topic,
                summary: pack.summary,
                concepts: pack.concepts,
                formulas: pack.formulas,
                examples: pack.examples,
                examPoints: pack.examPoints,
              })}
            />

            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader>
                <CardTitle className="font-display">🎯 Exam-focused points</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {pack.examPoints?.map((p, i) => (
                    <li
                      key={i}
                      className="flex gap-3 rounded-xl bg-accent/50 p-3 text-sm text-accent-foreground"
                    >
                      <Lightbulb className="mt-0.5 size-4 shrink-0" />
                      <MathText>{p}</MathText>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="concepts" className="animate-in fade-in-50">
            <div className="grid gap-4 sm:grid-cols-2">
              {pack.concepts?.map((c, i) => (
                <Card key={i} className="shadow-[var(--shadow-card)]">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-base text-primary"><MathText>{c.term}</MathText></CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm leading-relaxed text-muted-foreground">
                    <MathText>{c.definition}</MathText>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="formulas" className="animate-in fade-in-50 space-y-4">
            <FormulaSheetCard
              context={JSON.stringify({ topic: pack.topic, formulas: pack.formulas, examPoints: pack.examPoints })}
            />
            {pack.formulas?.map((f, i) => (
              <Card key={i} className="shadow-[var(--shadow-card)]">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-base"><MathText>{f.name}</MathText></CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl bg-gradient-soft p-4 text-center font-mono text-lg">
                    <MathText>{f.latexLike}</MathText>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {f.variables?.map((v, vi) => (
                      <div key={vi} className="flex items-start gap-2 text-sm">
                        <span className="rounded-md bg-secondary px-2 py-0.5 font-mono font-semibold text-secondary-foreground">
                          <MathText>{v.symbol}</MathText>
                        </span>
                        <span className="text-muted-foreground"><MathText>{v.meaning}</MathText></span>
                      </div>
                    ))}
                  </div>
                  {f.usage && <p className="text-sm text-muted-foreground">💡 <MathText>{f.usage}</MathText></p>}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="examples" className="animate-in fade-in-50 space-y-4">
            {pack.examples?.map((ex, i) => (
              <Card key={i} className="shadow-[var(--shadow-card)]">
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-base">
                    Example {i + 1}: <MathText>{ex.title}</MathText>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="rounded-xl bg-muted p-3 text-sm"><MathText>{ex.problem}</MathText></p>
                  <ol className="space-y-3">
                    {ex.steps?.map((s, si) => (
                      <li key={si} className="flex gap-3 text-sm leading-relaxed">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-gradient-hero text-xs font-semibold text-primary-foreground">
                          {si + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <MathText>{s}</MathText>
                          <StepExplain
                            step={s}
                            context={`Topic: ${pack.topic}\nProblem: ${ex.problem}\nAnswer: ${ex.answer}`}
                          />
                        </span>
                      </li>
                    ))}
                  </ol>
                  <p className="rounded-xl bg-success/10 p-3 text-sm font-semibold">
                    ✅ Answer: <MathText>{ex.answer}</MathText>
                  </p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="simulation" className="animate-in fade-in-50">
            <div className="space-y-4">
              {(pack.simulations?.length
                ? pack.simulations
                : pack.simulation
                  ? [pack.simulation]
                  : []
              ).map((sim, i) => (
                <SimulationCard key={i} sim={sim} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="quiz" className="animate-in fade-in-50">
            <QuizCard quiz={pack.quiz ?? []} />
          </TabsContent>

          <TabsContent value="tutor" className="animate-in fade-in-50">
            <TutorPanel
              topic={pack.topic}
              context={JSON.stringify({
                topic: pack.topic,
                summary: pack.summary,
                concepts: pack.concepts,
                formulas: pack.formulas,
                examples: pack.examples,
                examPoints: pack.examPoints,
              })}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
