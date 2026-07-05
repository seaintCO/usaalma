export function createTextStream(conversationId:string, run: (controller:ReadableStreamDefaultController<Uint8Array>, encoder:TextEncoder) => Promise<void>) {
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`[CONVERSATION_ID:${conversationId}]\n`));

      try {
        await run(controller, encoder);
      } finally {
        controller.close();
      }
    }
  });

  return new Response(readable, {
    headers:{
      "Content-Type":"text/plain; charset=utf-8",
      "Cache-Control":"no-cache",
    },
  });
}
