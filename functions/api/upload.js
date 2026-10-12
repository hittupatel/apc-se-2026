// POST /api/upload  (multipart/form-data)
//   code   event code
//   name   uploader name (optional)
//   caption (optional)
//   photo  full image (JPEG, already resized in the browser)
//   thumb  small preview (JPEG)
// Stores both under pending/ until an admin approves them.
import { json, clean } from "./_util.js";

const MAX_PHOTO = 15 * 1024 * 1024;
const MAX_THUMB = 1 * 1024 * 1024;

export async function onRequestPost({ request, env }) {
  if (!env.MOMENTS) return json({ error: "Storage is not configured." }, 500);
  let form;
  try { form = await request.formData(); } catch { return json({ error: "Could not read the upload." }, 400); }

  const code = clean(form.get("code"), 40).toUpperCase();
  if (!env.EVENT_CODE || code !== String(env.EVENT_CODE).trim().toUpperCase())
    return json({ error: "That event code isn't right. Ask at the check-in desk." }, 403);

  const photo = form.get("photo");
  const thumb = form.get("thumb");
  if (!(photo instanceof File) || !photo.size) return json({ error: "Please choose a photo." }, 400);
  if (!/^image\//.test(photo.type)) return json({ error: "Only photos can be shared here." }, 400);
  if (photo.size > MAX_PHOTO) return json({ error: "That photo is too large (15 MB max)." }, 413);
  if (thumb instanceof File && thumb.size > MAX_THUMB) return json({ error: "Preview too large." }, 413);

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8).padEnd(6, "0")}`;
  const meta = {
    name: clean(form.get("name"), 60),
    caption: clean(form.get("caption"), 140),
    uploaded: new Date().toISOString(),
  };
  const type = photo.type === "image/png" ? "image/png" : "image/jpeg";
  await env.MOMENTS.put(`pending/${id}.jpg`, await photo.arrayBuffer(), { httpMetadata: { contentType: type }, customMetadata: meta });
  if (thumb instanceof File && thumb.size) {
    await env.MOMENTS.put(`pending/${id}_t.jpg`, await thumb.arrayBuffer(), { httpMetadata: { contentType: "image/jpeg" } });
  }
  return json({ ok: true, id, message: "Thank you! Your photo will appear once it's approved." });
}

export const onRequest = () => json({ error: "Use POST." }, 405);
