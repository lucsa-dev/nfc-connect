"use client";

import { Loader2Icon, RefreshCwIcon, SparklesIcon, UnlinkIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { analyzeGoogle, linkGoogle, refreshGoogle, unlinkGoogle } from "@/app/dashboard/actions";
import { BusinessSearch } from "@/components/quiz/business-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/action-state";
import type { PlaceInfo } from "@/lib/places";

function useActionButton() {
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<ActionState>) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(result.message);
      else if (result.message) toast.error(result.message);
    });
  return [pending, run] as const;
}

export function GoogleActions({ businessId, canAnalyze, hasAnalysis }: { businessId: string; canAnalyze: boolean; hasAnalysis: boolean }) {
  const [refreshing, runRefresh] = useActionButton();
  const [analyzing, runAnalyze] = useActionButton();
  const [unlinking, runUnlink] = useActionButton();

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" disabled={refreshing} onClick={() => runRefresh(() => refreshGoogle(businessId))}>
        {refreshing ? <Loader2Icon className="animate-spin" /> : <RefreshCwIcon />}
        {refreshing ? "Buscando no Google..." : "Atualizar dados"}
      </Button>
      {canAnalyze && (
        <Button size="sm" disabled={analyzing} onClick={() => runAnalyze(() => analyzeGoogle(businessId))}>
          {analyzing ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
          {analyzing ? "Analisando..." : hasAnalysis ? "Refazer análise" : "Analisar com IA"}
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        disabled={unlinking}
        title="Use se o negócio encontrado no Google não for este"
        onClick={() => {
          if (confirm("Desvincular do Google? As métricas coletadas deste negócio serão apagadas.")) runUnlink(() => unlinkGoogle(businessId));
        }}
      >
        <UnlinkIcon /> Desvincular
      </Button>
    </div>
  );
}

export function GoogleLinkForm({
  businessId,
  placesEnabled,
  defaultQuery,
}: {
  businessId: string;
  placesEnabled: boolean;
  defaultQuery: string;
}) {
  const [sessionToken] = useState(() => crypto.randomUUID());
  const [place, setPlace] = useState<PlaceInfo | null>(null);
  const [query, setQuery] = useState(defaultQuery);
  const [pending, run] = useActionButton();

  if (placesEnabled) {
    return (
      <div className="grid max-w-lg gap-3">
        <BusinessSearch value={place} sessionToken={sessionToken} placesEnabled allowManual={false} onChange={setPlace} />
        {place?.placeId && (
          <Button className="w-fit" disabled={pending} onClick={() => run(() => linkGoogle(businessId, { placeId: place.placeId! }))}>
            {pending && <Loader2Icon className="animate-spin" />} Vincular a este negócio
          </Button>
        )}
      </div>
    );
  }

  return (
    <form
      className="grid max-w-lg gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => linkGoogle(businessId, { query }));
      }}
    >
      <Label htmlFor="maps-query">Como o negócio aparece no Google Maps</Label>
      <div className="flex gap-2">
        <Input id="maps-query" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Padaria Central, Fortaleza - CE" />
        <Button type="submit" disabled={pending || query.trim().length < 3}>
          {pending && <Loader2Icon className="animate-spin" />} {pending ? "Buscando..." : "Buscar"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Nome e cidade, como você digitaria no Maps. A busca leva até 1 minuto.</p>
    </form>
  );
}
