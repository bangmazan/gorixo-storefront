import type { APIRoute } from "astro";
// Astro v7 / @astrojs/cloudflare v14: binding lewat `cloudflare:workers`.
import { env } from "cloudflare:workers";

export const prerender = false;

const GITHUB_OWNER = "bangmazan";
const GITHUB_TEMPLATE_REPO = "waas-base-premium";
const GEMINI_MODEL = "gemini-2.5-flash";

interface OrderRow {
  id: number;
  business_name: string;
  description: string | null;
}

export const POST: APIRoute = async ({ request }) => {
  const db = env.gorixo_db as D1Database | undefined;

  if (!db) {
    return Response.json(
      { success: false, error: "Binding D1 (gorixo_db) tidak tersedia." },
      { status: 500 },
    );
  }

  // --- 1. Ambil & validasi order_id dari body request ---
  let order_id: unknown;
  try {
    const body = (await request.json()) as { order_id?: unknown };
    order_id = body?.order_id;
  } catch {
    return Response.json(
      { success: false, error: "Body harus JSON: { order_id }." },
      { status: 400 },
    );
  }

  const id = Number(order_id);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json(
      { success: false, error: "order_id tidak valid." },
      { status: 400 },
    );
  }

  // --- 2. Ambil baris data dari D1 ---
  const order = await db
    .prepare(
      "SELECT id, business_name, description FROM orders WHERE id = ?1 LIMIT 1",
    )
    .bind(id)
    .first<OrderRow>();

  if (!order) {
    return Response.json(
      { success: false, error: `Order #${id} tidak ditemukan.` },
      { status: 404 },
    );
  }

  const businessName = order.business_name;
  const businessDesc = order.description ?? "";

  // ------------------------------------------------------------------
  // 3. SKELETON — Generate copywriting index.mdx via Google Gemini API
  // ------------------------------------------------------------------
  // TODO: Inject GEMINI_API_KEY di .env / Cloudflare Dashboard
  const GEMINI_API_KEY = (env as Record<string, unknown>).GEMINI_API_KEY as
    | string
    | undefined;

  const geminiPrompt = [
    "Anda adalah copywriter senior untuk landing page bisnis Indonesia.",
    `Buat konten file index.mdx (Markdown + JSX frontmatter opsional) untuk landing page bisnis berikut.`,
    `Nama bisnis: ${businessName}`,
    `Deskripsi bisnis: ${businessDesc || "(tidak ada deskripsi)"}`,
    "Sertakan: headline hero, subheadline, 3 value proposition, 1 blok tentang, dan 1 call-to-action.",
    "Bahasa Indonesia, tone meyakinkan & profesional. Keluarkan HANYA isi file index.mdx.",
  ].join("\n");

  let generatedMdx = "";
  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY ?? ""}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: geminiPrompt }] }],
          generationConfig: { temperature: 0.8 },
        }),
      },
    );

    // TODO: handle rate limit / error response Gemini secara proper
    const geminiJson = (await geminiRes.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    generatedMdx =
      geminiJson.candidates?.[0]?.content?.parts?.[0]?.text ??
      `# ${businessName}\n\n${businessDesc}\n`;
  } catch (err) {
    console.error("Gemini call gagal (skeleton):", err);
    // Skeleton: lanjut walau gagal — nanti dipakai untuk commit ke repo baru.
    generatedMdx = `# ${businessName}\n\n${businessDesc}\n`;
  }
  // TODO: commit `generatedMdx` sebagai src/pages/index.mdx ke repo hasil generate
  void generatedMdx;

  // ------------------------------------------------------------------
  // 4. SKELETON — Generate repository baru via GitHub REST API
  //    POST https://api.github.com/repos/bangmazan/waas-base-premium/generate
  // ------------------------------------------------------------------
  // TODO: Inject GITHUB_TOKEN
  const GITHUB_TOKEN = (env as Record<string, unknown>).GITHUB_TOKEN as
    | string
    | undefined;

  const newRepoName = `waas-${id}`;

  try {
    const ghRes = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_TEMPLATE_REPO}/generate`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${GITHUB_TOKEN ?? ""}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "gorixo-automation",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner: GITHUB_OWNER,
          name: newRepoName,
          description: `WaaS storefront untuk ${businessName} (order #${id})`,
          include_all_branches: false,
          private: true,
        }),
      },
    );

    // TODO: handle error / conflict (nama repo sudah ada) & retry
    if (!ghRes.ok) {
      console.error(
        "GitHub generate gagal (skeleton):",
        ghRes.status,
        await ghRes.text(),
      );
    }
  } catch (err) {
    console.error("GitHub call gagal (skeleton):", err);
  }

  // ------------------------------------------------------------------
  // 5. Update status order -> "Siap Dieksekusi"
  // ------------------------------------------------------------------
  await db
    .prepare("UPDATE orders SET status = ?1 WHERE id = ?2")
    .bind("Siap Dieksekusi", id)
    .run();

  return Response.json({ success: true });
};
