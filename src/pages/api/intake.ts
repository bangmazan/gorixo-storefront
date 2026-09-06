import type { APIRoute } from "astro";
// Astro v7 / @astrojs/cloudflare v14: binding diakses lewat `cloudflare:workers`
// (menggantikan `Astro.locals.runtime.env` yang dihapus sejak Astro v6).
import { env } from "cloudflare:workers";

export const prerender = false;

const FALLBACK_CS_NUMBER = "6281234567890";

export const POST: APIRoute = async ({ request, redirect }) => {
  const db = env.gorixo_db as D1Database | undefined;

  // --- Tangkap data form POST ---
  const form = await request.formData();
  const business_name = String(form.get("business_name") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const whatsapp_number = String(form.get("whatsapp_number") ?? "").trim();

  if (!business_name || !whatsapp_number) {
    return new Response("business_name dan whatsapp_number wajib diisi.", {
      status: 400,
    });
  }

  if (!db) {
    return new Response(
      "Database D1 (gorixo_db) tidak tersedia pada runtime ini.",
      { status: 500 },
    );
  }

  // --- Insert ke Cloudflare D1 dengan status awal "Menunggu Pembayaran" ---
  try {
    await db
      .prepare(
        `INSERT INTO orders (business_name, description, whatsapp_number, status)
         VALUES (?1, ?2, ?3, ?4)`,
      )
      .bind(
        business_name,
        description || null,
        whatsapp_number,
        "Menunggu Pembayaran",
      )
      .run();
  } catch (err) {
    console.error("Gagal insert order:", err);
    return new Response("Gagal menyimpan data intake.", { status: 500 });
  }

  // --- Generate URL WhatsApp ke nomor CS admin ---
  const csNumber = String(env.CS_WHATSAPP_NUMBER ?? FALLBACK_CS_NUMBER).replace(
    /[^0-9]/g,
    "",
  );

  const message = `Halo, saya ingin memproses website untuk bisnis ${business_name}. Berikut buktinya transfernya:`;
  const waUrl = `https://wa.me/${csNumber}?text=${encodeURIComponent(message)}`;

  // --- Redirect 302 kustomer ke WhatsApp ---
  return redirect(waUrl, 302);
};
