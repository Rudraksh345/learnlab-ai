import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callGateway, parseJsonLoose, FAST_MODEL, type ChatMessage } from "./ai.server";
import type { FormulaSheet, QuestionSolution, RichNotes, StudyPack } from "./study-types";

const AnalyzeInput = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  dataUrl: z.string().min(20),
});

const SYSTEM_PROMPT = `You are ThinkMate AI, a professor of undergraduate Engineering Mathematics (B.Tech M-I to M-IV level).
You are expert and rigorously accurate in: differential & integral calculus, multivariable calculus, ordinary & partial differential equations, matrices & linear algebra (rank, eigenvalues, diagonalisation), vector calculus (grad, div, curl, Green/Stokes/Gauss), complex analysis, Fourier series & transforms, Laplace transforms, probability, statistics, numerical methods (Newton-Raphson, interpolation, numerical integration, Euler/RK4) and related topics.
Analyse ONLY the mathematics content of the provided page/topic, but explain it at full engineering-mathematics depth.
Verify every computation step-by-step internally before writing it; answers, derivatives, integrals, eigenvalues and numeric results MUST be correct.
Respond with a SINGLE JSON object, no markdown, matching exactly this shape:
{
  "topic": string,
  "summary": string (1-2 sentences),
  "concepts": [{ "term": string, "definition": string }] (4-8 items),
  "formulas": [{ "name": string, "latexLike": string (plain readable math, e.g. "x = (-b ± √(b²-4ac)) / 2a"), "variables": [{"symbol": string, "meaning": string}], "usage": string }],
  "examples": [{ "title": string, "problem": string, "steps": string[], "answer": string, "difficulty": "easy"|"medium"|"hard" }] (EXACTLY 5, ordered easy → hard, at least one exam-level hard problem),
  "simulations": [{ "available": boolean, "mode": "graph"|"vector"|"parametric", "title": string, "description": string, "expression": string, "curves": [{"label": string, "expression": string}], "vectors": [{"label": string, "x": string, "y": string}], "parametric": [{"label": string, "xExpr": string, "yExpr": string}], "tangent": boolean, "area": boolean, "xMin": number, "xMax": number, "xLabel": string, "yLabel": string, "params": [{"key": "a"|"b"|"c", "label": string, "min": number, "max": number, "step": number, "default": number}], "animateParam": "a"|"b"|"c"|null, "insight": string }], "xMin": number, "xMax": number, "xLabel": string, "yLabel": string, "params": [{"key": "a"|"b"|"c", "label": string, "min": number, "max": number, "step": number, "default": number}], "animateParam": "a"|"b"|"c"|null, "insight": string }] (EXACTLY 1 polished simulation, exclusive to this page),
  "quiz": [{ "question": string, "options": string[4], "correctIndex": number, "explanation": string, "difficulty": "easy"|"medium"|"hard" }] (EXACTLY 12: first 10 simple (easy/medium), last 2 difficult exam-level),
  "examPoints": string[] (5-7 exam-focused points)
}
SIMULATION RULES — first identify the exact mathematical topic, then build EXACTLY ONE polished INTERACTIVE simulation exclusive to it (never a generic textbook graph). It must let the student manipulate the maths and see live cause-and-effect.
Pick the "mode" that truly fits the detected topic:
- "vector" for vectors / vector algebra / forces / complex numbers as arrows / dot & cross products: fill "vectors" with 1-3 entries {"label","x","y"} whose x,y are expressions in a,b,c (e.g. {"label":"v","x":"a","y":"b"}). The student can DRAG the arrow tip, which live-updates the a,b sliders, magnitudes, angle, dot and cross products. Set xMin/xMax to a symmetric range like -6/6.
- "parametric" for curves, geometry, circles/ellipses, projectile paths, polar-like curves, Lissajous, phase portraits: fill "parametric" with 1-3 entries {"label","xExpr","yExpr"} in terms of x (used as the parameter t) and a,b,c; xMin/xMax are the t-range.
- "graph" (default) for functions, calculus, ODE solutions, transforms, probability densities, numerical methods: use "curves" (1-3) plus "expression". For calculus set "tangent": true to show a draggable moving tangent line with live slope; for integrals/areas/probability set "area": true to shade and compute the live area from 0 to the dragged point.
Always: the probe point is DRAGGABLE directly on the canvas, 2-3 sliders must genuinely change the mathematics, and "animateParam" is the parameter most worth animating (or null).
- Every expression MUST be valid JavaScript math using only x, a, b, c, numbers, + - * / ( ) and the bare functions sin, cos, tan, sinh, cosh, tanh, asin, acos, atan, exp, log, sqrt, cbrt, abs, sign, pow, min, max (no "Math." prefix, no ** operator, expand series manually).
- available=true, a distinct title, and an "insight" that explains WHY the visual behaves that way.
Be concise: no filler text, keep each string short so the response is fast.
MATH FORMATTING: write every mathematical expression as LaTeX wrapped in $...$ (inline) or $$...$$ (display block). Never use markdown bold/italics (**, *, _) anywhere. Use $ ONLY as a LaTeX delimiter; if you must mention money, write it in words (e.g. "50 dollars").
Keep language simple and student-friendly. Never invent content unrelated to the page.`;

