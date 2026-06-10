import type { City, TournamentsResponse } from './types';

/** Erro retornado pela própria API (JSON com campo `error`) — não adianta repetir. */
class ApiError extends Error {}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Hospedagem gratuita (Render) hiberna o serviço após ~15 min sem tráfego;
// enquanto a instância acorda (30–60 s) o proxy responde 404/502 SEM JSON.
// Para essas falhas repetimos com espera progressiva antes de desistir.
async function get<T>(url: string, { retry = true } = {}): Promise<T> {
  const delays = [2000, 4000, 8000, 12000, 15000];
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return (await res.json()) as T;
      const body = await res.json().catch(() => null);
      if (body && typeof body.error === 'string') throw new ApiError(body.error);
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (!retry || attempt >= delays.length) {
        throw new Error(
          'Servidor indisponível no momento. Na hospedagem gratuita ele pode ' +
            'levar até 1 minuto para acordar — tente de novo em instantes.',
        );
      }
      await sleep(delays[attempt]);
    }
  }
}

// autocomplete falha em silêncio na UI; melhor responder rápido que insistir
export const searchCities = (q: string) =>
  get<City[]>(`/api/cities?q=${encodeURIComponent(q)}`, { retry: false });

export function fetchTournaments(params: {
  city?: City | null;
  radius: number;
}): Promise<TournamentsResponse> {
  const qs = new URLSearchParams();
  if (params.city) {
    qs.set('city', params.city.name);
    qs.set('uf', params.city.uf);
  }
  qs.set('radius', String(params.radius));
  return get<TournamentsResponse>(`/api/tournaments?${qs.toString()}`);
}
