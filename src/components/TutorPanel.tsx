import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, User } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { askTutor } from "@/lib/study.functions";
import type { StudyPack } from "@/lib/study-types";

type Msg = { role: "user" | "assistant"; content: string };

const QUICK = [
  { label: "Explain simply", prompt: "Explain this topic in the simplest possible way." },
  { label: "Solve an example", prompt: "Solve one fresh example from this page, step by step." },
  { label: "Give me a hint", prompt: "Give me a hint for the hardest idea on this page." },
  { label: "Quiz me", prompt: "Ask me one question from this page and wait for my answer." },
];

function buildContext(pack: StudyPack) {
  return JSON.stringify({
    topic: pack.topic,
    summary: pack.summary,
    notes: pack.notes,
    concepts: pack.concepts,
    formulas: pack.formulas,
    examples: pack.examples,
    examPoints: pack.examPoints,
  }).slice(0, 18000);
}

export function TutorPanel({ pack }: { pack: StudyPack }) {
  const ask = useServerFn(askTutor);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: `Hi! I'm your ThinkMate tutor for **${pack.topic}**. Ask me anything from this page, or tap a shortcut below.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [hinglish, setHinglish] = useState(false);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (question: string) => {
    if (!question.trim() || loading) return;
    const history = messages.slice(-8);
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setLoading(true);
    try {
      const res = await ask({
        data: { question, hinglish, context: buildContext(pack), history },
      });
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: e instanceof Error ? e.message : "Something went wrong." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="flex h-[70vh] min-h-[520px] flex-col overflow-hidden shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between border-b bg-gradient-soft px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground">
            <Bot className="size-5" />
          </div>
          <div>
            <p className="font-display text-sm font-semibold">AI Math Tutor</p>
            <p className="text-xs text-muted-foreground">Answers only from your page</p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs font-medium">
          Hinglish
          <Switch checked={hinglish} onCheckedChange={setHinglish} />
        </label>
      </div>

      <CardContent className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "assistant" && (
              <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <Bot className="size-4" />
              </div>
            )}
            <div
              className={`animate-in fade-in slide-in-from-bottom-1 max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-gradient-hero text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {m.content}
            </div>
            {m.role === "user" && (
              <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <User className="size-4" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Thinking…
          </div>
        )}
        <div ref={endRef} />
      </CardContent>

      <div className="border-t p-3">
        <div className="mb-2 flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <Button
              key={q.label}
              size="sm"
              variant="secondary"
              disabled={loading}
              onClick={() => send(q.prompt)}
              className="rounded-full text-xs"
            >
              {q.label}
            </Button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this page…"
            className="rounded-xl"
          />
          <Button type="submit" disabled={loading || !input.trim()} className="rounded-xl bg-gradient-hero">
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
