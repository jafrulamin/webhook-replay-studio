import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src";

describe("Webhook Replay Studio API", () => {
  it("returns 404 for unknown routes", async () => {
    const request = new Request("http://localhost/unknown-route", {
      method: "GET",
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(404);
  });

  // Note: API route tests require D1 database setup.
  // For full testing, run the dev server and test manually:
  //   npm run dev
  //   curl http://127.0.0.1:8787/api/inboxes
});
