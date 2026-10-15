"use client";

import { Loader2Icon, LocateFixedIcon, MapIcon, SearchIcon, SendIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createNearbyProspectSearch,
  createProspectSearch,
  createRankGrid,
  createReport,
  type ReportTarget,
} from "@/app/dashboard/relatorios/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/action-state";

/** Termo ("padaria") e região ("Aldeota, Fortaleza"), usados no relatório e na prospecção. */
function SearchFields({
  idPrefix,
  term,
  area,
  onTerm,
  onArea,
}: {
  idPrefix: string;
  term: string;
  area: string;
  onTerm: (v: string) => void;
  onArea: (v: string) => void;
}) {
  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-term`}>O que o cliente busca no Maps</Label>
        <Input id={`${idPrefix}-term`} value={term} onChange={(e) => onTerm(e.target.value)} placeholder="padaria" maxLength={80} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-area`}>Bairro ou cidade</Label>
        <Input id={`${idPrefix}-area`} value={area} onChange={(e) => onArea(e.target.value)} placeholder="Aldeota, Fortaleza" maxLength={120} />
      </div>
    </>
  );
}

function useRun() {
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<ActionState>) =>
    startTransition(async () => {
      // Em caso de sucesso a action redireciona; só volta aqui com erro.
      const result = await action();
      if (result?.ok) toast.success(result.message);
      else if (result?.message) toast.error(result.message);
    });
  return [pending, run] as const;
}

export function ReportForm({
  target,
  defaultTerm,
  defaultArea,
  label = "Gerar relatório",
}: {
  target: ReportTarget;
  defaultTerm: string;
  defaultArea: string;
  label?: string;
}) {
  const [term, setTerm] = useState(defaultTerm);
  const [area, setArea] = useState(defaultArea);
  const [pending, run] = useRun();
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => createReport(target, { term, area }));
      }}
    >
      <SearchFields idPrefix="report" term={term} area={area} onTerm={setTerm} onArea={setArea} />
      <Button type="submit" disabled={pending || term.trim().length < 2 || area.trim().length < 2}>
        {pending ? <Loader2Icon className="animate-spin" /> : <SearchIcon />} {label}
      </Button>
    </form>
  );
}

export function ProspectForm() {
  const [term, setTerm] = useState("");
  const [area, setArea] = useState("");
  const [pending, run] = useRun();
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => createProspectSearch({ term, area }));
      }}
    >
      <SearchFields idPrefix="prospect" term={term} area={area} onTerm={setTerm} onArea={setArea} />
      <Button type="submit" className="w-full sm:w-fit" disabled={pending || term.trim().length < 2 || area.trim().length < 2}>
        {pending ? <Loader2Icon className="animate-spin" /> : <SearchIcon />} Buscar negócios
      </Button>
    </form>
  );
}

export const NEARBY_RADII = [500, 1000, 2000, 5000] as const;

const radiusLabel = (m: number) => (m < 1000 ? `${m} m` : `${m / 1000} km`);

/** Lê a posição atual do aparelho (pede permissão ao navegador). */
function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("Este navegador não informa a localização."));
    navigator.geolocation.getCurrentPosition(resolve, (error) => {
      reject(
        new Error(
          error.code === error.PERMISSION_DENIED
            ? "Permita o acesso à localização no navegador para buscar perto de você."
            : "Não foi possível obter sua localização. Tente de novo em um lugar aberto.",
        ),
      );
    }, { enableHighAccuracy: true, timeout: 20_000, maximumAge: 60_000 });
  });
}

/** Prospecção ao redor de onde o vendedor está agora. */
export function NearbyProspectForm() {
  const [term, setTerm] = useState("");
  const [radius, setRadius] = useState<number>(1000);
  const [locating, setLocating] = useState(false);
  const [pending, run] = useRun();
  const busy = locating || pending;

  async function search() {
    setLocating(true);
    let position: GeolocationPosition;
    try {
      position = await currentPosition();
    } catch (error) {
      toast.error((error as Error).message);
      return;
    } finally {
      setLocating(false);
    }
    const { latitude: lat, longitude: lng } = position.coords;
    run(() => createNearbyProspectSearch({ lat, lng, radiusM: radius, term }));
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void search();
      }}
    >
      <div className="grid gap-1.5">
        <span className="text-sm font-medium" id="nearby-radius">
          Distância
        </span>
        <div className="flex w-fit rounded-lg bg-muted p-0.5" role="radiogroup" aria-labelledby="nearby-radius">
          {NEARBY_RADII.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={radius === r}
              onClick={() => setRadius(r)}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground aria-checked:bg-background aria-checked:text-foreground aria-checked:shadow-sm"
            >
              {radiusLabel(r)}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="nearby-term">Tipo de negócio (opcional)</Label>
        <Input
          id="nearby-term"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Em branco: restaurantes, salões, oficinas, lojas..."
          maxLength={80}
        />
      </div>
      <Button type="submit" className="w-full sm:w-fit" disabled={busy}>
        {busy ? <Loader2Icon className="animate-spin" /> : <LocateFixedIcon />}
        {locating ? "Pegando sua localização..." : pending ? "Iniciando a busca..." : "Buscar perto de mim"}
      </Button>
    </form>
  );
}

/** Botão "Gerar relatório" de um negócio achado na prospecção (mesma busca). */
export function ProspectReportButton({ placeId, name, term, area }: { placeId: string; name: string; term: string; area: string }) {
  const [pending, run] = useRun();
  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => createReport({ placeId, name }, { term, area }))}>
      {pending && <Loader2Icon className="animate-spin" />} Relatório
    </Button>
  );
}

const POLL_MS = 8000;

/** Enquanto a coleta roda na Apify, confere a cada 8 s e recarrega a página ao terminar. */
export function RunPoller({ check, message }: { check: () => Promise<{ status: string }>; message: string }) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      const { status } = await check().catch(() => ({ status: "running" }));
      if (!active) return;
      if (status !== "running") router.refresh();
      else timer = setTimeout(tick, POLL_MS);
    };
    timer = setTimeout(tick, 2000);
    const clock = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      active = false;
      clearTimeout(timer);
      clearInterval(clock);
    };
  }, [check, router]);

  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted p-4 text-sm" role="status">
      <Loader2Icon className="size-5 shrink-0 animate-spin text-primary" />
      <span>
        {message}{" "}
        <span className="text-muted-foreground tabular-nums">
          ({Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")})
        </span>
      </span>
    </div>
  );
}

export function RankGridButton({ reportId, hasGrid }: { reportId: string; hasGrid: boolean }) {
  const [pending, run] = useRun();
  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => createRankGrid(reportId))}>
      {pending ? <Loader2Icon className="animate-spin" /> : <MapIcon />}
      {pending ? "Consultando 25 pontos..." : hasGrid ? "Refazer mapa" : "Gerar mapa de ranking"}
    </Button>
  );
}

export function WhatsAppShare({ url, name }: { url: string; name: string }) {
  const text = `Olá! Preparei uma análise de como ${name} aparece no Google Maps em relação aos concorrentes: ${url}`;
  return (
    <Button variant="outline" size="sm" nativeButton={false} render={<a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" />}>
      <SendIcon /> WhatsApp
    </Button>
  );
}
