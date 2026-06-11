// Scraper do calendário de torneios da CBX (https://cbx.org.br/torneios).
// A página é ASP.NET WebForms: lista 30 torneios por página, paginada via
// __doPostBack no GridView. Percorremos todas as páginas, parseamos cada bloco
// e devolvemos os torneios já estruturados.
import * as cheerio from 'cheerio';

const URL = 'https://cbx.org.br/torneios';
const UA = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A página é servida em UTF-8.
async function fetchText(opts) {
  const res = await fetch(URL, opts);
  const buf = Buffer.from(await res.arrayBuffer());
  return { status: res.status, html: buf.toString('utf8'), res };
}

const hidden = (html, id) =>
  (html.match(new RegExp(`id="${id}"[^>]*value="([^"]*)"`)) || [, ''])[1];

// Constrói o corpo do postback reaproveitando o ViewState da página anterior.
// `ano`/`mes` precisam ser reenviados em TODO postback, senão o filtro reseta.
function postBody(prevHtml, eventTarget, eventArgument, ano, mes) {
  const f = new URLSearchParams();
  f.set('__EVENTTARGET', eventTarget);
  f.set('__EVENTARGUMENT', eventArgument);
  f.set('__VIEWSTATE', hidden(prevHtml, '__VIEWSTATE'));
  f.set('__VIEWSTATEGENERATOR', hidden(prevHtml, '__VIEWSTATEGENERATOR'));
  f.set('__EVENTVALIDATION', hidden(prevHtml, '__EVENTVALIDATION'));
  f.set('ctl00$ContentPlaceHolder1$cboAno', String(ano));
  f.set('ctl00$ContentPlaceHolder1$cboMes', String(mes));
  return f.toString();
}

// --- parsing de um bloco ----------------------------------------------------

const after = (txt, label) => (txt || '').replace(label, '').trim();

function parseLocal(raw) {
  const s = after(raw, 'Local:').replace(/\s+/g, ' ').trim();
  const m = s.match(/^(.*?)[\s,]+([A-Z]{2})$/);
  if (m) return { city: m[1].trim(), uf: m[2] };
  return { city: s, uf: null };
}

function parsePeriodo(raw) {
  const m = after(raw, 'Período:').match(
    /(\d{2})\/(\d{2})\/(\d{4})\s*a\s*(\d{2})\/(\d{2})\/(\d{4})/,
  );
  if (!m) return { start: null, end: null };
  const iso = (d, mo, y) => `${y}-${mo}-${d}`;
  return { start: iso(m[1], m[2], m[3]), end: iso(m[4], m[5], m[6]) };
}

const SYSTEMS = {
  SS: 'Suíço',
  RR: 'Round Robin (todos contra todos)',
  KO: 'Eliminatório',
  SC: 'Schveningen',
};

