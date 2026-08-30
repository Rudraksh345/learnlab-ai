import { useEffect, useMemo, useRef, useState } from "react";
import { Lightbulb, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import type { Simulation } from "@/lib/study-types";

const COLORS = ["#6d3ff0", "#2a8ede", "#e0559b", "#12b886"];

type Fn = (x: number, a: number, b: number, c: number) => number;

function compile(expression: string): Fn | null {
  if (!expression || !/^[-+*/^().,\sxabc0-9a-z]*$/i.test(expression)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(
      "x",
      "a",
      "b",
      "c",
      `const {sin,cos,tan,sinh,cosh,tanh,asin,acos,atan,exp,log,sqrt,cbrt,abs,sign,min,max,floor,round,pow,PI,E}=Math; return (${expression});`,
    ) as Fn;
    const test = fn(1, 1, 1, 1);
    return typeof test === "number" ? fn : null;
  } catch {
    return null;
  }
}

export function SimulationCard({ sim }: { sim: Simulation }) {
  const curves = useMemo(() => {
    if (!sim?.available) return [];
    const list =
      sim.curves && sim.curves.length
        ? sim.curves
        : [{ label: sim.title || "y = f(x)", expression: sim.expression }];
    return list
      .map((c) => ({ label: c.label, fn: compile(c.expression) }))
      .filter((c): c is { label: string; fn: Fn } => c.fn !== null);
  }, [sim]);

  const [vals, setVals] = useState<Record<string, number>>(() =>
    Object.fromEntries((sim.params ?? []).map((p) => [p.key, p.default])),
  );
  const [playing, setPlaying] = useState(false);
  const xMin = sim.xMin ?? -10;
  const xMax = sim.xMax ?? 10;
  const [probe, setProbe] = useState((xMin + xMax) / 2);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const animKey = sim.animateParam ?? sim.params?.[0]?.key ?? null;
  const animParam = sim.params?.find((p) => p.key === animKey) ?? null;

  useEffect(() => {
    if (!playing || !animParam) return;
    const id = window.setInterval(() => {
      setVals((s) => {
        const cur = s[animParam.key] ?? animParam.default;
        const step = (animParam.max - animParam.min) / 80;
        let next = cur + step;
        if (next > animParam.max) next = animParam.min;
        return { ...s, [animParam.key]: next };
      });
    }, 40);
    return () => window.clearInterval(id);
  }, [playing, animParam]);

  const a = vals["a"] ?? 1;
  const b = vals["b"] ?? 1;
  const c = vals["c"] ?? 1;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !curves.length) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const N = 400;
    const series = curves.map(({ fn }) => {
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i <= N; i++) {
        const x = xMin + ((xMax - xMin) * i) / N;
        const y = fn(x, a, b, c);
        if (Number.isFinite(y)) pts.push({ x, y });
      }
      return pts;
    });
    const all = series.flat();
    if (!all.length) return;

    const sorted = all.map((p) => p.y).sort((m, n) => m - n);
    let yMin = sorted[Math.floor(sorted.length * 0.01)] ?? 0;
    let yMax = sorted[Math.floor(sorted.length * 0.99)] ?? 1;
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

    series.forEach((pts, ci) => {
      ctx.strokeStyle = COLORS[ci % COLORS.length] ?? "#6d3ff0";
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
    });

    // probe line + points
    const X = px(probe);
    ctx.strokeStyle = "rgba(109,63,240,0.45)";
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(X, 0);
    ctx.lineTo(X, h);
    ctx.stroke();
    ctx.setLineDash([]);
    curves.forEach(({ fn }, ci) => {
      const y = fn(probe, a, b, c);
      if (!Number.isFinite(y)) return;
      ctx.fillStyle = COLORS[ci % COLORS.length] ?? "#6d3ff0";
      ctx.beginPath();
      ctx.arc(X, py(y), 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [curves, a, b, c, xMin, xMax, probe]);

  if (!sim?.available || !curves.length) {
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
        <div className="flex flex-wrap items-center gap-3">
          {curves.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className="size-2.5 rounded-full"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              {c.label}
            </span>
          ))}
          {animParam && (
            <Button
              variant="outline"
              size="sm"
              className="ml-auto rounded-full"
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              {playing ? "Pause" : `Animate ${animParam.label}`}
            </Button>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border bg-card">
          <canvas ref={canvasRef} className="h-64 w-full sm:h-80" />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">{sim.xLabel || "x"} (drag the point)</span>
            <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-secondary-foreground">
              {probe.toFixed(2)}
            </span>
          </div>
          <Slider
            min={xMin}
            max={xMax}
            step={(xMax - xMin) / 200}
            value={[probe]}
            onValueChange={(v) => setProbe(v[0] ?? probe)}
          />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {curves.map((cv, i) => {
              const y = cv.fn(probe, a, b, c);
              return (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl bg-accent/50 px-3 py-2 text-sm"
                >
                  <span className="truncate text-accent-foreground">{cv.label}</span>
                  <span className="ml-2 font-mono">
                    {Number.isFinite(y) ? y.toFixed(3) : "undefined"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {sim.params?.map((p) => (
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
