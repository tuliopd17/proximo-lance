// Geocodificação offline usando a base do IBGE (server/data/municipios.json).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const munis = JSON.parse(
  readFileSync(join(__dirname, 'data', 'municipios.json'), 'utf8'),
);

export const normalize = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// Índice por "cidade|uf" e por nome normalizado (para casos sem UF).
const byCityUf = new Map();
const byCity = new Map();
for (const m of munis) {
  byCityUf.set(`${m.norm}|${m.uf}`, m);
  if (!byCity.has(m.norm)) byCity.set(m.norm, []);
  byCity.get(m.norm).push(m);
}

export function resolveCity(name, uf) {
  const norm = normalize(name);
  if (uf) {
    const hit = byCityUf.get(`${norm}|${uf.toUpperCase()}`);
    if (hit) return hit;
  }
  const list = byCity.get(norm);
  if (list && list.length) {
    // sem UF: prefere capital, senão o primeiro
    return list.find((m) => m.cap) || list[0];
  }
  return null;
}

const R = 6371; // km
const rad = (d) => (d * Math.PI) / 180;
export function haversineKm(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const lat1 = rad(a.lat);
  const lat2 = rad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

// Autocomplete: busca por prefixo/substring, capitais e cidades grandes primeiro.
export function searchCities(q, limit = 8) {
  const norm = normalize(q);
  if (!norm) return [];
  const starts = [];
  const contains = [];
  for (const m of munis) {
    if (m.norm.startsWith(norm)) starts.push(m);
    else if (m.norm.includes(norm)) contains.push(m);
    if (starts.length >= 40) break;
  }
  const rank = (a, b) => (b.cap ? 1 : 0) - (a.cap ? 1 : 0) || a.n.localeCompare(b.n);
  return [...starts.sort(rank), ...contains.sort(rank)]
    .slice(0, limit)
    .map((m) => ({ name: m.n, uf: m.uf, lat: m.lat, lng: m.lng, capital: m.cap }));
}
