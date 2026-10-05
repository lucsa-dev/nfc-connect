"use client";

import { Loader2Icon, MapPinIcon, SearchIcon, StarIcon, TriangleAlertIcon } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { getPlace, searchPlaces } from "@/app/comecar/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function ManualForm({ onSubmit, onCancel }: { onSubmit: (place: PlaceInfo) => void; onCancel?: () => void }) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const valid = name.trim().length >= 2 && city.trim().length >= 2;

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSubmit({
          placeId: null,
          name: name.trim(),
          city: city.trim(),
          address: null,
          state: null,
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
        <Input id="manual-name" value={name} onChange={(e) => setName(e.target.value)} className="h-11 text-base" autoFocus />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="manual-city">Cidade</Label>
        <Input id="manual-city" value={city} onChange={(e) => setCity(e.target.value)} className="h-11 text-base" />
      </div>
      <div className="flex gap-2">
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
  onChange,
}: {
  value: PlaceInfo | null;
  sessionToken: string;
  onChange: (place: PlaceInfo | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [manual, setManual] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
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

  if (value) return <BusinessCard place={value} onChange={() => onChange(null)} />;
  if (unavailable || manual) return <ManualForm onSubmit={onChange} onCancel={unavailable ? undefined : () => setManual(false)} />;

  const showList = query.trim().length >= 3;

  return (
    <div className="grid gap-2">
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
