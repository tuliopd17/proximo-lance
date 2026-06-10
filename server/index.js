import express from 'express';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { scrapeAll } from './scraper.js';
import { resolveCity, haversineKm, searchCities } from './geo.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const CACHE_FILE = join(__dirname, 'data', 'cache.json');
const TTL_MS = 24 * 60 * 60 * 1000; // uma atualização por dia
const NEW_BADGE_MS = 48 * 60 * 60 * 1000; // "novo" = entrou no calendário há <48h

const app = express();

// ---------------------------------------------------------------- cache layer
let cache = loadDiskCache();

function loadDiskCache() {
  try {
    if (existsSync(CACHE_FILE)) return JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
  } catch {}
  return null;
}

let inflight = null;
function refresh() {
  if (inflight) return inflight; // coalesce concurrent refreshes
  inflight = (async () => {
    try {
      const { total, scraped, tournaments } = await scrapeAll();
      const now = Date.now();
      // carimba quando cada torneio apareceu pela 1ª vez no calendário;
      // na carga inicial (sem cache anterior) ninguém é "novo"
      const prev = new Map((cache?.tournaments ?? []).map((t) => [t.id, t.firstSeenAt]));
      const stamped = tournaments.map((t) => ({
        ...t,
        firstSeenAt: cache ? (prev.has(t.id) ? (prev.get(t.id) ?? null) : now) : null,
      }));
      cache = { fetchedAt: now, total, scraped, tournaments: stamped };
      try { writeFileSync(CACHE_FILE, JSON.stringify(cache)); } catch {}
      return cache;
    } catch (err) {
      if (cache) return cache; // serve stale on failure
      throw err;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

async function getData({ force = false } = {}) {
  const fresh = cache && Date.now() - cache.fetchedAt < TTL_MS;
  if (fresh && !force) return cache;
  if (cache && !force) {
    // stale-while-revalidate: responde já com o cache e atualiza em fundo
    refresh().catch((e) => console.warn('refresh em fundo falhou —', e.message));
    return cache;
  }
  return refresh();
}

// ----------------------------------------------------------------- enrichment
function enrich(t) {
  const geo = resolveCity(t.city, t.uf);
  return {
    ...t,
    lat: geo?.lat ?? null,
    lng: geo?.lng ?? null,
    geolocated: !!geo,
    isNew: t.firstSeenAt != null && Date.now() - t.firstSeenAt < NEW_BADGE_MS,
  };
}

const todayIso = () => new Date().toISOString().slice(0, 10);

// --------------------------------------------------------------------- routes
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, cached: !!cache, fetchedAt: cache?.fetchedAt ?? null });
});

app.get('/api/cities', (req, res) => {
  res.json(searchCities(String(req.query.q || ''), 8));
});

app.get('/api/tournaments', async (req, res) => {
  try {
    const data = await getData({ force: req.query.refresh === '1' });
    const { city, uf } = req.query;
    const radius = Number(req.query.radius || 300);
    const includePast = req.query.includePast === '1';
    const today = todayIso();

    let list = data.tournaments
      .filter((t) => t.fideRated)
      .filter((t) => includePast || !t.end || t.end >= today)
      .map(enrich);

    let origin = null;
    if (city) {
      origin = resolveCity(String(city), uf ? String(uf) : null);
      if (!origin) return res.status(404).json({ error: 'cidade não encontrada', city, uf });
      list = list
        .map((t) =>
          t.geolocated
            ? { ...t, distanceKm: haversineKm(origin, { lat: t.lat, lng: t.lng }) }
            : { ...t, distanceKm: null },
        )
        .filter((t) => t.distanceKm != null && t.distanceKm <= radius)
        .sort((a, b) => a.distanceKm - b.distanceKm || (a.start || '').localeCompare(b.start || ''));
    } else {
      list.sort((a, b) => (a.start || '').localeCompare(b.start || ''));
    }

    res.json({
      origin: origin ? { name: origin.n, uf: origin.uf, lat: origin.lat, lng: origin.lng } : null,
      radius,
      count: list.length,
      fetchedAt: data.fetchedAt,
      tournaments: list,
    });
  } catch (err) {
    res.status(502).json({ error: 'falha ao obter calendário da CBX', detail: String(err.message || err) });
  }
});

// ------------------------------------------------- static (produção: web/dist)
const dist = join(__dirname, '..', 'web', 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(join(dist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`chess-tour API on http://localhost:${PORT}`);
  getData().then(
    (d) => console.log(`calendário pronto: ${d.tournaments.length} torneios (de ${d.total})`),
    (e) => console.warn('aviso: scrape inicial falhou —', e.message),
  );
  // atualização automática diária, independente de tráfego
  setInterval(() => {
    refresh().then(
      (d) => console.log(`refresh diário: ${d.tournaments.length} torneios`),
      (e) => console.warn('refresh diário falhou —', e.message),
    );
  }, TTL_MS);
});
