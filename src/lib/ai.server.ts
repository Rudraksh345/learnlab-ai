const MODEL = "gemini-1.5-flash";

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
  opts: { json?: boolean } = {}
): Promise<string> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in Vercel.");
  }

  const contents = messages.map((m) => {
    if (typeof m.content === "string") {
      return {
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      };
    }

    const parts = m.content.map((block) => {
      if (block.type === "text") {
        return { text: block.text };
      }
      if (block.type === "image_url") {
        const base64Data = block.image_url.url.includes(",")
          ? block.image_url.url.split(",")[1]
          : block.image_url.url;
        const mimeType = block.image_url.url.includes(";")
          ? block.image_url.url.split(";")[0].replace("data:", "")
          : "image/png";
        return {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        };
      }
      return { text: "" };
    });

    return {
      role: m.role === "assistant" ? "model" : "user",
      parts,
    };
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: opts.json ? { responseMimeType: "application/json" } : {},
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
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
