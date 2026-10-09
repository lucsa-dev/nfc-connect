import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2Icon, StarIcon } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ActivationForm } from "@/components/cards/activation-form";
import { Button } from "@/components/ui/button";
import { getProduct } from "@/lib/card";
import { normalizeCode } from "@/lib/cards";
import { placesEnabled } from "@/lib/google";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Ativar cartão",
  robots: { index: false, follow: false },
};

// Sempre dinâmico: a peça muda de estado ao ser ativada.
export const dynamic = "force-dynamic";
// Depois de responder, a ativação busca o perfil no Maps (scraper, até ~4 min)
// e analisa com a IA (after()).
export const maxDuration = 300;

export default async function ActivatePage({ params }: PageProps<"/c/[code]/ativar">) {
  const code = normalizeCode((await params).code);
  if (!code) notFound();

  const supabase = createAdminClient();
  const { data: card } = await supabase
    .from("cards")
    .select("code, batch:card_batches(product), link:links(url, business:businesses(name))")
    .eq("code", code)
    .maybeSingle();
  if (!card) notFound();

  const piece = getProduct(card.batch?.product).kind === "plaque" ? "placa" : "cartão";
  const business = card.link?.business;

  return (
    <main className="flex min-h-dvh flex-col items-center bg-brand-surface px-4 py-10">
      <div className="grid w-full max-w-md gap-6">
        <Logo className="h-8 justify-self-center" />

        {business ? (
          <div className="grid justify-items-center gap-4 rounded-2xl bg-card p-6 text-center shadow-sm ring-1 ring-foreground/10">
            <CheckCircle2Icon className="size-12 text-[#34A853]" />
            <div className="grid gap-1">
              <h1 className="font-heading text-2xl font-semibold">Tudo pronto!</h1>
              <p className="text-muted-foreground">
                Esta {piece} está ativada para <strong className="text-foreground">{business.name}</strong>.
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Teste agora: aproxime o celular da {piece} ou escaneie o QR Code. Deve abrir a tela de avaliação no Google.
            </p>
            {card.link?.url && (
              <Button size="lg" nativeButton={false} render={<a href={card.link.url} />}>
                <StarIcon /> Abrir avaliação
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-5 rounded-2xl bg-card p-6 shadow-sm ring-1 ring-foreground/10">
            <div className="grid gap-1">
              <h1 className="font-heading text-2xl font-semibold">Ative sua {piece}</h1>
              <p className="text-muted-foreground">
                {placesEnabled()
                  ? "Busque seu negócio como ele aparece no Google Maps. Leva menos de 1 minuto."
                  : "Informe o nome e a cidade do negócio e cole o link de avaliação do Google. Leva menos de 1 minuto."}
              </p>
            </div>
            <ActivationForm code={code} placesEnabled={placesEnabled()} />
          </div>
        )}

        <p className="text-center font-mono text-xs text-muted-foreground">{code}</p>
      </div>
    </main>
  );
}
