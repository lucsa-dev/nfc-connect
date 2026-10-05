"use client";

import { Loader2Icon, MapPinIcon, SearchIcon, StarIcon, TriangleAlertIcon } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { findCities, getPlace, lookupCep, searchPlaces, warmCities } from "@/app/comecar/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCep, normalizeCep, type City } from "@/lib/br-location";
import type { PlaceInfo, PlaceSuggestion } from "@/lib/places";

function Rating({ place }: { place: PlaceInfo }) {
  if (!place.reviews) return <span className="text-sm text-muted-foreground">Ainda sem avaliações</span>;
  return (
    <span className="flex items-center gap-1.5 text-sm">
      <span className="font-semibold tabular-nums">{place.rating?.toFixed(1).replace(".", ",")}</span>
      <span className="flex" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <StarIcon
            key={i}
            className={`size-3.5 ${i < Math.round(place.rating ?? 0) ? "fill-[#FBBC05] text-[#FBBC05]" : "text-muted-foreground/40"}`}
          />
        ))}
      </span>
      <span className="text-muted-foreground">({place.reviews.toLocaleString("pt-BR")} avaliações)</span>
    </span>
  );
}

export function BusinessCard({ place, onChange }: { place: PlaceInfo; onChange: () => void }) {
  return (
    <div className="grid gap-2 rounded-xl bg-card p-4 ring-2 ring-primary">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-heading text-lg font-semibold">{place.name}</p>
          {place.category && <p className="text-sm text-muted-foreground">{place.category}</p>}
        </div>
        <Button variant="ghost" size="sm" onClick={onChange}>
          Trocar
        </Button>
      </div>
      {place.placeId ? <Rating place={place} /> : null}
      {(place.address || place.city) && (
        <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <MapPinIcon className="mt-0.5 size-3.5 shrink-0" />
          {place.address ?? place.city}
        </p>
      )}
      {place.businessStatus === "CLOSED_PERMANENTLY" && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <TriangleAlertIcon className="size-4" /> O Google mostra este negócio como fechado permanentemente.
        </p>
      )}
      {place.placeId && <p className="text-[11px] text-muted-foreground">Dados do Google</p>}
    </div>
  );
}

