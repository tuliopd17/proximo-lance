// Restrições de categoria inferidas do NOME do torneio (a CBX não expõe
// campo estruturado). Cobre os padrões usados no calendário:
//   "Sub 19", "Sub-07", "Sub19"      -> idade máxima
//   "Feminino"/"Mulheres"/"Meninas"  -> só mulheres
//   "Masculino"                      -> só homens (raro)
//   "Sênior 50+", "Veteranos 65",
//   "acima de 19 anos", "65+"        -> idade mínima (padrão 50 se omitida)
// Obs.: "U2300"/"U1700" são tetos de RATING, não de idade — o regex de idade
// exige o prefixo "sub" justamente para não confundir.

export interface Profile {
  gender: 'M' | 'F' | null;
  age: number | null;
}

export interface Restriction {
  womenOnly: boolean;
  menOnly: boolean;
  ageMax: number | null;
  ageMin: number | null;
}

export function parseRestrictions(name: string): Restriction {
  const n = name.toLowerCase();

  const sub = n.match(/\bsub[\s.-]?(\d{1,2})\b/);

  const senior = n.match(/\b(?:s[êe]nior|veteranos?)\b[^0-9]{0,8}(\d{2})?/);
  const acima = n.match(/\bacima de (\d{1,2})\s*anos\b/);
  const plus = n.match(/\b(\d{2})\s*\+(?!\d)/);
  const mins = [
    senior ? Number(senior[1] ?? 50) : null,
    acima ? Number(acima[1]) : null,
    plus ? Number(plus[1]) : null,
  ].filter((v): v is number => v != null);

  return {
    womenOnly: /\bfeminin[oa]\b|\bmulheres\b|\bmeninas\b/.test(n),
    menOnly: /\bmasculino\b/.test(n),
    ageMax: sub ? Number(sub[1]) : null,
    ageMin: mins.length ? Math.max(...mins) : null,
  };
}

export function isEligible(name: string, p: Profile): boolean {
  const r = parseRestrictions(name);
  if (p.gender === 'M' && r.womenOnly) return false;
  if (p.gender === 'F' && r.menOnly) return false;
  if (p.age != null) {
    if (r.ageMax != null && p.age > r.ageMax) return false;
    if (r.ageMin != null && p.age < r.ageMin) return false;
  }
  return true;
}
