// POST /api/moderate   (admin only, Bearer token)
//   { "id": "<id>", "action": "approve" | "reject" | "unpublish" }
// approve:   pending/ -> approved/
// reject:    delete from pending/
// unpublish: delete from approved/ (take a published photo down)
import { json, isAdmin, ID_RE } from "./_util.js";

async function move(env, from, to) {
  const obj = await env.MOMENTS.get(from);
  if (!obj) return false;
  await env.MOMENTS.put(to, await obj.arrayBuffer(), { httpMetadata: obj.httpMetadata, customMetadata: obj.customMetadata });
  await env.MOMENTS.delete(from);
  return true;
}

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: "Not allowed." }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Bad request." }, 400); }
  const id = String(body.id || "");
  if (!ID_RE.test(id)) return json({ error: "Unknown photo." }, 400);

  if (body.action === "approve") {
    const ok = await move(env, `pending/${id}.jpg`, `approved/${id}.jpg`);
    await move(env, `pending/${id}_t.jpg`, `approved/${id}_t.jpg`);
    return ok ? json({ ok: true }) : json({ error: "Photo not found." }, 404);
  }
  if (body.action === "reject") {
    await env.MOMENTS.delete([`pending/${id}.jpg`, `pending/${id}_t.jpg`]);
    return json({ ok: true });
  }
  if (body.action === "unpublish") {
    await env.MOMENTS.delete([`approved/${id}.jpg`, `approved/${id}_t.jpg`]);
    return json({ ok: true });
  }
  return json({ error: "Unknown action." }, 400);
}