function CityField({
  value,
  onChange,
}: {
  value: City | null;
  onChange: (city: City | null, typed: string) => void;
}) {
  const [text, setText] = useState(value ? `${value.name} - ${value.uf}` : "");
  const [options, setOptions] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const requestId = useRef(0);

  // Atualiza o texto quando a cidade vem do CEP.
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    if (value) setText(`${value.name} - ${value.uf}`);
  }

  useEffect(() => {
    const q = text.replace(/\s+-\s+[A-Z]{2}$/, "").trim();
    if (q.length < 2 || (value && text === `${value.name} - ${value.uf}`)) return;
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      const result = await findCities(q);
      if (id === requestId.current) setOptions(result);
    }, 250);
    return () => clearTimeout(timer);
  }, [text, value]);

  return (
    <div className="relative">
      <Input
        id="manual-city"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          onChange(null, e.target.value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="h-11 text-base"
        autoComplete="off"
        placeholder="Comece a digitar o nome da cidade"
        role="combobox"
        aria-expanded={open && options.length > 0}
        aria-controls="city-options"
      />
      {open && options.length > 0 && !(value && text === `${value.name} - ${value.uf}`) && (
        <ul id="city-options" role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl bg-popover shadow-lg ring-1 ring-foreground/10">
          {options.map((c) => (
            <li key={`${c.name}-${c.uf}`} role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setText(`${c.name} - ${c.uf}`);
                  setOpen(false);
                  onChange(c, `${c.name} - ${c.uf}`);
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-muted"
              >
                <MapPinIcon className="size-4 shrink-0 text-muted-foreground" />
                {c.name} <span className="text-muted-foreground">- {c.uf}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ManualForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: { name: string; city: City | null };
  onSubmit: (place: PlaceInfo) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [cep, setCep] = useState("");
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "notfound">("idle");
  const [city, setCity] = useState<City | null>(initial.city);
  const [typedCity, setTypedCity] = useState("");
  const cityText = city ? city.name : typedCity.trim();

  // Baixa a lista de cidades em segundo plano: a primeira busca fica rápida.
  useEffect(() => {
    void warmCities().catch(() => {});
  }, []);
  const valid = name.trim().length >= 2 && cityText.length >= 2;

  async function onCepChange(value: string) {
    const formatted = formatCep(value);
    setCep(formatted);
    if (!normalizeCep(formatted)) {
      setCepStatus("idle");
      return;
    }
    setCepStatus("loading");
    const info = await lookupCep(formatted);
    if (info) {
      setCity({ name: info.name, uf: info.uf });
      setCepStatus("idle");
    } else {
      setCepStatus("notfound");
    }
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSubmit({
          placeId: null,
          name: name.trim(),
          city: cityText,
          address: null,
          state: city?.uf ?? null,
          rating: null,
          reviews: null,
          category: null,
          mapsUrl: null,
          businessStatus: null,
          lastReviewAt: null,
        });
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="manual-name">Nome do negócio</Label>
        <Input id="manual-name" value={name} onChange={(e) => setName(e.target.value)} className="h-11 text-base" autoFocus={!initial.name} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="manual-cep">CEP (opcional)</Label>
        <div className="relative">
          <Input
            id="manual-cep"
            value={cep}
            onChange={(e) => onCepChange(e.target.value)}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            className="h-11 text-base"
            autoFocus={Boolean(initial.name)}
          />
          {cepStatus === "loading" && <Loader2Icon className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>
        {cepStatus === "notfound" ? (
          <p className="text-xs text-destructive">CEP não encontrado. Digite a cidade abaixo.</p>
        ) : (
          <p className="text-xs text-muted-foreground">Preenche a cidade automaticamente.</p>
        )}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="manual-city">Cidade</Label>
        <CityField
          value={city}
          onChange={(c, typed) => {
            setCity(c);
            setTypedCity(typed);
          }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!valid}>
          Usar estes dados
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Voltar para a busca
          </Button>
        )}
      </div>
    </form>
  );
}

export function BusinessSearch({
  value,
  sessionToken,
  placesEnabled,
  onChange,
}: {
  value: PlaceInfo | null;
  sessionToken: string;
  /** Há chave da Google Places API no servidor? Sem ela, vai direto ao cadastro manual. */
  placesEnabled: boolean;
  onChange: (place: PlaceInfo | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [unavailable, setUnavailable] = useState(!placesEnabled);
  const [manual, setManual] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  // "Trocar" abre a busca sem apagar o negócio atual até escolher outro.
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();
  const requestId = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) return;
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      setSearching(true);
      const result = await searchPlaces(q, sessionToken);
      if (id !== requestId.current) return;
      setSearching(false);
      if (result.ok) setSuggestions(result.suggestions);
      else if (result.reason === "indisponivel") setUnavailable(true);
      else setSuggestions([]);
    }, 350);
    return () => clearTimeout(timer);
  }, [query, sessionToken]);

  function pick(s: PlaceSuggestion) {
    setLoadingId(s.placeId);
    startTransition(async () => {
      const place = await getPlace(s.placeId, sessionToken);
      setLoadingId(null);
      setSuggestions([]);
      setQuery("");
      setEditing(false);
      // Se os detalhes falharem, segue com o que a sugestão já trouxe.
      onChange(
        place ?? {
          placeId: s.placeId,
          name: s.name,
          address: s.secondary || null,
          city: null,
          state: null,
          rating: null,
          reviews: null,
          category: null,
          mapsUrl: null,
          businessStatus: null,
          lastReviewAt: null,
        },
      );
    });
  }

  if (value && !editing) return <BusinessCard place={value} onChange={() => setEditing(true)} />;

  const keepCurrent = value ? (
    <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setEditing(false)}>
      Manter {value.name}
    </Button>
  ) : null;

  const submitManual = (place: PlaceInfo) => {
    setEditing(false);
    setManual(false);
    onChange(place);
  };

  if (unavailable || manual) {
    // Retomando um cadastro manual: reaproveita os dados já informados.
    const fromValue = value && !value.placeId ? value : null;
    return (
      <div className="grid gap-3">
        <ManualForm
          initial={{
            name: query.trim() || fromValue?.name || "",
            city: fromValue?.city && fromValue.state ? { name: fromValue.city, uf: fromValue.state } : null,
          }}
          onSubmit={submitManual}
          onCancel={unavailable ? undefined : () => setManual(false)}
        />
        {keepCurrent}
      </div>
    );
  }

  const showList = query.trim().length >= 3;

  return (
    <div className="grid gap-2">
      {keepCurrent}
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ex.: Padaria Central Fortaleza"
          className="h-12 pl-9 text-base"
          autoComplete="off"
          aria-label="Nome do negócio no Google"
          autoFocus
        />
        {searching && <Loader2Icon className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>

      {showList && suggestions.length > 0 && (
        <ul className="grid overflow-hidden rounded-xl ring-1 ring-foreground/10" role="listbox" aria-label="Negócios encontrados">
          {suggestions.map((s) => (
            <li key={s.placeId} className="border-b last:border-b-0">
              <button
                type="button"
                onClick={() => pick(s)}
                disabled={loadingId !== null}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted disabled:opacity-60"
              >
                <MapPinIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{s.name}</span>
                  {s.secondary && <span className="block truncate text-sm text-muted-foreground">{s.secondary}</span>}
                </span>
                {loadingId === s.placeId && <Loader2Icon className="size-4 animate-spin" />}
              </button>
            </li>
          ))}
        </ul>
      )}
      {showList && !searching && suggestions.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum resultado ainda. Tente incluir a cidade.</p>
      )}

      <button type="button" onClick={() => setManual(true)} className="w-fit text-sm text-primary hover:underline">
        Não encontrei meu negócio
      </button>
      {showList && suggestions.length > 0 && <p className="text-[11px] text-muted-foreground">Resultados do Google</p>}
    </div>
  );
}
