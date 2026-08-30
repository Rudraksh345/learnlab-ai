import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callGateway, parseJsonLoose, type ChatMessage } from "./ai.server";
import type { QuestionSolution, StudyPack } from "./study-types";

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
  "notes": string[] (6-10 short, simple bullet notes),
  "concepts": [{ "term": string, "definition": string }] (4-8 items),
  "formulas": [{ "name": string, "latexLike": string (plain readable math, e.g. "x = (-b ± √(b²-4ac)) / 2a"), "variables": [{"symbol": string, "meaning": string}], "usage": string }],
  "examples": [{ "title": string, "problem": string, "steps": string[], "answer": string, "difficulty": "easy"|"medium"|"hard" }] (EXACTLY 5, ordered easy → hard, at least one exam-level hard problem),
  "simulation": { "available": boolean, "title": string, "description": string, "expression": string, "curves": [{"label": string, "expression": string}], "xMin": number, "xMax": number, "xLabel": string, "yLabel": string, "params": [{"key": "a"|"b"|"c", "label": string, "min": number, "max": number, "step": number, "default": number}], "animateParam": "a"|"b"|"c"|null, "insight": string },
  "quiz": [{ "question": string, "options": string[4], "correctIndex": number, "explanation": string, "difficulty": "easy"|"medium"|"hard" }] (EXACTLY 10, mixed difficulty),
  "examPoints": string[] (5-7 exam-focused points)
}
SIMULATION RULES — be intelligent and always try to build a meaningful one:
- Identify the concept and choose the most instructive 2D visualisation, e.g. a function and its derivative/integral, solution curves of an ODE for varying constants, a Fourier partial sum vs the target wave, a Taylor polynomial vs the true function, a damped oscillator, a probability density, Newton-Raphson iteration curve, or a transformed vector-field cross-section.
- Use "curves" (1-3 entries) to plot related functions together (e.g. {"label":"f(x)"} and {"label":"f'(x)"}), and set "expression" to the primary curve too.
- Every expression MUST be valid JavaScript math using only x, a, b, c, numbers, + - * / ( ) and the bare functions sin, cos, tan, sinh, cosh, tanh, asin, acos, atan, exp, log, sqrt, cbrt, abs, sign, pow, min, max (no "Math." prefix, no ** operator, no summation/integral notation — expand series manually).
- Give 1-3 sliders whose parameters genuinely change the mathematics, and set "animateParam" to the parameter most worth animating (or null).
- Only set available=false when no 2D graph could possibly help; then expression="", curves=[] and params=[].
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
Be warm, concise and use short numbered steps, bullet points and simple math notation.
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
