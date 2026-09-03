import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Lightbulb, Move, Pause, Play } from "lucide-react";
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

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function SimulationCard({ sim }: { sim: Simulation }) {
  const mode =
    sim.mode ??
    (sim.vectors?.length ? "vector" : sim.parametric?.length ? "parametric" : "graph");

  const curves = useMemo(() => {
    if (!sim?.available || mode !== "graph") return [];
    const list =
      sim.curves && sim.curves.length
        ? sim.curves
        : [{ label: sim.title || "y = f(x)", expression: sim.expression }];
    return list
      .map((c) => ({ label: c.label, fn: compile(c.expression) }))
      .filter((c): c is { label: string; fn: Fn } => c.fn !== null);
  }, [sim, mode]);

  const vectors = useMemo(() => {
    if (!sim?.available || mode !== "vector") return [];
    return (sim.vectors ?? [])
      .map((v) => ({ label: v.label, fx: compile(v.x), fy: compile(v.y) }))
      .filter((v): v is { label: string; fx: Fn; fy: Fn } => v.fx !== null && v.fy !== null);
  }, [sim, mode]);

  const paramCurves = useMemo(() => {
    if (!sim?.available || mode !== "parametric") return [];
    return (sim.parametric ?? [])
      .map((p) => ({ label: p.label, fx: compile(p.xExpr), fy: compile(p.yExpr) }))
      .filter((p): p is { label: string; fx: Fn; fy: Fn } => p.fx !== null && p.fy !== null);
  }, [sim, mode]);

  const usable =
    mode === "graph" ? curves.length : mode === "vector" ? vectors.length : paramCurves.length;

  const [vals, setVals] = useState<Record<string, number>>(() =>
    Object.fromEntries((sim.params ?? []).map((p) => [p.key, p.default])),
  );
  const [playing, setPlaying] = useState(false);
  const xMin = sim.xMin ?? -10;
  const xMax = sim.xMax ?? 10;
  const [probe, setProbe] = useState((xMin + xMax) / 2);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);

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

  /** world bounds used by the current renderer, kept for pointer mapping */
  const view = useRef({ xMin, xMax, yMin: -1, yMax: 1, w: 1, h: 1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !usable) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    let yMin = -1;
    let yMax = 1;
    let vxMin = xMin;
    let vxMax = xMax;

    if (mode === "graph") {
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
      yMin = sorted[Math.floor(sorted.length * 0.01)] ?? 0;
      yMax = sorted[Math.floor(sorted.length * 0.99)] ?? 1;
      if (yMax - yMin < 1e-6) {
        yMin -= 1;
        yMax += 1;
      }
      const pad = (yMax - yMin) * 0.1;
      yMin -= pad;
      yMax += pad;

      const px = (x: number) => ((x - xMin) / (xMax - xMin)) * w;
      const py = (y: number) => h - ((y - yMin) / (yMax - yMin)) * h;
      view.current = { xMin, xMax, yMin, yMax, w, h };
      drawGrid(ctx, w, h);
      drawAxes(ctx, w, h, px, py, xMin, xMax, yMin, yMax);

      // shaded area from 0 to probe
      if (sim.area && curves[0]) {
        const fn = curves[0].fn;
        const from = Math.min(0, probe) < xMin ? xMin : Math.min(0, probe);
        const to = Math.max(0, probe) > xMax ? xMax : Math.max(0, probe);
        ctx.fillStyle = "rgba(109,63,240,0.18)";
        ctx.beginPath();
        ctx.moveTo(px(from), py(0));
        for (let i = 0; i <= 200; i++) {
          const x = from + ((to - from) * i) / 200;
          const y = fn(x, a, b, c);
          ctx.lineTo(px(x), py(Number.isFinite(y) ? y : 0));
        }
        ctx.lineTo(px(to), py(0));
        ctx.closePath();
        ctx.fill();
      }

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

      // tangent line at the dragged point
      if (sim.tangent && curves[0]) {
        const fn = curves[0].fn;
        const hStep = (xMax - xMin) / 2000;
        const y0 = fn(probe, a, b, c);
        const slope = (fn(probe + hStep, a, b, c) - fn(probe - hStep, a, b, c)) / (2 * hStep);
        if (Number.isFinite(y0) && Number.isFinite(slope)) {
          const span = (xMax - xMin) * 0.25;
          ctx.strokeStyle = "#e0559b";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(px(probe - span), py(y0 - slope * span));
          ctx.lineTo(px(probe + span), py(y0 + slope * span));
          ctx.stroke();
        }
      }

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
        ctx.arc(X, py(y), 6, 0, Math.PI * 2);
        ctx.fill();
      });
      return;
    }

    if (mode === "vector") {
      const pts = vectors.map((v) => ({ x: v.fx(0, a, b, c), y: v.fy(0, a, b, c) }));
      const mags = pts.flatMap((p) => [Math.abs(p.x), Math.abs(p.y)]).filter(Number.isFinite);
      const span = Math.max(Math.abs(xMax), Math.abs(xMin), ...mags, 1) * 1.2;
      vxMin = -span;
      vxMax = span;
      yMin = -span;
      yMax = span;
      const px = (x: number) => ((x - vxMin) / (vxMax - vxMin)) * w;
      const py = (y: number) => h - ((y - yMin) / (yMax - yMin)) * h;
      view.current = { xMin: vxMin, xMax: vxMax, yMin, yMax, w, h };
      drawGrid(ctx, w, h);
      drawAxes(ctx, w, h, px, py, vxMin, vxMax, yMin, yMax);

      pts.forEach((p, i) => {
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
        arrow(ctx, px(0), py(0), px(p.x), py(p.y), COLORS[i % COLORS.length] ?? "#6d3ff0", 3);
        ctx.fillStyle = COLORS[i % COLORS.length] ?? "#6d3ff0";
        ctx.beginPath();
        ctx.arc(px(p.x), py(p.y), 6, 0, Math.PI * 2);
        ctx.fill();
      });

      if (pts.length >= 2) {
        const sx = pts.reduce((s, p) => s + p.x, 0);
        const sy = pts.reduce((s, p) => s + p.y, 0);
        if (Number.isFinite(sx) && Number.isFinite(sy)) {
          ctx.setLineDash([5, 5]);
          arrow(ctx, px(0), py(0), px(sx), py(sy), "#12b886", 2);
          ctx.setLineDash([]);
        }
      }
      return;
    }

    // parametric
    const N = 600;
    const series = paramCurves.map(({ fx, fy }) => {
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i <= N; i++) {
        const t = xMin + ((xMax - xMin) * i) / N;
        const X = fx(t, a, b, c);
        const Y = fy(t, a, b, c);
        if (Number.isFinite(X) && Number.isFinite(Y)) pts.push({ x: X, y: Y });
      }
      return pts;
    });
    const all = series.flat();
    if (!all.length) return;
    vxMin = Math.min(...all.map((p) => p.x));
    vxMax = Math.max(...all.map((p) => p.x));
    yMin = Math.min(...all.map((p) => p.y));
    yMax = Math.max(...all.map((p) => p.y));
    const padX = (vxMax - vxMin || 1) * 0.15;
    const padY = (yMax - yMin || 1) * 0.15;
    vxMin -= padX;
    vxMax += padX;
    yMin -= padY;
    yMax += padY;
    const px = (x: number) => ((x - vxMin) / (vxMax - vxMin)) * w;
    const py = (y: number) => h - ((y - yMin) / (yMax - yMin)) * h;
    view.current = { xMin, xMax, yMin, yMax, w, h };
    drawGrid(ctx, w, h);
    drawAxes(ctx, w, h, px, py, vxMin, vxMax, yMin, yMax);
    series.forEach((pts, ci) => {
      ctx.strokeStyle = COLORS[ci % COLORS.length] ?? "#6d3ff0";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(px(p.x), py(p.y)) : ctx.moveTo(px(p.x), py(p.y))));
      ctx.stroke();
    });
    paramCurves.forEach(({ fx, fy }, ci) => {
      const X = fx(probe, a, b, c);
      const Y = fy(probe, a, b, c);
      if (!Number.isFinite(X) || !Number.isFinite(Y)) return;
      ctx.fillStyle = COLORS[ci % COLORS.length] ?? "#6d3ff0";
      ctx.beginPath();
      ctx.arc(px(X), py(Y), 6, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [curves, vectors, paramCurves, mode, a, b, c, xMin, xMax, probe, sim.area, sim.tangent, usable]);

  const handlePointer = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!dragging.current) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const rx = (e.clientX - rect.left) / rect.width;
      const ry = (e.clientY - rect.top) / rect.height;
      const v = view.current;
      if (mode === "vector") {
        const wx = v.xMin + rx * (v.xMax - v.xMin);
        const wy = v.yMax - ry * (v.yMax - v.yMin);
        setVals((s) => {
          const next = { ...s };
          const pa = sim.params?.find((p) => p.key === "a");
          const pb = sim.params?.find((p) => p.key === "b");
          if (pa) next["a"] = clamp(wx, pa.min, pa.max);
          if (pb) next["b"] = clamp(wy, pb.min, pb.max);
          return next;
        });
      } else {
        setProbe(clamp(xMin + rx * (xMax - xMin), xMin, xMax));
      }
    },
    [mode, sim.params, xMin, xMax],
  );

  if (!sim?.available || !usable) {
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

  const legend =
    mode === "graph"
      ? curves.map((c) => c.label)
      : mode === "vector"
        ? vectors.map((v) => v.label)
        : paramCurves.map((p) => p.label);

  // live readouts
  let readouts: { label: string; value: string }[] = [];
  if (mode === "graph") {
    readouts = curves.map((cv) => {
      const y = cv.fn(probe, a, b, c);
      return { label: cv.label, value: Number.isFinite(y) ? y.toFixed(3) : "undefined" };
    });
    if (sim.tangent && curves[0]) {
      const fn = curves[0].fn;
      const hStep = (xMax - xMin) / 2000;
      const slope = (fn(probe + hStep, a, b, c) - fn(probe - hStep, a, b, c)) / (2 * hStep);
      readouts.push({
        label: "slope (dy/dx)",
        value: Number.isFinite(slope) ? slope.toFixed(3) : "undefined",
      });
    }
    if (sim.area && curves[0]) {
      const fn = curves[0].fn;
      const from = 0;
      const to = probe;
      let sum = 0;
      const n = 400;
      for (let i = 0; i < n; i++) {
        const x1 = from + ((to - from) * i) / n;
        const x2 = from + ((to - from) * (i + 1)) / n;
        const y1 = fn(x1, a, b, c);
        const y2 = fn(x2, a, b, c);
        if (Number.isFinite(y1) && Number.isFinite(y2)) sum += ((y1 + y2) / 2) * (x2 - x1);
      }
      readouts.push({ label: "area from 0", value: sum.toFixed(3) });
    }
  } else if (mode === "vector") {
    const pts = vectors.map((v) => ({
      label: v.label,
      x: v.fx(0, a, b, c),
      y: v.fy(0, a, b, c),
    }));
    readouts = pts.map((p) => ({
      label: `${p.label} = (${p.x.toFixed(2)}, ${p.y.toFixed(2)}) , |v| `,
      value: Math.hypot(p.x, p.y).toFixed(3),
    }));
    if (pts.length >= 2) {
      const [p, q] = pts as [(typeof pts)[0], (typeof pts)[0]];
      readouts.push({ label: "dot product", value: (p.x * q.x + p.y * q.y).toFixed(3) });
      readouts.push({ label: "cross (z)", value: (p.x * q.y - p.y * q.x).toFixed(3) });
      const ang =
        (Math.atan2(q.y, q.x) - Math.atan2(p.y, p.x)) * (180 / Math.PI);
      readouts.push({ label: "angle between", value: `${(((ang % 360) + 360) % 360).toFixed(1)}°` });
    }
  } else {
    readouts = paramCurves.map((p) => ({
      label: p.label,
      value: `(${p.fx(probe, a, b, c).toFixed(2)}, ${p.fy(probe, a, b, c).toFixed(2)})`,
    }));
  }

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle className="font-display">{sim.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{sim.description}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          {legend.map((label, i) => (
            <span key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className="size-2.5 rounded-full"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              {label}
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
          <canvas
            ref={canvasRef}
            className="h-64 w-full touch-none cursor-grab active:cursor-grabbing sm:h-80"
            onPointerDown={(e) => {
              dragging.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              handlePointer(e);
            }}
            onPointerMove={handlePointer}
            onPointerUp={() => (dragging.current = false)}
            onPointerLeave={() => (dragging.current = false)}
          />
        </div>

        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Move className="size-3.5" />
          {mode === "vector"
            ? "Drag inside the graph to move the vector tip"
            : "Drag inside the graph to move the point"}
        </p>

        {mode !== "vector" && (
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">
                {sim.xLabel || (mode === "parametric" ? "t" : "x")}
              </span>
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
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          {readouts.map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl bg-accent/50 px-3 py-2 text-sm"
            >
              <span className="truncate text-accent-foreground">{r.label}</span>
              <span className="ml-2 font-mono">{r.value}</span>
            </div>
          ))}
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

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
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
}

function drawAxes(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  px: (x: number) => number,
  py: (y: number) => number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
) {
  ctx.strokeStyle = "rgba(90,90,130,0.45)";
  ctx.lineWidth = 1;
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
}

function arrow(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  width: number,
) {
  const ang = Math.atan2(y1 - y0, x1 - x0);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  const head = 10;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - head * Math.cos(ang - 0.4), y1 - head * Math.sin(ang - 0.4));
  ctx.lineTo(x1 - head * Math.cos(ang + 0.4), y1 - head * Math.sin(ang + 0.4));
  ctx.closePath();
  ctx.fill();
}
