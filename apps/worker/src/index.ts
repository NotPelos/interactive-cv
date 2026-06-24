// TODO test in Fase 6

const ALLOWED_ORIGIN = "https://notpelos.pages.dev";

export default {
  async fetch(request: Request): Promise<Response> {
    // Only GET allowed
    if (request.method !== "GET") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: {
          "Allow": "GET",
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    return new Response("hello from notpelos worker", {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      },
    });
  },
} satisfies ExportedHandler;
