import type { APIRoute } from "astro";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const phone = url.searchParams.get("phone");

    if (!phone) {
      return json({ exists: false, error: "phone required" }, 400);
    }

    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length === 11 && cleanPhone.startsWith("8")) {
      cleanPhone = "7" + cleanPhone.slice(1);
    }

    if (cleanPhone.length < 10) {
      return json({ exists: false });
    }

    const idInstance = import.meta.env.GREEN_API_INSTANCE;
    const apiToken = import.meta.env.GREEN_API_TOKEN;

    if (!idInstance || !apiToken) {
      return json({ exists: false });
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const waResponse = await fetch(
        `https://api.green-api.com/waInstance${idInstance}/CheckWhatsapp/${apiToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneNumber: Number(cleanPhone) }),
          signal: controller.signal,
        },
      );
      clearTimeout(timeout);

      if (!waResponse.ok) {
        return json({ exists: false });
      }

      const waResult = await waResponse.json();
      return json({ exists: waResult.existsWhatsapp === true });
    } catch (e) {
      console.error("Green API check error:", e);
      return json({ exists: false });
    }
  } catch {
    return json({ exists: false }, 500);
  }
};