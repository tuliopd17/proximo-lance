import { useEffect, useMemo, useState } from 'react';
import { CitySearch } from './components/CitySearch';
import { TournamentCard } from './components/TournamentCard';
import { fetchTournaments } from './lib/api';
import { isEligible } from './lib/eligibility';
import type { City, TournamentsResponse } from './lib/types';

const RADII = [50, 100, 200, 300, 500];
const RITMOS = ['Todos', 'Clássico', 'Rápido', 'Blitz'] as const;

export function App() {
  const [city, setCity] = useState<City | null>(null);
  const [radius, setRadius] = useState(300);
  const [ritmo, setRitmo] = useState<(typeof RITMOS)[number]>('Todos');
  const [gender, setGender] = useState<'M' | 'F' | null>(
    () => (localStorage.getItem('pl.gender') as 'M' | 'F') || null,
  );
  const [age, setAge] = useState(() => localStorage.getItem('pl.age') || '');
  const [data, setData] = useState<TournamentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    gender ? localStorage.setItem('pl.gender', gender) : localStorage.removeItem('pl.gender');
    age ? localStorage.setItem('pl.age', age) : localStorage.removeItem('pl.age');
  }, [gender, age]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetchTournaments({ city, radius })
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [city, radius]);

  const { visible, hiddenByProfile } = useMemo(() => {
    if (!data) return { visible: [], hiddenByProfile: 0 };
    let list = data.tournaments;
    if (ritmo !== 'Todos') {
      const key = ritmo.toLowerCase().slice(0, 5);
      list = list.filter((t) => t.ritmo.toLowerCase().includes(key));
    }
    const profile = { gender, age: age ? Number(age) : null };
    if (!profile.gender && profile.age == null) return { visible: list, hiddenByProfile: 0 };
    const eligible = list.filter((t) => isEligible(t.name, profile));
    return { visible: eligible, hiddenByProfile: list.length - eligible.length };
  }, [data, ritmo, gender, age]);

  return (
    <div className="min-h-screen">
      <Header />

      <main className="relative z-10 mx-auto -mt-10 max-w-6xl px-4 pb-24 sm:px-6">
        {/* painel de controles */}
        <section className="rounded-2xl border border-walnut/12 bg-parchment-2 p-5 shadow-[var(--shadow-card)] sm:p-6">
          <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
            <CitySearch value={city} onSelect={setCity} />
            <div>
              <span className="mb-1.5 block font-sans text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Distância máxima
              </span>
              <div className="flex flex-wrap gap-1.5">
                {RADII.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRadius(r)}
                    disabled={!city}
                    className={`ring-gold rounded-lg px-3.5 py-3 font-sans text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      radius === r && city
                        ? 'bg-felt text-parchment shadow-sm'
                        : 'border border-walnut/15 bg-ivory text-walnut hover:bg-board-light/40'
                    }`}
                  >
                    {r} km
                  </button>
                ))}
              </div>
              {!city && (
                <p className="mt-1.5 font-sans text-xs text-ink-soft/70">
                  Escolha uma cidade para filtrar por proximidade.
                </p>
              )}
            </div>
          </div>

          {/* filtro de ritmo */}
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-walnut/10 pt-4">
            <span className="font-sans text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Ritmo
            </span>
            {RITMOS.map((r) => (
              <button
                key={r}
                onClick={() => setRitmo(r)}
                className={`ring-gold rounded-full px-3 py-1 font-sans text-sm font-medium transition ${
                  ritmo === r
                    ? 'bg-walnut text-parchment'
                    : 'text-walnut hover:bg-board-light/50'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* perfil do jogador: oculta categorias incompatíveis (Sub X, Feminino, Sênior) */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-walnut/10 pt-4">
            <span className="font-sans text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Jogador(a)
            </span>
            {(
              [
                ['M', 'Homem'],
                ['F', 'Mulher'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setGender(gender === value ? null : value)}
                className={`ring-gold rounded-full px-3 py-1 font-sans text-sm font-medium transition ${
                  gender === value
                    ? 'bg-walnut text-parchment'
                    : 'text-walnut hover:bg-board-light/50'
                }`}
              >
                {label}
              </button>
            ))}
            <input
              type="number"
              min={4}
              max={99}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Idade"
              aria-label="Sua idade"
              className="ring-gold w-24 rounded-full border border-walnut/15 bg-ivory px-3 py-1 font-sans text-sm text-ink transition placeholder:text-ink-soft/50 focus:border-gold"
            />
            {hiddenByProfile > 0 && (
              <span className="font-sans text-xs text-ink-soft/70">
                {hiddenByProfile} {hiddenByProfile === 1 ? 'torneio oculto' : 'torneios ocultos'} por
                restrição de categoria
              </span>
            )}
          </div>
        </section>

        {/* status / resultados */}
        <section className="mt-8">
          <ResultsHeader data={data} city={city} loading={loading} count={visible.length} />

          {loading && <SkeletonGrid />}

          {!loading && error && <ErrorState message={error} />}

          {!loading && !error && visible.length === 0 && <EmptyState hasCity={!!city} radius={radius} />}

          {!loading && !error && visible.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((t, i) => (
                <TournamentCard key={t.id} t={t} index={i} />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer fetchedAt={data?.fetchedAt} />
    </div>
  );
}

/* ----------------------------------------------------------------- Header */
function Header() {
  return (
    <header className="board-grid relative overflow-hidden bg-felt-deep pb-20 pt-14 text-parchment">
      <div className="pointer-events-none absolute -right-10 -top-8 select-none font-display text-[12rem] leading-none text-parchment/5">
        ♞
      </div>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-[0.25em] text-gold-soft">
          <span className="text-lg leading-none">♚</span> Calendário CBX · valendo rating FIDE
        </div>
        <h1 className="mt-3 font-display text-5xl tracking-tight sm:text-6xl">Próximo Lance</h1>
        <p className="mt-3 max-w-xl font-serif text-xl text-parchment/85 sm:text-2xl">
          Descubra os torneios de xadrez oficiais que acontecem perto de você, em qualquer
          cidade do Brasil — com data, ritmo, participantes e tudo o que importa.
        </p>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------ ResultsHeader */
function ResultsHeader({
  data,
  city,
  loading,
  count,
}: {
  data: TournamentsResponse | null;
  city: City | null;
  loading: boolean;
  count: number;
}) {
  if (loading) return <div className="mb-5 h-7 w-72 animate-pulse rounded bg-walnut/10" />;
  return (
    <div className="mb-5">
      <h2 className="font-display text-2xl text-ink">
        {count} {count === 1 ? 'torneio' : 'torneios'}
        {city ? (
          <>
            {' '}até {data?.radius} km de{' '}
            <span className="text-walnut">
              {city.name}/{city.uf}
            </span>
          </>
        ) : (
          ' valendo rating FIDE no Brasil'
        )}
      </h2>
      <p className="mt-1 font-sans text-sm text-ink-soft/80">
        {city
          ? 'Ordenados do mais próximo ao mais distante.'
          : 'Próximos torneios ordenados por data. Informe sua cidade para ver os mais perto.'}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ States */
function SkeletonGrid() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-72 animate-pulse rounded-2xl border border-walnut/10 bg-ivory/70" />
      ))}
    </div>
  );
}

function EmptyState({ hasCity, radius }: { hasCity: boolean; radius: number }) {
  return (
    <div className="rounded-2xl border border-dashed border-walnut/25 bg-ivory/60 px-6 py-16 text-center">
      <div className="font-display text-6xl text-walnut/30">♟</div>
      <h3 className="mt-4 font-display text-2xl text-ink">Nenhum torneio por aqui</h3>
      <p className="mx-auto mt-2 max-w-md font-sans text-sm text-ink-soft/80">
        {hasCity
          ? `Não encontramos torneios FIDE em até ${radius} km. Tente aumentar a distância.`
          : 'Nenhum torneio FIDE futuro no calendário no momento.'}
      </p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-board-dark/30 bg-board-dark/10 px-6 py-12 text-center">
      <h3 className="font-display text-2xl text-walnut">Ops, algo deu errado</h3>
      <p className="mt-2 font-sans text-sm text-ink-soft">{message}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ Footer */
function Footer({ fetchedAt }: { fetchedAt?: number }) {
  return (
    <footer className="border-t border-walnut/10 bg-parchment-2 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-center sm:px-6">
        <div className="font-display text-lg text-walnut">♞ Próximo Lance</div>
        <p className="font-sans text-xs text-ink-soft/70">
          Dados do calendário oficial da{' '}
          <a href="https://cbx.org.br/torneios" target="_blank" rel="noreferrer" className="font-medium text-walnut underline">
            Confederação Brasileira de Xadrez (CBX)
          </a>
          . O número de participantes é uma estimativa — confirme sempre no regulamento.
        </p>
        {fetchedAt && (
          <p className="font-sans text-[11px] text-ink-soft/50">
            Atualizado em {new Date(fetchedAt).toLocaleString('pt-BR')}
          </p>
        )}
      </div>
    </footer>
  );
}
