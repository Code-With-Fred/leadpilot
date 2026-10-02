import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { consumeCredit, extractJson, runModel } from "./ai.server";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

const Input = z.object({
  businessType: z.string().trim().min(2).max(120),
  location: z.string().trim().min(2).max(120),
  onlyNoWebsite: z.boolean().default(false),
});

export type Prospect = {
  placeId: string;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviews: number;
  category: string | null;
  mapsUrl: string | null;
  fit: number;
  reasons: string[];
  opener: string;
  alreadySaved: boolean;
};

type Place = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  primaryTypeDisplayName?: { text?: string };
  googleMapsUri?: string;
};

export const findProspects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true; prospects: Prospect[] } | { ok: false; error: string }> => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
    if (!lovableKey || !mapsKey) return { ok: false, error: "Business search isn't connected yet." };

    const gate = await consumeCredit(context.supabase as never, "discovery");
    if (!gate.ok) return gate;

    const res = await fetch(`${GATEWAY_URL}/places/v1/places:searchText`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": mapsKey,
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.businessStatus,places.primaryTypeDisplayName,places.googleMapsUri",
      },
      body: JSON.stringify({ textQuery: `${data.businessType} in ${data.location}`, pageSize: 20 }),
    });
    if (!res.ok) {
      console.error("Places search failed", res.status, await res.text().catch(() => ""));
      if (res.status === 429) return { ok: false, error: "Too many searches right now. Please wait a minute and try again." };
      return { ok: false, error: "Business search failed. Please try again in a moment." };
    }
    const json = (await res.json()) as { places?: Place[] };
    let places = (json.places ?? []).filter((p) => p.businessStatus !== "CLOSED_PERMANENTLY" && p.displayName?.text);
    if (data.onlyNoWebsite) places = places.filter((p) => !p.websiteUri);
    if (!places.length) return { ok: true, prospects: [] };

    const { data: saved } = await context.supabase.from("leads").select("place_id").in("place_id", places.map((p) => p.id));
    const savedIds = new Set((saved ?? []).map((r) => r.place_id));

    // Facts only — the AI judges fit from these real listing details.
    const facts = places.map((p, i) => ({
      i,
      name: p.displayName?.text,
      category: p.primaryTypeDisplayName?.text ?? null,
      address: p.formattedAddress,
      hasWebsite: !!p.websiteUri,
      website: p.websiteUri ?? null,
      hasPhone: !!(p.internationalPhoneNumber || p.nationalPhoneNumber),
      rating: p.rating ?? null,
      reviewCount: p.userRatingCount ?? 0,
    }));
    const prompt = `${gate.business}You are qualifying real businesses found on Google Maps as prospects for the seller above.
For each business, judge how likely it needs the seller's service, using ONLY the listing facts given (website present or not, reviews, rating, category). Do not invent facts about the business. Active businesses with many reviews but no website are strong signals for web/digital services.
Return JSON: {"results":[{"i":0,"fit":0-100,"reasons":["short factual reason", "..."],"opener":"one-sentence personalized DM opener referencing a real listing fact"}]} — one entry per business, max 3 reasons each.

Businesses:
${JSON.stringify(facts)}`;
    const out = await runModel(prompt, lovableKey, { json: true, effort: "low" });
    const scored = out.ok ? extractJson<{ results?: { i: number; fit: number; reasons?: string[]; opener?: string }[] }>(out.text)?.results ?? [] : [];
    const byI = new Map(scored.map((r) => [r.i, r]));

    const prospects: Prospect[] = places.map((p, i) => {
      const s = byI.get(i);
      const fallbackReasons = [
        p.websiteUri ? "Has a website" : "No website listed on Google",
        `${p.userRatingCount ?? 0} Google reviews${p.rating ? `, ${p.rating}★` : ""}`,
      ];
      return {
        placeId: p.id,
        name: p.displayName?.text ?? "",
        address: p.formattedAddress ?? "",
        phone: p.internationalPhoneNumber ?? p.nationalPhoneNumber ?? null,
        website: p.websiteUri ?? null,
        rating: p.rating ?? null,
        reviews: p.userRatingCount ?? 0,
        category: p.primaryTypeDisplayName?.text ?? null,
        mapsUrl: p.googleMapsUri ?? null,
        fit: Math.max(0, Math.min(100, Math.round(Number(s?.fit) || 0))),
        reasons: (s?.reasons?.length ? s.reasons : fallbackReasons).slice(0, 3).map(String),
        opener: String(s?.opener ?? ""),
        alreadySaved: savedIds.has(p.id),
      };
    });
    prospects.sort((a, b) => b.fit - a.fit);
    return { ok: true, prospects };
  });
