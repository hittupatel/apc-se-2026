// GET /api/photos            -> approved photos (public), newest first
// GET /api/photos?status=pending  -> pending photos (admin only, Bearer token)
import { json, isAdmin } from "./_util.js";

export async function onRequestGet({ request, env }) {
  if (!env.MOMENTS) return json({ photos: [] });
  const url = new URL(request.url);
  const pending = url.searchParams.get("status") === "pending";
  if (pending && !isAdmin(request, env)) return json({ error: "Not allowed." }, 401);
  const prefix = pending ? "pending/" : "approved/";

  const objects = [];
  let cursor;
  do {
    const page = await env.MOMENTS.list({ prefix, cursor, include: ["customMetadata"] });
    objects.push(...page.objects);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  const keys = new Set(objects.map(o => o.key));
  const photos = objects
    .filter(o => !o.key.endsWith("_t.jpg"))
    .map(o => {
      const id = o.key.slice(prefix.length, -4);
      const thumbKey = `${prefix}${id}_t.jpg`;
      return {
        id,
        full: `/api/img?k=${encodeURIComponent(o.key)}`,
        thumb: `/api/img?k=${encodeURIComponent(keys.has(thumbKey) ? thumbKey : o.key)}`,
        name: o.customMetadata?.name || "",
        caption: o.customMetadata?.caption || "",
        uploaded: o.customMetadata?.uploaded || o.uploaded,
      };
    })
    .sort((a, b) => (a.id < b.id ? 1 : -1));
  return json({ photos });
}