function parseObs(raw) {
  const txt = after(raw, 'Observação:').replace(/\s*\n\s*/g, ' ').trim();
  const out = {
    raw: txt,
    system: null,
    rounds: null,
    timeControl: null,
    players: null,
    fideUrl: null,
  };

  const sys = txt.match(/\b(SS|RR|KO|SC)\s*(\d+)?/i);
  if (sys) {
    out.system = SYSTEMS[sys[1].toUpperCase()] || sys[1].toUpperCase();
    if (sys[2]) out.rounds = Number(sys[2]);
  }
  // ritmo detalhado: 90'+30''  ou  G/15+10  etc.
  const tc = txt.match(/(\d+)\s*'?\s*\+\s*(\d+)\s*''?/);
  if (tc) out.timeControl = `${tc[1]}min + ${tc[2]}s/lance`;

  // "Est.150" no calendário da CBX é a estimativa de PARTICIPANTES do torneio,
  // não a taxa de inscrição. (ex.: "RR18 ... Est.10" = round-robin duplo de 10
  // jogadores = 18 rodadas.)
  const players = txt.match(/Est\.?\s*(\d+)/i);
  if (players) out.players = { value: Number(players[1]), estimated: true };

  const url = txt.match(/https?:\/\/\S+/);
  if (url) {
    out.fideUrl = url[0];
  } else {
    // muitos organizadores anotam só o código do evento FIDE (6 dígitos)
    const code = txt.match(/\b(\d{6})\b/);
    if (code) {
      out.fideUrl = `https://ratings.fide.com/tournament_information.phtml?event=${code[1]}`;
    }
  }
  return out;
}

function parsePage(html, monthCarry) {
  const $ = cheerio.load(html);
  const items = [];
  let currentMonth = monthCarry;
  for (let n = 0; ; n++) {
    const nome = $(`#ContentPlaceHolder1_gdvMain_lblNomeTorneio_${n}`);
    if (!nome.length) break;
    const get = (f) => $(`#ContentPlaceHolder1_gdvMain_lbl${f}_${n}`).text().trim();
    const mes = get('Mes');
    if (mes) currentMonth = mes;

    const idTxt = get('IDTorneio');
    const id = (idTxt.match(/(\d+)/) || [, ''])[1];
    const ritmo = after(get('Ritmo'), 'Ritmo:');
    const rating = after(get('Rating'), 'Rating:');
    const { city, uf } = parseLocal(get('Local'));
    const { start, end } = parsePeriodo(get('Periodo'));
    const obs = parseObs(get('Obs'));
    const href =
      $(`#ContentPlaceHolder1_gdvMain_hlkTorneio_${n}`).attr('href') || '';

    items.push({
      id,
      name: nome.text().trim(),
      monthLabel: currentMonth,
      ritmo,
      rating,
      fideRated: /fide/i.test(rating),
      organizer: after(get('Organizador'), 'Organizador:'),
      city,
      uf,
      start,
      end,
      regulamentoUrl: href ? `https://cbx.org.br${href}` : null,
      ...obs,
    });
  }
  return { items, monthCarry: currentMonth };
}

const totalOf = (html) =>
  Number((html.match(/Total de Torneios:\s*(\d+)/) || [, 0])[1]);

const GRID = 'ctl00$ContentPlaceHolder1$gdvMain';
const CBO_MES = 'ctl00$ContentPlaceHolder1$cboMes';

// --- API pública ------------------------------------------------------------
//
// O calendário da CBX, sem filtro, mostra apenas o ano corrente até o mês atual.
// Para obter torneios FUTUROS aplicamos o filtro de mês (cboMes) e percorremos
// cada mês a partir do mês atual. Cada mês é paginado (30/página) via GridView.
export async function scrapeAll({
  year = new Date().getFullYear(),
  fromMonth = new Date().getMonth() + 1, // 1-12
  toMonth = 12,
  maxPagesPerMonth = 6,
} = {}) {
  const first = await fetchText({ headers: UA });
  if (first.status !== 200) throw new Error(`CBX GET ${first.status}`);
  const cookie = (first.res.headers.get('set-cookie') || '').split(';')[0];
  const viewstateSeed = first.html; // reutilizado para abrir cada mês

  const post = (prevHtml, target, arg, mes) =>
    fetchText({
      method: 'POST',
      headers: {
        ...UA,
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookie,
      },
      body: postBody(prevHtml, target, arg, year, mes),
    });

  const all = [];
  let grandTotal = 0;

  for (let mes = fromMonth; mes <= toMonth; mes++) {
    await sleep(300);
    // abre o mês (filtro) reaproveitando o ViewState da página inicial
    let page = await post(viewstateSeed, CBO_MES, '', mes);
    if (page.status !== 200) continue;

    const monthTotal = totalOf(page.html);
    grandTotal += monthTotal;
    const pages = Math.min(Math.ceil(monthTotal / 30) || 1, maxPagesPerMonth);

    let carry = '';
    const p1 = parsePage(page.html, carry);
    all.push(...p1.items);
    carry = p1.monthCarry;

    for (let p = 2; p <= pages; p++) {
      await sleep(300);
      const r = await post(page.html, GRID, `Page$${p}`, mes);
      if (r.status !== 200) break;
      page = r;
      const parsed = parsePage(r.html, carry);
      all.push(...parsed.items);
      carry = parsed.monthCarry;
    }
  }

  // dedup por id (torneios multi-mês aparecem em vários filtros)
  const byId = new Map();
  for (const t of all) {
    if (t.id && !byId.has(t.id)) byId.set(t.id, t);
  }
  return { total: grandTotal, scraped: byId.size, tournaments: [...byId.values()] };
}
