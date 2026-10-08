export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/puente" && request.method === "POST") {
      return guardarPuente(request, env);
    }

    if (url.pathname.startsWith("/api/")) {
      return reenviar(request, env, url);
    }

    return env.ASSETS.fetch(request);
  },
};

async function guardarPuente(request, env) {
  const secreto = request.headers.get("x-puente-secreto") || "";
  if (!env.PUENTE_SECRETO || secreto !== env.PUENTE_SECRETO) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  let cuerpo;
  try {
    cuerpo = await request.json();
  } catch {
    return Response.json({ error: "Falta la dirección" }, { status: 400 });
  }

  const puente = String(cuerpo.url || "").trim().replace(/\/$/, "");
  let destino;
  try {
    destino = new URL(puente);
  } catch {
    return Response.json({ error: "Dirección inválida" }, { status: 400 });
  }
  if (destino.protocol !== "https:" || !destino.hostname.endsWith(".trycloudflare.com")) {
    return Response.json({ error: "Dirección inválida" }, { status: 400 });
  }

  await env.DATOS.put("url", destino.origin);
  return Response.json({ ok: true, url: destino.origin });
}

async function reenviar(request, env, url) {
  const puente = await env.DATOS.get("url");
  if (!puente) {
    return Response.json(
      { error: "El computador de la mina todavía no está conectado." },
      { status: 503 },
    );
  }

  const destino = new URL(url.pathname + url.search, puente);
  const respuesta = await fetch(destino.toString(), { method: "GET" });
  const headers = new Headers(respuesta.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  return new Response(respuesta.body, { status: respuesta.status, headers });
}
