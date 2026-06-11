<div align="center">

# ♞ Próximo Lance

**Encontre torneios de xadrez valendo rating FIDE perto da sua cidade — em qualquer lugar do Brasil.**

![Node](https://img.shields.io/badge/Node-18%2B-2f5d45?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-b07a4e?logo=react&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-c39536?logo=tailwindcss&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-5a3a22?logo=express&logoColor=white)

*"Próximo" em português é tanto o que vem a seguir quanto o que está perto.*
*Este app encontra exatamente isso: o seu próximo lance, perto de você.* ♟

</div>

---

## O que ele faz

Digite sua cidade e veja todos os torneios oficiais (homologados pela CBX e
valendo rating FIDE) num raio de até 500 km, ordenados do mais próximo ao mais
distante. Cada torneio mostra:

- 📍 **Cidade e distância** até você
- 📅 **Datas** e contagem regressiva ("Hoje", "Amanhã", "Em 5 dias")
- ⏱️ **Ritmo das partidas** (Clássico, Rápido ou Blitz, com controle de tempo: `90min + 30s/lance`)
- ♟ **Sistema de jogo** (Suíço, Round Robin…) e número de rodadas
- 👥 **Número de participantes** (estimativa do calendário, marcada com `~`)
- 🔗 Links para o **regulamento na CBX** e a **página oficial do evento na FIDE**
- 🆕 Selo **"Novo"** nos torneios que entraram no calendário nas últimas 48 h

E ainda: filtro por ritmo e por **perfil do jogador** — informe sexo e idade e
categorias incompatíveis (Sub 12, Feminino, Sênior 50+…) somem da lista.

## Como funciona

```
┌─────────────┐   scrape diário    ┌──────────────┐
│ cbx.org.br  │ ─────────────────▶ │   server/    │  Express + cache 24h
│ (calendário)│   (ASP.NET pager)  │              │  geocodificação offline (IBGE)
└─────────────┘                    └──────┬───────┘  haversine p/ distância
                                          │ /api/tournaments?city=…&radius=…
                                   ┌──────▼───────┐
                                   │    web/      │  React 19 + Vite + Tailwind v4
                                   └──────────────┘
```

- **`server/`** — raspa o calendário oficial da CBX (página ASP.NET WebForms,
  paginada por mês via `__doPostBack`), estrutura cada torneio e filtra os que
  valem rating FIDE. A localização vem da base de municípios do IBGE (5.571
  cidades com latitude/longitude) — **nenhuma chamada a API de geocodificação**.
  O calendário se atualiza sozinho **uma vez por dia**, sem nunca bloquear
  requisições (stale-while-revalidate: serve o cache e atualiza em fundo).
- **`web/`** — interface com tema de tabuleiro de madeira: marfim, nogueira,
  feltro verde e dourado. Tipografia Marcellus + Cormorant Garamond + Inter.

## Rodando localmente

Pré-requisitos: **Node 18+** e acesso à internet (a API alcança `cbx.org.br`).

```bash
npm run install:all   # instala raiz + server + web
npm run dev           # API na porta 3001 + front na 5173
```

Abra **http://localhost:5173**.

### Build de produção

```bash
npm run build   # gera web/dist
npm start       # Express serve API + front em http://localhost:3001
```

## Hospedagem grátis (Render)

O repositório já traz um [`render.yaml`](render.yaml). Dois caminhos:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/tuliopd17/proximo-lance)

ou manualmente: crie um **Web Service** no [Render](https://render.com)
apontando para este repositório — ele detecta o `render.yaml` e configura tudo
(build `npm run install:all && npm run build`, start `npm start`).

> **Nota do plano grátis:** o serviço hiberna após ~15 min sem tráfego e o
> primeiro acesso seguinte demora ~30–60 s para acordar. Ao acordar, o app
> raspa o calendário de novo automaticamente.

## API

| Rota | Descrição |
|------|-----------|
| `GET /api/cities?q=curit` | Autocomplete de cidades brasileiras |
| `GET /api/tournaments?city=Curitiba&uf=PR&radius=300` | Torneios FIDE futuros até `radius` km, ordenados por distância |
| `GET /api/tournaments` | Todos os torneios FIDE futuros, por data |
| `GET /api/tournaments?…&refresh=1` | Força nova raspagem da CBX |
| `GET /api/health` | Status do cache |

## Limitações conhecidas

- A CBX não publica **premiação** nem **horário das rodadas** de forma
  estruturada — quando ausentes, o card aponta para o regulamento.
- O número de participantes (`Est.` no calendário) é uma **estimativa** dos
  organizadores, marcada com `~`; confirme no regulamento antes de viajar.
- O filtro por perfil (sexo/idade) é uma heurística sobre o **nome** do
  torneio; alguns usam ano de nascimento como corte, não a idade no dia.

## Créditos

- Dados de torneios: [Confederação Brasileira de Xadrez](https://cbx.org.br/torneios)
- Coordenadas de municípios: [kelvins/municipios-brasileiros](https://github.com/kelvins/municipios-brasileiros) (IBGE)
- Links de eventos: [FIDE Ratings](https://ratings.fide.com)

---

<div align="center"><sub>Feito com ♟ para a comunidade enxadrista brasileira.</sub></div>
