// Converts municipios.csv (kelvins/municipios-brasileiros) -> server/data/municipios.json
// Run once: node server/build-municipios.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = join(__dirname, '..', 'municipios.csv');
const outPath = join(__dirname, 'data', 'municipios.json');

const UF = {
  11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO',
  21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB', 26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA',
  31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP',
  41: 'PR', 42: 'SC', 43: 'RS',
  50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF',
};

export const normalize = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const csv = readFileSync(csvPath, 'utf8').trim().split('\n');
csv.shift(); // header
const out = [];
for (const line of csv) {
  const [ibge, nome, lat, lng, capital, codUf] = line.split(',');
  const uf = UF[Number(codUf)];
  if (!uf) continue;
  out.push({
    n: nome,
    norm: normalize(nome),
    uf,
    lat: Number(lat),
    lng: Number(lng),
    cap: capital === '1',
  });
}
writeFileSync(outPath, JSON.stringify(out));
console.log(`Wrote ${out.length} municipalities -> ${outPath}`);
