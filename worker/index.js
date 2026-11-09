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

    if (url.pathname === "/api/respaldo" && request.method === "GET") {
      return leerRespaldo(request, env);
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

  const previo = await env.DATOS.get("respaldo", { type: "json" });
  const anteriores = Array.isArray(previo?.filas) ? previo.filas : [];
  const filas = reducir(fusionarFilas(anteriores, cuerpo.filas), 300);
  const respaldo = { recibido: new Date().toISOString(), reporte, filas };
  await env.DATOS.put("respaldo", JSON.stringify(respaldo));
  const guardadas = await guardarEnBase(env, filas);
  return Response.json({ ok: true, filas: filas.length, conservadas: anteriores.length, guardadas });
}

async function guardarEnBase(env, filas) {
  if (!env.DB) return 0;
  const porNombre = new Map();
  for (const fila of filas) {
    if (!fila?.nombre || !fila.timestamp_scraping) continue;
    if (!porNombre.has(fila.nombre)) porNombre.set(fila.nombre, []);
    porNombre.get(fila.nombre).push(fila);
  }

  const insertar = env.DB.prepare(
    `INSERT OR IGNORE INTO lecturas
      (nombre, estado, estado_label, frec_24h, mag_min_24h, mag_max_24h, frec_7d, timestamp_scraping)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const pendientes = [];
  for (const [nombre, lista] of porNombre) {
    const ultima = await env.DB.prepare(
      "SELECT MAX(timestamp_scraping) AS ultima FROM lecturas WHERE nombre = ?",
    ).bind(nombre).first();
    const corte = ultima?.ultima || "";
    const nuevas = corte ? lista.filter((fila) => String(fila.timestamp_scraping) > corte) : lista;
    for (const fila of nuevas) {
      pendientes.push(insertar.bind(
        String(fila.nombre),
        fila.estado || "",
        fila.estado_label || "",
        fila.frec_24h ?? null,
        fila.mag_min_24h ?? null,
        fila.mag_max_24h ?? null,
        fila.frec_7d ?? null,
        String(fila.timestamp_scraping),
      ));
    }
  }

  for (let i = 0; i < pendientes.length; i += 50) {
    await env.DB.batch(pendientes.slice(i, i + 50));
  }
  const limite = new Date(Date.now() - 168 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare("DELETE FROM lecturas WHERE timestamp_scraping < ?").bind(limite).run();
  return pendientes.length;
}

async function filasDesdeBase(env, nombre, horas) {
  if (!env.DB) return [];
  const desde = new Date(Date.now() - (horas > 0 ? horas : 168) * 60 * 60 * 1000).toISOString();
  const consulta = await env.DB.prepare(
    `SELECT nombre, estado, estado_label, frec_24h, mag_min_24h, mag_max_24h, frec_7d, timestamp_scraping
     FROM lecturas
     WHERE nombre = ? AND timestamp_scraping >= ?
     ORDER BY timestamp_scraping`,
  ).bind(nombre, desde).all();
  return consulta.results || [];
}

async function historialDesdeBase(env, url) {
  if (!env.DB) return null;
  const sector = (url.searchParams.get("sector") || "").toLowerCase();
  const estado = url.searchParams.get("estado") || "";
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page"), 10) || 1);
  const pageSize = Math.min(500, Math.max(1, Number.parseInt(url.searchParams.get("page_size"), 10) || 50));
  const donde = "WHERE (? = '' OR instr(lower(nombre), ?) > 0) AND (? = '' OR estado = ?)";
  const total = await env.DB.prepare(`SELECT COUNT(*) AS total FROM lecturas ${donde}`)
    .bind(sector, sector, estado, estado)
    .first();
  if (!total?.total) return null;
  const datos = await env.DB.prepare(
    `SELECT id, nombre, estado, estado_label, frec_24h, mag_min_24h, mag_max_24h, frec_7d, timestamp_scraping
     FROM lecturas ${donde}
     ORDER BY timestamp_scraping DESC
     LIMIT ? OFFSET ?`,
  ).bind(sector, sector, estado, estado, pageSize, (page - 1) * pageSize).all();
  return Response.json({
    total: total.total,
    page,
    page_size: pageSize,
    datos: datos.results || [],
  });
}

async function leerRespaldo(request, env) {
  if (!autorizado(request, env)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const respaldo = await env.DATOS.get("respaldo", { type: "json" });
  return Response.json({ filas: Array.isArray(respaldo?.filas) ? respaldo.filas : [] });
}

function fusionarFilas(anteriores, nuevas, horas) {
  const ventana = (horas > 0 ? horas : 168) * 60 * 60 * 1000;
  const limite = Date.now() - ventana;
  const mapa = new Map();
  for (const fila of [...anteriores, ...nuevas]) {
    if (!fila?.nombre || !fila.timestamp_scraping) continue;
    const momento = Date.parse(fila.timestamp_scraping);
    if (!Number.isFinite(momento) || momento < limite) continue;
    mapa.set(`${fila.nombre}|${fila.timestamp_scraping}`, fila);
  }
  return [...mapa.values()];
}

function reducir(filas, maximo) {
  const grupos = new Map();
  for (const fila of filas) {
    const nombre = String(fila.nombre);
    if (!grupos.has(nombre)) grupos.set(nombre, []);
    grupos.get(nombre).push(fila);
  }
  const salida = [];
  for (const lista of grupos.values()) {
    lista.sort((a, b) => String(a.timestamp_scraping).localeCompare(String(b.timestamp_scraping)));
    if (lista.length <= maximo) {
      salida.push(...lista);
      continue;
    }
    const paso = lista.length / maximo;
    const indices = new Set();
    for (let i = 0; i < maximo; i += 1) indices.add(Math.min(lista.length - 1, Math.floor(i * paso)));
    indices.add(lista.length - 1);
    for (let i = 1; i < lista.length; i += 1) {
      if (lista[i].estado !== lista[i - 1].estado) indices.add(i);
    }
    for (const indice of [...indices].sort((a, b) => a - b)) salida.push(lista[indice]);
  }
  return salida;
}

async function reenviar(request, env, url) {
  const tendencia = url.pathname.match(/^\/api\/sectores\/(.+)\/tendencia$/);
  if (url.pathname === "/api/sectores/historial") {
    const desdeBase = await historialDesdeBase(env, url);
    if (desdeBase) return desdeBase;
  }
  let enVivo = null;
  const puente = await env.DATOS.get("url");
  if (puente) {
    try {
      const destino = new URL(url.pathname + url.search, puente);
      const respuesta = await fetch(destino.toString(), { method: "GET" });
      if (respuesta.ok) {
        if (!tendencia) {
          const headers = new Headers(respuesta.headers);
          headers.delete("content-encoding");
          headers.delete("content-length");
          return new Response(respuesta.body, { status: respuesta.status, headers });
        }
        enVivo = await respuesta.json();
      }
    } catch {
      /* el computador de la mina no respondió */
    }
  }

  const respaldo = await env.DATOS.get("respaldo", { type: "json" });
  if (tendencia && (Array.isArray(enVivo) || respaldo)) {
    const nombre = decodeURIComponent(tendencia[1]);
    const horas = Number.parseInt(url.searchParams.get("horas"), 10);
    const guardadas = respaldo
      ? respaldo.filas.filter((fila) => String(fila.nombre).toLowerCase() === nombre.toLowerCase())
      : [];
    const enBase = await filasDesdeBase(env, nombre, horas);
    const recientes = Array.isArray(enVivo) ? enVivo : [];
    return Response.json(reducir(fusionarFilas([...guardadas, ...enBase], recientes, horas), 300));
  }

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
