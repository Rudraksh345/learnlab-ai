import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { explainStep } from "@/lib/study.functions";

type Props = { step: string; context: string };

export function StepExplain({ step, context }: Props) {
  const explain = useServerFn(explainStep);
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<"en" | "hi">("en");

  const run = async (hinglish: boolean) => {
    setLang(hinglish ? "hi" : "en");
    setLoading(true);
    try {
      const res = await explain({ data: { step, context, hinglish } });
      setText(res.reply);
    } catch (e) {
      setText(e instanceof Error ? e.message : "Could not explain this step.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={loading}
          className="h-7 rounded-full px-3 text-xs"
          onClick={() => run(false)}
        >
          {loading && lang === "en" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          Explain this step
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={loading}
          className="h-7 rounded-full px-3 text-xs"
          onClick={() => run(true)}
        >
          {loading && lang === "hi" ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Hinglish
        </Button>
      </div>
      {text && (
        <p className="mt-2 whitespace-pre-wrap rounded-xl bg-accent/50 p-3 text-sm leading-relaxed text-accent-foreground">
          {text}
        </p>
      )}
    </div>
  );
}
