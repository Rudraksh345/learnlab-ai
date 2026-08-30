const MODEL = "gemini-2.5-flash";

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

  // Convert ChatMessages to Gemini API structure safely
  const contents = messages.map((m) => {
    const role = m.role === "assistant" ? "model" : "user";

    if (typeof m.content === "string") {
      return {
        role,
        parts: [{ text: m.content || " " }],
      };
    }

    const parts = m.content
      .map((block) => {
        if (block.type === "text") {
          return block.text ? { text: block.text } : null;
        }
        if (block.type === "image_url" && block.image_url?.url) {
          const rawUrl = block.image_url.url;
          const base64Data = rawUrl.includes(",") ? rawUrl.split(",")[1] : rawUrl;
          const mimeType = rawUrl.includes(";")
            ? rawUrl.split(";")[0].replace("data:", "")
            : "image/png";

          return {
            inline_data: {
              mime_type: mimeType,
              data: base64Data,
            },
          };
        }
        return null;
      })
      .filter((part): part is NonNullable<typeof part> => part !== null);

    return {
      role,
      parts: parts.length > 0 ? parts : [{ text: " " }],
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
