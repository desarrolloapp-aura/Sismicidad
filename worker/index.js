import prueba from "./datos-prueba.json";

const MAX_RESPALDO = 5 * 1024 * 1024;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/puente" && request.method === "POST") {
      return guardarPuente(request, env);
    }

    if (url.pathname === "/api/respaldo" && request.method === "POST") {
      return guardarRespaldo(request, env);
    }

    if (url.pathname.startsWith("/api/")) {
      return reenviar(request, env, url);
    }

    return env.ASSETS.fetch(request);
  },
};

function autorizado(request, env) {
  const secreto = request.headers.get("x-puente-secreto") || "";
  return Boolean(env.PUENTE_SECRETO) && secreto === env.PUENTE_SECRETO;
}

async function guardarPuente(request, env) {
  if (!autorizado(request, env)) {
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

async function guardarRespaldo(request, env) {
  if (!autorizado(request, env)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const texto = await request.text();
  if (texto.length > MAX_RESPALDO) {
    return Response.json({ error: "Respaldo demasiado grande" }, { status: 413 });
  }

  let cuerpo;
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    return Response.json({ error: "Respaldo inválido" }, { status: 400 });
  }
  const reporte = cuerpo?.reporte;
  if (!reporte || !Array.isArray(reporte.sectores) || !Array.isArray(cuerpo.filas)) {
    return Response.json({ error: "Respaldo inválido" }, { status: 400 });
  }

  const respaldo = { recibido: new Date().toISOString(), reporte, filas: cuerpo.filas };
  await env.DATOS.put("respaldo", JSON.stringify(respaldo));
  return Response.json({ ok: true, filas: cuerpo.filas.length });
}

async function reenviar(request, env, url) {
  const puente = await env.DATOS.get("url");
  if (puente) {
    try {
      const destino = new URL(url.pathname + url.search, puente);
      const respuesta = await fetch(destino.toString(), { method: "GET" });
      if (respuesta.ok) {
        const headers = new Headers(respuesta.headers);
        headers.delete("content-encoding");
        headers.delete("content-length");
        return new Response(respuesta.body, { status: respuesta.status, headers });
      }
    } catch {
      /* el computador de la mina no respondió */
    }
  }

  const respaldo = await env.DATOS.get("respaldo", { type: "json", cacheTtl: 60 });
  if (respaldo) return desdeRespaldo(respaldo, url);
  return copiaDePrueba(url);
}

function desdeRespaldo(respaldo, url) {
  if (url.pathname === "/api/sectores/estado-actual" || url.pathname === "/api/sectores/forzar-update") {
    return Response.json({ ...respaldo.reporte, fuente: "respaldo", respaldo_recibido: respaldo.recibido });
  }

  const tendencia = url.pathname.match(/^\/api\/sectores\/(.+)\/tendencia$/);
  if (tendencia) {
    const nombre = decodeURIComponent(tendencia[1]).toLowerCase();
    return Response.json(respaldo.filas.filter((fila) => String(fila.nombre).toLowerCase() === nombre));
  }

  if (url.pathname === "/api/sectores/historial") {
    const sector = (url.searchParams.get("sector") || "").toLowerCase();
    const estado = url.searchParams.get("estado") || "";
    const page = Math.max(1, Number.parseInt(url.searchParams.get("page"), 10) || 1);
    const pageSize = Math.min(500, Math.max(1, Number.parseInt(url.searchParams.get("page_size"), 10) || 50));
    const datos = respaldo.filas
      .filter((fila) => !sector || String(fila.nombre).toLowerCase().includes(sector))
      .filter((fila) => !estado || fila.estado === estado)
      .sort((a, b) => String(b.timestamp_scraping).localeCompare(String(a.timestamp_scraping)));
    return Response.json({
      total: datos.length,
      page,
      page_size: pageSize,
      datos: datos.slice((page - 1) * pageSize, page * pageSize),
    });
  }

  return Response.json({ error: "Sin conexión con la mina" }, { status: 503 });
}

function copiaDePrueba(url) {
  if (url.pathname === "/api/sectores/estado-actual" || url.pathname === "/api/sectores/forzar-update") {
    return Response.json(prueba);
  }
  if (url.pathname.endsWith("/tendencia")) {
    return Response.json([]);
  }
  return Response.json({ total: 0, page: 1, page_size: 50, datos: [] });
}
