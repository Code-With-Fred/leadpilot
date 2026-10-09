import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Token = z.object({ token: z.string().regex(/^[a-f0-9]{36}$/) });

/** Public: opt a lead out of all future emails. Idempotent; never reveals who the lead is. */
export const unsubscribeByToken = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Token.parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { unsubscribeLead } = await import("./email/unsubscribe.server");
    return { ok: await unsubscribeLead(data.token) };
  });
