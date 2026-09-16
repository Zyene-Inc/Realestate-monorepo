export const CHATBOT_AI_GATEWAY = Symbol('CHATBOT_AI_GATEWAY');
export const CHATBOT_COOKIE_NAME = 'jr_public_chat';
export const CHATBOT_MODEL = 'openai/gpt-oss-20b';
export const CHATBOT_PROMPT_GUARD_MODEL = 'meta-llama/llama-prompt-guard-2-86m';

export const CHATBOT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const CHATBOT_GLOBAL_DAILY_LIMIT = 45;
export const CHATBOT_VISITOR_DAILY_LIMIT = 12;
export const CHATBOT_GLOBAL_DAILY_LIMIT_MESSAGE =
  'The assistant reached today’s free-model limit. Please contact our team.';
export const CHATBOT_VISITOR_DAILY_LIMIT_MESSAGE =
  'You reached today’s chat limit. Please contact our team for more help.';
export const CHATBOT_HISTORY_LIMIT = 30;
export const CHATBOT_MODEL_HISTORY_LIMIT = 12;

export const CHATBOT_SCOPE_REFUSAL_MESSAGE =
  "I can only help with Coach Johnson Realty's public listings, rentals, buying, selling, leasing, property management, and contact options. For anything else, please contact the appropriate professional.";
