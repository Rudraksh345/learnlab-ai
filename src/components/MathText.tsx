import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

type Piece =
  | { t: "text"; v: string }
  | { t: "bold"; v: string }
  | { t: "math"; v: string; display: boolean };

/** Does this look like real LaTeX/math rather than plain prose or money? */
function looksLikeMath(s: string): boolean {
  const body = s.trim();
  if (!body) return false;
  // "$50", "$1,200.50" -> currency, not math
  if (/^[\d,.\s]+$/.test(body)) return false;
  if (/\\[a-zA-Z]+/.test(body)) return true;
  if (/[\^_{}=+\-*/<>]/.test(body)) return true;
  return /^[A-Za-z][A-Za-z0-9]?$/.test(body); // single symbol like $x$
}

function renderKatex(src: string, display: boolean): string | null {
  try {
    return katex.renderToString(src, {
      displayMode: display,
      throwOnError: false,
      strict: false,
      output: "html",
    });
  } catch {
    return null;
  }
}

function parse(input: string): Piece[] {
  const pieces: Piece[] = [];
  let buf = "";
  const push = () => {
    if (buf) pieces.push({ t: "text", v: buf });
    buf = "";
  };

  let i = 0;
  while (i < input.length) {
    const rest = input.slice(i);

    // $$ ... $$   and   \[ ... \]
    let m = /^\$\$([\s\S]+?)\$\$/.exec(rest) || /^\\\[([\s\S]+?)\\\]/.exec(rest);
    if (m) {
      push();
      pieces.push({ t: "math", v: m[1], display: true });
      i += m[0].length;
      continue;
    }

    // \( ... \)
    m = /^\\\(([\s\S]+?)\\\)/.exec(rest);
    if (m) {
      push();
      pieces.push({ t: "math", v: m[1], display: false });
      i += m[0].length;
      continue;
    }

    // $ ... $  — only when the content actually looks like math
    m = /^\$([^$\n]+?)\$/.exec(rest);
    if (m && looksLikeMath(m[1])) {
      push();
      pieces.push({ t: "math", v: m[1], display: false });
      i += m[0].length;
      continue;
    }

    // **bold** (markdown emphasis only, never a lone asterisk / multiplication)
    m = /^\*\*([^\n*][\s\S]*?)\*\*/.exec(rest);
    if (m) {
      push();
      pieces.push({ t: "bold", v: m[1] });
      i += m[0].length;
      continue;
    }

    buf += input[i];
    i += 1;
  }
  push();
  return pieces;
}

/**
 * Renders AI text: markdown/LaTeX *syntax* is converted away, while genuine
 * mathematical symbols, currency and notation are preserved exactly.
 */
export function MathText({ children, className }: { children?: string; className?: string }) {
  const pieces = useMemo(() => parse(children ?? ""), [children]);

  return (
    <span className={className}>
      {pieces.map((p, i) => {
        if (p.t === "bold")
          return (
            <strong key={i} className="font-semibold">
              <MathText>{p.v}</MathText>
            </strong>
          );
        if (p.t === "math") {
          const html = renderKatex(p.v, p.display);
          if (!html) return <span key={i}>{p.v}</span>;
          return (
            <span
              key={i}
              className={p.display ? "my-1 block overflow-x-auto" : "inline-block"}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }
        return <span key={i}>{p.v}</span>;
      })}
    </span>
  );
}

export default MathText;