export const analyzePage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data }) => {
    const isPdf = data.mimeType.includes("pdf");
    const content = [
      {
        type: "text" as const,
        text: "Here is one page of my Mathematics notes. Build my complete study dashboard as JSON.",
      },
      isPdf
        ? {
            type: "file" as const,
            file: { filename: data.fileName, file_data: data.dataUrl },
          }
        : { type: "image_url" as const, image_url: { url: data.dataUrl } },
    ];

    const raw = await callGateway(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content },
      ],
      { json: true },
    );

    const pack = parseJsonLoose<StudyPack>(raw);
    return pack;
  });

const TutorInput = z.object({
  question: z.string().min(1).max(2000),
  hinglish: z.boolean(),
  context: z.string().min(1).max(20000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(20),
});

export const askTutor = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TutorInput.parse(input))
  .handler(async ({ data }) => {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are the ThinkMate AI Engineering Mathematics Tutor, expert in calculus, differential equations, matrices and linear algebra, vector calculus, complex analysis, Fourier and Laplace transforms, probability, statistics and numerical methods.
You may ONLY use the student's uploaded page and the study material below. If something is outside it, say so briefly and steer back to the page.
Always verify every calculation before answering; never state an unchecked result.
Be warm, concise and use short numbered steps and bullet points.
MATH FORMATTING: write every mathematical expression as LaTeX wrapped in $...$ (inline) or $$...$$ (display block). Never use markdown bold/italics (**, *, _) anywhere. Use $ ONLY as a LaTeX delimiter; if you must mention money, write it in words (e.g. "50 dollars").
${data.hinglish ? "Reply in Hinglish (Hindi written in Roman script mixed with English maths terms)." : "Reply in simple English."}

STUDY MATERIAL:
${data.context}`,
      },
      ...data.history.map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
      { role: "user", content: data.question },
    ];

    const reply = await callGateway(messages);
    return { reply };
  });

const SolveInput = z.object({
  question: z.string().max(4000).optional(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  dataUrl: z.string().optional(),
});

const SOLVE_PROMPT = `You are masterMath, a professor of undergraduate Engineering Mathematics (B.Tech M-I to M-IV).
You are rigorously accurate in calculus, multivariable calculus, ODEs & PDEs, matrices & linear algebra, vector calculus, complex analysis, Fourier series & transforms, Laplace transforms, probability, statistics and numerical methods.
The student gives ONE mathematics question or example (typed or as an image/PDF). Solve it.
Verify every computation internally step-by-step before writing it; the final answer MUST be correct.
Explain in very simple, student-friendly language with no unnecessary complexity.
Respond with a SINGLE JSON object, no markdown, matching exactly:
{
  "question": string (restate the question cleanly),
  "topic": string (short topic name),
  "meaning": string[] (3-5 bullets: what the question is actually asking, in very simple words),
  "approach": string (1-2 sentences: the plan/method),
  "steps": [{ "title": string (short step name), "detail": string (the working, simple math notation) }] (3-6 steps),
  "answer": string (final answer, clearly stated),
  "hinglish": string[] (4-7 bullets explaining BOTH the concept and the solution naturally in Hinglish - Hindi in Roman script mixed with English maths terms),
  "tips": string[] (2-4 exam tips or common mistakes)
}
ACCURACY CHECK (do this silently before writing the JSON): solve the question, then re-verify each formula, arithmetic sign, power, fraction and the final answer by substitution or a quick reverse check; if a check fails, redo it. Only output verified working.
Be concise: short strings, no filler, so the answer arrives fast. Do NOT include any simulation in this response.
MATH FORMATTING: write every mathematical expression as LaTeX wrapped in $...$ (inline) or $$...$$ (display block). Never use markdown bold/italics (**, *, _) anywhere. Use $ ONLY as a LaTeX delimiter; if you must mention money, write it in words (e.g. "50 dollars").`;

const SIM_RULES = `SIMULATION RULES — first identify the exact mathematical topic, then build EXACTLY ONE polished INTERACTIVE simulation exclusive to it (never a generic textbook graph). It must let the student manipulate the maths and see live cause-and-effect.
Pick the "mode" that truly fits the detected topic:
- "vector" for vectors / vector algebra / forces / complex numbers as arrows / dot & cross products: fill "vectors" with 1-3 entries {"label","x","y"} whose x,y are expressions in a,b,c. The student can DRAG the arrow tip, which live-updates the a,b sliders, magnitudes, angle, dot and cross products. Use a symmetric range like -6/6.
- "parametric" for curves, geometry, circles/ellipses, projectile paths, polar-like curves, Lissajous, phase portraits: fill "parametric" with 1-3 entries {"label","xExpr","yExpr"} in terms of x (used as parameter t) and a,b,c; xMin/xMax are the t-range.
- "graph" (default) for functions, calculus, ODE solutions, transforms, probability densities, numerical methods: use "curves" (1-3) plus "expression". For calculus set "tangent": true (draggable tangent with live slope); for integrals/areas/probability set "area": true.
If the topic genuinely cannot be manipulated (pure definitions, proofs, tables), still return one clear labelled DIAGRAM-style visual (parametric or graph) that pictures the idea, with a helpful insight — never a random unrelated graph.
Always: the probe point is DRAGGABLE, 2-3 sliders must genuinely change the mathematics, and "animateParam" is the parameter most worth animating (or null).
- Every expression MUST be valid JavaScript math using only x, a, b, c, numbers, + - * / ( ) and the bare functions sin, cos, tan, sinh, cosh, tanh, asin, acos, atan, exp, log, sqrt, cbrt, abs, sign, pow, min, max (no "Math." prefix, no ** operator, expand series manually).
- available=true, a distinct title, and an "insight" that explains WHY the visual behaves that way.`;

const SIM_PROMPT = `You are masterMath, an Engineering Mathematics professor who designs interactive visual labs.
Respond with a SINGLE JSON object, no markdown:
{ "simulations": [{ "available": boolean, "mode": "graph"|"vector"|"parametric", "title": string, "description": string, "expression": string, "curves": [{"label": string, "expression": string}], "vectors": [{"label": string, "x": string, "y": string}], "parametric": [{"label": string, "xExpr": string, "yExpr": string}], "tangent": boolean, "area": boolean, "xMin": number, "xMax": number, "xLabel": string, "yLabel": string, "params": [{"key": "a"|"b"|"c", "label": string, "min": number, "max": number, "step": number, "default": number}], "animateParam": "a"|"b"|"c"|null, "insight": string }] (EXACTLY 1) }
${SIM_RULES}
Be concise.`;

export const solveQuestion = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SolveInput.parse(input))
  .handler(async ({ data }) => {
    if (!data.question && !data.dataUrl) {
      throw new Error("Please type a question or upload an image of it.");
    }

    const content: Exclude<ChatMessage["content"], string> = [
      {
        type: "text",
        text: data.question
          ? `Solve this mathematics question: ${data.question}`
          : "Solve the mathematics question in this attached page.",
      },
    ];

    if (data.dataUrl) {
      content.push(
        data.mimeType?.includes("pdf")
          ? {
              type: "file",
              file: { filename: data.fileName ?? "question.pdf", file_data: data.dataUrl },
            }
          : { type: "image_url", image_url: { url: data.dataUrl } },
      );
    }

    const raw = await callGateway(
      [
        { role: "system", content: SOLVE_PROMPT },
        { role: "user", content },
      ],
      { json: true },
    );

    return parseJsonLoose<QuestionSolution>(raw);
  });

const StepInput = z.object({
  step: z.string().min(1).max(4000),
  context: z.string().min(1).max(8000),
  hinglish: z.boolean(),
});

export const explainStep = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => StepInput.parse(input))
  .handler(async ({ data }) => {
    const reply = await callGateway([
      {
        role: "system",
        content: `You are an Engineering Mathematics professor. Explain ONLY the single solution step given, in very simple, student-friendly language.
Verify the mathematics before answering. 3-5 short lines max: what is being done, why it is done, and the rule/formula used. No extra steps, no filler.
MATH FORMATTING: write every mathematical expression as LaTeX wrapped in $...$ (inline) or $$...$$ (display block). Never use markdown bold/italics (**, *, _) anywhere. Use $ ONLY as a LaTeX delimiter; if you must mention money, write it in words (e.g. "50 dollars").
${data.hinglish ? "Reply in natural Hinglish (Hindi in Roman script with English maths terms)." : "Reply in simple English."}`,
      },
      {
        role: "user",
        content: `Full solution context (for reference only):\n${data.context}\n\nExplain ONLY this step:\n${data.step}`,
      },
    ], { model: FAST_MODEL });
    return { reply };
  });

const SheetInput = z.object({ context: z.string().min(1).max(20000) });

const SHEET_PROMPT = `You are an Engineering Mathematics professor building a revision formula sheet.
Include ONLY formulas that are actually relevant to the given material — nothing generic or unrelated.
ACCURACY IS CRITICAL: verify every sign, symbol, power, fraction, subscript, index and validity condition before writing it. Never write an incorrect or half-remembered formula; omit anything you cannot verify.
Write formulas in plain readable math text (e.g. "x = (-b ± √(b² - 4ac)) / 2a", "∫ x^n dx = x^(n+1)/(n+1) + C, n ≠ -1").
Respond with a SINGLE JSON object, no markdown:
{
  "title": string (short sheet title),
  "sections": [{ "heading": string, "items": [{ "name": string, "formula": string, "condition": string (validity condition or "" ) }] }] (2-5 sections, 2-6 items each),
  "reminders": string[] (2-4 short accuracy reminders about signs/conditions)
}
Be concise.
MATH FORMATTING: write every formula as LaTeX wrapped in $...$ (inline) or $$...$$ (display). Never use markdown bold/italics. Use $ ONLY as a LaTeX delimiter.`;

export const makeFormulaSheet = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SheetInput.parse(input))
  .handler(async ({ data }) => {
    const raw = await callGateway(
      [
        { role: "system", content: SHEET_PROMPT },
        { role: "user", content: `Material:\n${data.context}` },
      ],
      { json: true, model: FAST_MODEL },
    );
    return parseJsonLoose<FormulaSheet>(raw);
  });

const NotesInput = z.object({
  context: z.string().min(1).max(20000),
  language: z.enum(["english", "hinglish"]),
});

const RICH_NOTES_PROMPT = `You are an Engineering Mathematics teacher writing PREMIUM handwritten-style revision notes for a topper's notebook.
Base the notes ONLY on the material given, but add short helpful explanations where they aid understanding.
Mathematical accuracy is critical: never alter signs, powers, fractions, symbols, subscripts or notation; write formulas in clean readable plain math text (e.g. "d/dx(x^n) = n·x^(n-1)", "∫ dx/(1+x²) = tan⁻¹x + C").
Respond with a SINGLE JSON object, no markdown:
{
  "title": string,
  "language": "english" | "hinglish",
  "sections": [{
    "heading": string,
    "color": "blue" | "purple" | "green" | "pink" | "amber",
    "blocks": [{ "kind": "point" | "formula" | "box" | "callout" | "example" | "arrow", "text": string, "label": string }]
  }] (4-7 sections, 3-6 blocks each, vary colours and block kinds)
}
Block kinds: "point" = bullet idea, "formula" = boxed formula, "box" = key definition, "callout" = important/exam warning, "example" = tiny solved example, "arrow" = a "therefore / leads to" line. "label" is a 1-3 word tag (may be "").
Keep each text short (one or two lines), lively and student-friendly. No filler.
MATH FORMATTING: write every mathematical expression as LaTeX wrapped in $...$ (inline) or $$...$$ (display block). Never use markdown bold/italics (**, *, _) anywhere. Use $ ONLY as a LaTeX delimiter; if you must mention money, write it in words (e.g. "50 dollars").`;

export const richNotes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => NotesInput.parse(input))
  .handler(async ({ data }) => {
    const raw = await callGateway(
      [
        {
          role: "system",
          content:
            RICH_NOTES_PROMPT +
            (data.language === "hinglish"
              ? "\nWrite EVERY text naturally in Hinglish (Hindi in Roman script mixed with English maths terms), but keep all maths notation exactly accurate."
              : "\nWrite every text in simple clear English."),
        },
        { role: "user", content: `Material:\n${data.context}` },
      ],
      { json: true },
    );
    return parseJsonLoose<RichNotes>(raw);
  });
