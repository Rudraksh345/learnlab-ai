import { useEffect, useMemo, useRef, useState } from "react";
import { Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import type { Simulation } from "@/lib/study-types";

function compile(expression: string): ((x: number, a: number, b: number, c: number) => number) | null {
  if (!/^[-+*/^().,\sxabc0-9a-z]*$/i.test(expression)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(
      "x",
      "a",
      "b",
      "c",
      `const {sin,cos,tan,exp,log,sqrt,abs,pow,PI,E}=Math; return (${expression});`,
    ) as (x: number, a: number, b: number, c: number) => number;
    const test = fn(1, 1, 1, 1);
    return Number.isFinite(test) || Number.isNaN(test) ? fn : null;
  } catch {
    return null;
  }
}

export function SimulationCard({ sim }: { sim: Simulation }) {
  const fn = useMemo(() => (sim.available ? compile(sim.expression) : null), [sim]);
  const [vals, setVals] = useState<Record<string, number>>(() =>
    Object.fromEntries((sim.params ?? []).map((p) => [p.key, p.default])),
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !fn) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const xMin = sim.xMin ?? -10;
    const xMax = sim.xMax ?? 10;
    const a = vals['a'] ?? 1;
    const b = vals['b'] ?? 1;
    const c = vals['c'] ?? 1;

    const pts: { x: number; y: number }[] = [];
    const N = 400;
    for (let i = 0; i <= N; i++) {
      const x = xMin + ((xMax - xMin) * i) / N;
      const y = fn(x, a, b, c);
      if (Number.isFinite(y)) pts.push({ x, y });
    }
    if (!pts.length) return;
    let yMin = Math.min(...pts.map((p) => p.y));
    let yMax = Math.max(...pts.map((p) => p.y));
    if (yMax - yMin < 1e-6) {
      yMin -= 1;
      yMax += 1;
    }
    const pad = (yMax - yMin) * 0.1;
    yMin -= pad;
    yMax += pad;

    const px = (x: number) => ((x - xMin) / (xMax - xMin)) * w;
    const py = (y: number) => h - ((y - yMin) / (yMax - yMin)) * h;

    ctx.strokeStyle = "rgba(120,120,160,0.16)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo((w * i) / 10, 0);
      ctx.lineTo((w * i) / 10, h);
      ctx.moveTo(0, (h * i) / 10);
      ctx.lineTo(w, (h * i) / 10);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(90,90,130,0.45)";
    ctx.beginPath();
    if (yMin < 0 && yMax > 0) {
      ctx.moveTo(0, py(0));
      ctx.lineTo(w, py(0));
    }
    if (xMin < 0 && xMax > 0) {
      ctx.moveTo(px(0), 0);
      ctx.lineTo(px(0), h);
    }
    ctx.stroke();

    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, "#6d3ff0");
    grad.addColorStop(1, "#2a8ede");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    let started = false;
    for (const p of pts) {
      const Y = py(p.y);
      if (Y < -h * 3 || Y > h * 4) {
        started = false;
        continue;
      }
      if (!started) {
        ctx.moveTo(px(p.x), Y);
        started = true;
      } else ctx.lineTo(px(p.x), Y);
    }
    ctx.stroke();
  }, [fn, vals, sim]);

  if (!sim.available || !fn) {
    return (
      <Card className="shadow-[var(--shadow-card)]">
        <CardContent className="py-12 text-center text-muted-foreground">
          <p className="font-display text-lg font-semibold text-foreground">
            No visual simulation for this page
          </p>
          <p className="mt-2 text-sm">
            This topic is best learned through the notes, formulas and examples tabs.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle className="font-display">{sim.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{sim.description}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="overflow-hidden rounded-2xl border bg-card">
          <canvas ref={canvasRef} className="h-64 w-full sm:h-80" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {sim.params.map((p) => (
            <div key={p.key}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">{p.label}</span>
                <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-secondary-foreground">
                  {(vals[p.key] ?? p.default).toFixed(2)}
                </span>
              </div>
              <Slider
                min={p.min}
                max={p.max}
                step={p.step || 0.1}
                value={[vals[p.key] ?? p.default]}
                onValueChange={(v) => setVals((s) => ({ ...s, [p.key]: v[0] ?? p.default }))}
              />
            </div>
          ))}
        </div>
        {sim.insight && (
          <p className="flex gap-2 rounded-xl bg-accent/60 p-4 text-sm text-accent-foreground">
            <Lightbulb className="mt-0.5 size-4 shrink-0" />
            {sim.insight}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
