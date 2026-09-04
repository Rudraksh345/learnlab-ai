const MODEL = "google/gemini-3.7-flash";
/** Small, very fast model for short helper calls (step explains, sheets, notes). */
export const FAST_MODEL = "google/gemini-3.1-flash-lite";

export type Block =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | Block[];
};

export async function callGateway(
  messages: ChatMessage[],
  opts: { json?: boolean; model?: string } = {}
): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    throw new Error("AI is not configured for this app yet.");
  }

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
    },
    body: JSON.stringify({
      model: opts.model ?? MODEL,
      messages,
      service_tier: "priority",
      temperature: 0.2,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("Too many requests right now. Please wait a moment and try again.");
    }
    if (res.status === 402) {
      throw new Error("AI credits are exhausted. Please add credits to continue.");
    }
    const detail = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("The AI returned an empty response. Please try again.");
  return text;
}

export function parseJsonLoose<T>(raw: string): T {
  let cleaned = raw.trim();

  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }

  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }

  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    }
    throw new Error("Could not read the AI response. Please try again.");
  }
}
