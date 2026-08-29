import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callGateway, parseJsonLoose, type ChatMessage } from "./ai.server";
import type { StudyPack } from "./study-types";

const AnalyzeInput = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  dataUrl: z.string().min(20),
});

const SYSTEM_PROMPT = `You are ThinkMate AI, an expert Mathematics teacher who turns one page of student notes into a complete learning dashboard.
Analyse ONLY the mathematics content visible on the provided page.
Respond with a SINGLE JSON object, no markdown, matching exactly this shape:
{
  "topic": string,
  "summary": string (1-2 sentences),
  "notes": string[] (6-10 short, simple bullet notes),
  "concepts": [{ "term": string, "definition": string }] (4-8 items),
  "formulas": [{ "name": string, "latexLike": string (plain readable math, e.g. "x = (-b ± √(b²-4ac)) / 2a"), "variables": [{"symbol": string, "meaning": string}], "usage": string }],
  "examples": [{ "title": string, "problem": string, "steps": string[], "answer": string }] (2-3 items),
  "simulation": { "available": boolean, "title": string, "description": string, "expression": string, "xMin": number, "xMax": number, "params": [{"key": "a"|"b"|"c", "label": string, "min": number, "max": number, "step": number, "default": number}], "insight": string },
  "quiz": [{ "question": string, "options": string[4], "correctIndex": number, "explanation": string }] (exactly 5),
  "examPoints": string[] (5-7 exam-focused points)
}
Simulation rules: only set available=true when a 2D graph of y = f(x) genuinely helps (e.g. quadratics, lines, trigonometry, exponentials).
"expression" MUST be valid JavaScript math using only x, a, b, c, numbers, + - * / ( ) and Math-free function names sin, cos, tan, exp, log, sqrt, abs, pow.
If a graph does not help, set available=false and leave expression as "" and params as [].
Keep language simple and student-friendly. Never invent content that is not related to the page.`;

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
        content: `You are the ThinkMate AI Math Tutor. You may ONLY use the student's uploaded page and the study material below. If something is outside it, say so briefly and steer back to the page.
Be warm, concise and use short steps, bullet points and simple math notation.
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
