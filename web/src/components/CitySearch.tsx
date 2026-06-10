import { useEffect, useId, useRef, useState } from 'react';
import type { City } from '../lib/types';
import { searchCities } from '../lib/api';

interface Props {
  value: City | null;
  onSelect: (city: City | null) => void;
}

export function CitySearch({ value, onSelect }: Props) {
  const [text, setText] = useState('');
  const [results, setResults] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // fecha ao clicar fora
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // busca com debounce
  useEffect(() => {
    const q = text.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await searchCities(q);
        setResults(r);
        setActive(0);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [text]);

  function choose(c: City) {
    onSelect(c);
    setText(`${c.name} — ${c.uf}`);
    setOpen(false);
  }

  function onKey(e: React.KeyboardEvent) {
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <label className="mb-1.5 block font-sans text-xs font-semibold uppercase tracking-wider text-ink-soft">
        Sua cidade
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-walnut-soft">
          {/* alfinete / localização */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
        </span>
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (value) onSelect(null);
          }}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={onKey}
          placeholder="Digite uma cidade do Brasil…"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          autoComplete="off"
          className="ring-gold w-full rounded-xl border border-walnut/20 bg-ivory py-3.5 pl-11 pr-4 font-sans text-base font-medium text-ink shadow-sm transition placeholder:font-normal placeholder:text-ink-soft/50 focus:border-gold"
        />
      </div>

      {open && results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-walnut/15 bg-ivory shadow-[var(--shadow-soft)]"
        >
          {results.map((c, i) => (
            <li
              key={`${c.name}-${c.uf}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(c);
              }}
              className={`flex cursor-pointer items-center justify-between px-4 py-2.5 text-ink transition ${
                i === active ? 'bg-board-light/60' : ''
              }`}
            >
              <span className="font-sans text-[15px] font-medium">{c.name}</span>
              <span className="font-sans text-xs font-semibold uppercase tracking-wider text-walnut-soft">
                {c.capital ? '★ ' : ''}
                {c.uf}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
