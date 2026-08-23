import assert from "node:assert/strict";
import { streamChatbotReply } from "../src/lib/chatbot.ts";

const encoder = new TextEncoder();
const originalFetch = globalThis.fetch;

function responseFromChunks(chunks) {
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
    { status: 200, headers: { "content-type": "text/event-stream" } },
  );
}

try {
  globalThis.fetch = async () =>
    responseFromChunks([
      "event: ready\r",
      "\ndata: {}\r\n\r\nevent: delta\r\ndata: {\"text\":\"Hello \"}\r\n\r\n",
      "event: delta\ndata: {\"text\":\"there\"}\n\nevent: done\ndata: {}\n\n",
    ]);
  let reply = "";
  await streamChatbotReply({
    message: "Hello",
    onDelta: (text) => {
      reply += text;
    },
  });
  assert.equal(reply, "Hello there");

  globalThis.fetch = async () =>
    responseFromChunks([
      'event: error\ndata: {"message":"Daily limit reached"}\n\n',
    ]);
  await assert.rejects(
    streamChatbotReply({ message: "Again", onDelta: () => undefined }),
    /Daily limit reached/,
  );
} finally {
  globalThis.fetch = originalFetch;
}

process.stdout.write("CHATBOT_STREAM_PROTOCOL_VERIFIED\n");

