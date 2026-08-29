import { useState } from "react";
import { Check, RotateCcw, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { QuizQuestion } from "@/lib/study-types";

export function QuizCard({ quiz }: { quiz: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const answered = Object.keys(answers).length;
  const score = quiz.reduce(
    (acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0),
    0,
  );
  const done = answered === quiz.length && quiz.length > 0;

  return (
    <div className="space-y-4">
      <Card className="shadow-[var(--shadow-card)]">
        <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground">
              <Trophy className="size-5" />
            </div>
            <div>
              <p className="font-display font-semibold">
                Score {score} / {quiz.length}
              </p>
              <p className="text-sm text-muted-foreground">
                {done ? "Quiz complete — review the explanations below." : `${answered} answered`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:w-1/2">
            <Progress value={(answered / Math.max(quiz.length, 1)) * 100} className="flex-1" />
            <Button variant="ghost" size="sm" onClick={() => setAnswers({})}>
              <RotateCcw className="size-4" /> Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {quiz.map((q, i) => {
        const picked = answers[i];
        return (
          <Card key={i} className="shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle className="font-display text-base leading-relaxed">
                <span className="mr-2 text-primary">Q{i + 1}.</span>
                {q.question}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {q.options.map((opt, oi) => {
                const isPicked = picked === oi;
                const isCorrect = oi === q.correctIndex;
                const reveal = picked !== undefined;
                return (
                  <button
                    key={oi}
                    disabled={reveal}
                    onClick={() => setAnswers((a) => ({ ...a, [i]: oi }))}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                      reveal && isCorrect
                        ? "border-success bg-success/10 text-foreground"
                        : reveal && isPicked
                          ? "border-destructive bg-destructive/10"
                          : reveal
                            ? "opacity-60"
                            : "hover:border-primary hover:bg-accent/50"
                    }`}
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-secondary-foreground">
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <span className="flex-1">{opt}</span>
                    {reveal && isCorrect && <Check className="size-4 text-success" />}
                    {reveal && isPicked && !isCorrect && <X className="size-4 text-destructive" />}
                  </button>
                );
              })}
              {picked !== undefined && (
                <p className="animate-in fade-in slide-in-from-bottom-1 rounded-xl bg-accent/60 p-3 text-sm text-accent-foreground">
                  {q.explanation}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
