import { useRef, useState } from "react";
import { FileUp, Image as ImageIcon, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Props = {
  onSubmit: (file: File) => void;
  loading: boolean;
  error?: string | null;
};

const STEPS = [
  "Reading your page…",
  "Extracting concepts & formulas…",
  "Writing examples and quiz…",
];

export function UploadPanel({ onSubmit, loading, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  const pick = (f?: File | null) => {
    if (!f) return;
    setFile(f);
  };

  return (
    <Card className="mx-auto w-full max-w-2xl border-border/70 p-6 shadow-[var(--shadow-card)] sm:p-8">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all sm:p-12 ${
          dragging
            ? "border-primary bg-accent/60 scale-[1.01]"
            : "border-border bg-gradient-soft hover:border-primary/60"
        }`}
      >
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-hero text-primary-foreground shadow-[var(--shadow-glow)]">
          <FileUp className="size-7" />
        </div>
        <p className="font-display text-lg font-semibold">Upload one page of your maths notes</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Drag & drop or tap to choose an image or PDF page
        </p>
        {file && (
          <p className="mt-4 flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground">
            <ImageIcon className="size-4" />
            {file.name}
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button
        size="lg"
        disabled={!file || loading}
        onClick={() => file && onSubmit(file)}
        className="mt-6 w-full bg-gradient-hero text-base font-semibold shadow-[var(--shadow-glow)] transition-transform hover:scale-[1.01]"
      >
        {loading ? (
          <>
            <Loader2 className="size-5 animate-spin" /> Building your dashboard…
          </>
        ) : (
          <>
            <Sparkles className="size-5" /> Generate study dashboard
          </>
        )}
      </Button>

      {loading && (
        <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
          {STEPS.map((s, i) => (
            <li
              key={s}
              className="flex animate-pulse items-center gap-2"
              style={{ animationDelay: `${i * 250}ms` }}
            >
              <span className="size-1.5 rounded-full bg-primary" />
              {s}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
