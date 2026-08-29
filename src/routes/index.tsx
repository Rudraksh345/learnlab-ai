import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { GraduationCap } from "lucide-react";
import { UploadPanel } from "@/components/UploadPanel";
import { StudyDashboard } from "@/components/StudyDashboard";
import { analyzePage } from "@/lib/study.functions";
import type { StudyPack } from "@/lib/study-types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "masterMath — Turn Maths Notes Into a Study Dashboard" },
      {
        name: "description",
        content:
          "Upload one page of maths notes and get concise notes, formulas, solved examples, an interactive visualizer, a 5-question quiz and an AI tutor.",
      },
      { property: "og:title", content: "masterMath — AI Study Dashboard for Mathematics" },
      {
        property: "og:description",
        content:
          "One upload, one dashboard: notes, concepts, formulas, examples, simulation, quiz and a Hinglish-friendly AI math tutor.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

function Index() {
  const analyze = useServerFn(analyzePage);
  const [pack, setPack] = useState<StudyPack | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error("Please upload a file smaller than 8 MB.");
      const dataUrl = await readAsDataUrl(file);
      const result = await analyze({
        data: { fileName: file.name, mimeType: file.type || "image/png", dataUrl },
      });
      setPack(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-8 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-xs font-semibold shadow-[var(--shadow-card)]">
            <GraduationCap className="size-4 text-primary" />
            AI study companion for Mathematics
          </div>
          {!pack && (
            <>
              <h1 className="mt-5 font-display text-4xl font-bold sm:text-5xl">
                <span className="text-gradient">masterMath</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
                Upload one page of your notes and get a complete dashboard: simple notes, key
                concepts, formulas, solved examples, an interactive visualizer, a 5-question quiz
                and your own AI math tutor.
              </p>
            </>
          )}
        </header>

        {pack ? (
          <StudyDashboard pack={pack} onReset={() => setPack(null)} />
        ) : (
          <UploadPanel onSubmit={handleSubmit} loading={loading} error={error} />
        )}

        <footer className="mt-12 flex flex-col items-center gap-2 text-center">
          <p className="text-sm text-muted-foreground">made by Rudraksh goyal</p>
          <div className="font-display text-3xl font-bold tracking-wider text-gradient">
            RDX
          </div>
        </footer>
      </div>
    </main>
  );
}
