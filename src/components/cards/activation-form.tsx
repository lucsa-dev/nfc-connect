"use client";

import { Loader2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { activateCard, type ActivationInput } from "@/app/c/[code]/ativar/actions";
import { BusinessSearch } from "@/components/quiz/business-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeGoogleReviewUrl, type PlaceInfo } from "@/lib/places";

export function ActivationForm({ code, placesEnabled }: { code: string; placesEnabled: boolean }) {
  const [sessionToken] = useState(() => crypto.randomUUID());
  const [place, setPlace] = useState<PlaceInfo | null>(null);
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Sem a busca do Google (cadastro manual), o dono cola o link de avaliação.
  const manual = place !== null && !place.placeId;
  const linkValid = normalizeGoogleReviewUrl(link) !== null;

  function submit() {
    if (!place) return;
    const input: ActivationInput = place.placeId
      ? { placeId: place.placeId }
      : { manual: { name: place.name, city: place.city ?? "", state: place.state, reviewUrl: link } };
    setError(null);
    startTransition(async () => {
      // Em caso de sucesso a action redireciona; só volta aqui com erro.
      const result = await activateCard(code, input);
      if (result && !result.ok) setError(result.message);
    });
  }

  return (
    <div className="grid gap-4">
      <BusinessSearch value={place} sessionToken={sessionToken} placesEnabled={placesEnabled} onChange={setPlace} />

      {manual && (
        <div className="grid gap-1.5">
          <Label htmlFor="review-link">Link de avaliação do Google</Label>
          <Input
            id="review-link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://g.page/r/.../review"
            inputMode="url"
            autoComplete="off"
            className="h-11 text-base"
            aria-invalid={link.length > 0 && !linkValid}
          />
          {link.length > 0 && !linkValid ? (
            <p className="text-xs text-destructive">Esse não parece um link do Google. Ele começa com g.page ou maps.app.goo.gl.</p>
          ) : (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">Onde encontro esse link?</summary>
              <ol className="mt-1.5 grid list-decimal gap-1 pl-4">
                <li>No celular, abra o Google Maps logado na conta que administra o negócio.</li>
                <li>Toque em <strong>Você → Seu Perfil da Empresa</strong> (ou pesquise o nome do negócio no Google).</li>
                <li>
                  Toque em <strong>Pedir avaliações</strong> e em <strong>Copiar link</strong>. Cole aqui.
                </li>
              </ol>
              <p className="mt-1.5">Sem acesso ao perfil? Use o link de compartilhar do negócio no Google Maps.</p>
            </details>
          )}
        </div>
      )}

      {place && (
        <>
          <p className="text-sm text-muted-foreground">
            Confira os dados. Depois de ativado, este cartão vai levar os clientes direto para a avaliação do negócio no Google.
          </p>
          <Button size="lg" className="h-12 text-base" onClick={submit} disabled={pending || (manual && !linkValid)}>
            {pending ? (
              <>
                <Loader2Icon className="animate-spin" /> Ativando...
              </>
            ) : (
              "Ativar cartão"
            )}
          </Button>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
