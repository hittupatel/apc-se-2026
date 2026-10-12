// GET /api/img?k=approved/<id>.jpg   (public)
// GET /api/img?k=pending/<id>.jpg   (admin preview, Bearer token)
import { ID_RE, isAdmin } from "./_util.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const k = url.searchParams.get("k") || "";
  const m = k.match(/^(approved|pending)\/(.+?)(_t)?\.jpg$/);
  if (!m || !ID_RE.test(m[2])) return new Response("Not found", { status: 404 });
  if (m[1] === "pending") {
    if (!isAdmin(request, env)) return new Response("Not allowed", { status: 401 });
  }
  const obj = await env.MOMENTS.get(k);
  if (!obj) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("cache-control", m[1] === "approved" ? "public, max-age=86400" : "private, no-store");
  return new Response(obj.body, { headers });
}
