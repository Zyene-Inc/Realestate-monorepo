const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export type ChatbotMessage = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
};

async function responseError(response: Response) {
  const payload: unknown = await response.json().catch(() => null);
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = payload.message;
    if (typeof message === "string") return message;
    if (Array.isArray(message) && typeof message[0] === "string") {
      return message[0];
    }
  }
  return "The assistant is temporarily unavailable.";
}

export async function chatbotStatus(signal?: AbortSignal) {
  const response = await fetch(`${API_URL}/public/chatbot/status`, {
    credentials: "include",
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(await responseError(response));
  return (await response.json()) as { available: boolean; model: string };
}

export async function chatbotHistory(signal?: AbortSignal) {
  const response = await fetch(`${API_URL}/public/chatbot/history`, {
    credentials: "include",
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(await responseError(response));
  return (await response.json()) as { items: ChatbotMessage[] };
}

type StreamEvent = {
  event: string;
  data: unknown;
};

function parseEvent(block: string): StreamEvent | null {
  let event = "message";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  if (data.length === 0) return null;
  try {
    return { event, data: JSON.parse(data.join("\n")) as unknown };
  } catch {
    return null;
  }
}

function eventMessage(data: unknown) {
  return data &&
    typeof data === "object" &&
    "message" in data &&
    typeof data.message === "string"
    ? data.message
    : "The assistant is temporarily unavailable.";
}

export async function streamChatbotReply(input: {
  message: string;
  signal?: AbortSignal;
  onDelta: (text: string) => void;
}) {
  const timeoutSignal = AbortSignal.timeout(45_000);
  const signal = input.signal
    ? AbortSignal.any([input.signal, timeoutSignal])
    : timeoutSignal;

  try {
    const response = await fetch(`${API_URL}/public/chatbot/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ message: input.message, website: "" }),
      signal,
    });
    if (!response.ok) throw new Error(await responseError(response));
    if (!response.body) throw new Error("The assistant stream was unavailable.");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let streamError: string | null = null;

    const consume = (block: string) => {
      const parsed = parseEvent(block);
      if (!parsed) return;
      if (
        parsed.event === "delta" &&
        parsed.data &&
        typeof parsed.data === "object" &&
        "text" in parsed.data &&
        typeof parsed.data.text === "string"
      ) {
        input.onDelta(parsed.data.text);
      }
      if (parsed.event === "error") streamError = eventMessage(parsed.data);
    };

    while (true) {
      const { done, value } = await reader.read();
      buffer = (buffer + decoder.decode(value, { stream: !done })).replace(
        /\r\n/g,
        "\n",
      );
      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        consume(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf("\n\n");
      }
      if (done) break;
    }
    if (buffer.trim()) consume(buffer);
    if (streamError) throw new Error(streamError);
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error(
        "The assistant took too long to respond. Please try again or contact our team.",
      );
    }
    throw error;
  }
}

export type SubmitWebsiteLeadInput = {
  email: string;
  phone?: string;
  message: string;
  website?: string;
};

export async function submitWebsiteLead(input: SubmitWebsiteLeadInput) {
  const response = await fetch(`${API_URL}/public/chatbot/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      email: input.email,
      phone: input.phone,
      message: input.message,
      website: input.website ?? "",
    }),
  });
  if (!response.ok) throw new Error(await responseError(response));
  return (await response.json()) as { id: string; status: string };
}

export const CHATBOT_LEAD_FORM_THRESHOLD = 3;
export const CHATBOT_LEAD_SUBMITTED_KEY = "jr_chatbot_lead_submitted";
export const CHATBOT_WELCOME_DISMISSED_KEY = "jr_chatbot_welcome_dismissed";
export const CHATBOT_VISITOR_DAILY_LIMIT_MESSAGE =
  "You reached today’s chat limit. Please contact our team for more help.";
export const CHATBOT_GLOBAL_DAILY_LIMIT_MESSAGE =
  "The assistant reached today’s free-model limit. Please contact our team.";
const CHATBOT_BOOKING_INTENT_PATTERN =
  /\b(book|schedule|tour|showing|appointment|contact)\b/i;

export function hasChatbotBookingIntent(message: string) {
  return CHATBOT_BOOKING_INTENT_PATTERN.test(message);
}

export function isChatbotDailyLimitError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("chat limit") ||
    normalized.includes("free-model limit") ||
    normalized.includes("too many requests")
  );
}

export function chatbotDailyLimitMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("free-model limit")) {
    return CHATBOT_GLOBAL_DAILY_LIMIT_MESSAGE;
  }
  return CHATBOT_VISITOR_DAILY_LIMIT_MESSAGE;
}
