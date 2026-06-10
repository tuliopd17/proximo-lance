import type { City, TournamentsResponse } from './types';

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const searchCities = (q: string) =>
  get<City[]>(`/api/cities?q=${encodeURIComponent(q)}`);

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
