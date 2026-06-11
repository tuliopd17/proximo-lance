export interface City {
  name: string;
  uf: string;
  lat: number;
  lng: number;
  capital?: boolean;
}

export interface Players {
  value: number;
  estimated: boolean;
}

export interface Tournament {
  id: string;
  name: string;
  monthLabel: string;
  ritmo: string; // Clássico | Rápido | Blitz
  rating: string; // ex.: "CBX e FIDE"
  fideRated: boolean;
  organizer: string;
  city: string;
  uf: string | null;
  start: string | null; // ISO yyyy-mm-dd
  end: string | null;
  regulamentoUrl: string | null;
  raw: string;
  system: string | null;
  rounds: number | null;
  timeControl: string | null;
  players: Players | null;
  fideUrl: string | null;
  lat: number | null;
  lng: number | null;
  geolocated: boolean;
  distanceKm: number | null;
  firstSeenAt: number | null;
  isNew: boolean;
}

export interface TournamentsResponse {
  origin: { name: string; uf: string; lat: number; lng: number } | null;
  radius: number;
  count: number;
  fetchedAt: number;
  tournaments: Tournament[];
}
