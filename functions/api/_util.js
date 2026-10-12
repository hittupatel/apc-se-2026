// Shared helpers for the Moments API (Cloudflare Pages Functions).
// Bindings / variables (set in the Pages project settings):
//   MOMENTS      R2 bucket binding
//   EVENT_CODE   code delegates enter to upload (case-insensitive)
//   ADMIN_TOKEN  secret for the approval page

export const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });

export const isAdmin = (request, env) => {
  const h = request.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  return !!env.ADMIN_TOKEN && token.length > 0 && token === env.ADMIN_TOKEN;
};

export const clean = (s, max) => String(s || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, max);

// keys look like: pending/<id>.jpg  pending/<id>_t.jpg  approved/<id>.jpg  approved/<id>_t.jpg
export const ID_RE = /^[0-9]{13}-[a-z0-9]{6}$/;
