const OUT_OF_SCOPE_REQUEST_PATTERNS = [
  /\b(?:ignore|disregard|override|bypass)\b.{0,80}\b(?:instruction|rule|prompt|policy)\b/i,
  /\b(?:system|developer|hidden)\s+prompt\b/i,
  /\b(?:jailbreak|prompt injection|dan mode)\b/i,
  /\b(?:write|generate|create|debug|review)\b.{0,40}\b(?:code|program|script|essay|poem|story|song|recipe)\b/i,
  /\b(?:solve|answer)\b.{0,40}\b(?:math|homework|exam|quiz|riddle|trivia)\b/i,
  /\b(?:what(?:'s| is)|tell me)\s+(?:\d+\s*[+\-*/]\s*\d+|\d+\s*\+\s*\d+)\b/i,
  /\b\d+\s*[+\-*/]\s*\d+\b/,
  /\b(?:who is the president|capital of|weather(?: forecast)?|sports? scores?|stock prices?|bitcoin|crypto(?:currency)?)\b/i,
];

const SAFE_FALLBACK_ASSISTANT_MESSAGE =
  'Hi! I can help with Coach Johnson Realty listings, rentals, buying, selling, leasing, property management, showings, and how to contact our team. What would you like to know?';

export function needsChatbotScopeRefusal(message: string) {
  return OUT_OF_SCOPE_REQUEST_PATTERNS.some((pattern) => pattern.test(message));
}

export function sanitizeAssistantOutput(text: string) {
  const cleaned = text
    .replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, '')
    .replace(/```(?:thinking|reasoning)[\s\S]*?```/gi, '')
    .trim();

  const leakMarkers = [
    /here's a thinking process/i,
    /thinking process:/i,
    /\*\*analyze user input\*\*/i,
    /\*\*check rules\*\*/i,
    /hidden instructions/i,
  ];
  if (!leakMarkers.some((pattern) => pattern.test(cleaned))) {
    return cleaned;
  }

  const afterFence =
    cleaned
      .split(/<\/think>/i)
      .pop()
      ?.trim() ?? '';
  if (
    afterFence &&
    afterFence !== cleaned &&
    !leakMarkers.some((pattern) => pattern.test(afterFence))
  ) {
    return afterFence;
  }

  const finalAnswer = cleaned.match(
    /(?:final answer|visitor-facing answer|reply(?: to the visitor)?)\s*[:-]\s*([\s\S]+)$/i,
  );
  if (finalAnswer?.[1]?.trim() && finalAnswer[1].trim().length > 12) {
    return finalAnswer[1].trim();
  }

  return SAFE_FALLBACK_ASSISTANT_MESSAGE;
}
