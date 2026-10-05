import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLinkIcon, MessageCircleIcon } from "lucide-react";
import { LeadActions } from "@/components/dashboard/lead-actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStyle } from "@/lib/card";
import { getLead } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { LEAD_STATUS_LABEL } from "@/lib/leads";
import { reviewUrl } from "@/lib/places";
import { formatBRL } from "@/lib/pricing";
import { CLIENT_BANDS, formatBrPhone, SPOTS } from "@/lib/quiz";

export const metadata: Metadata = { title: "Pedido" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children ?? "—"}</dd>
    </div>
  );
}

export default async function LeadPage({ params }: PageProps<"/dashboard/pedidos/[leadId]">) {
  const { leadId } = await params;
  const lead = await getLead(leadId);
  const status = lead.status as keyof typeof LEAD_STATUS_LABEL;
  const firstName = lead.contact_name?.split(/\s+/)[0] ?? "";
  const waMessage = `Olá${firstName ? `, ${firstName}` : ""}! Aqui é da TopTap. Recebemos o seu pedido da placa${lead.place_name ? ` para ${lead.place_name}` : ""}.`;
  const waHref = lead.whatsapp ? `https://wa.me/${lead.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(waMessage)}` : null;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ href: "/dashboard/pedidos", label: "Pedidos" }]}
        title={lead.place_name ?? "Pedido sem nome"}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant={status === "lead" ? "default" : "secondary"}>{LEAD_STATUS_LABEL[status] ?? lead.status}</Badge>
            <span>Recebido em {formatDateTime(lead.created_at)}</span>
          </span>
        }
        actions={
          <>
            {waHref && (
              <Button variant="outline" nativeButton={false} render={<a href={waHref} target="_blank" rel="noopener noreferrer" />}>
                <MessageCircleIcon /> Chamar no WhatsApp
              </Button>
            )}
            {lead.business_id && (
              <Button nativeButton={false} render={<Link href={`/dashboard/${lead.business_id}`} />}>
                Abrir negócio
              </Button>
            )}
            <LeadActions leadId={lead.id} status={lead.status} hasPlace={Boolean(lead.place_id)} />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3">
              <Row label="Contato">{lead.contact_name}</Row>
              <Row label="WhatsApp">{lead.whatsapp ? formatBrPhone(lead.whatsapp) : null}</Row>
              <Row label="Aceita marketing">{lead.marketing_consent ? "Sim" : "Não"}</Row>
              <Row label="Kit">
                {[lead.plaques ? `${lead.plaques} placa(s)` : null, lead.cards ? `${lead.cards} cartão(ões)` : null].filter(Boolean).join(" + ") || null}
              </Row>
              <Row label="Valor (placas)">{lead.total_cents ? formatBRL(lead.total_cents) : null}</Row>
              <Row label="Estilo">{lead.style ? getStyle(lead.style).label : null}</Row>
              <Row label="Onde usar">
                {lead.spots.length ? lead.spots.map((s) => SPOTS.find((x) => x.id === s)?.label ?? s).join(", ") : null}
              </Row>
              <Row label="Clientes por dia">{CLIENT_BANDS.find((b) => b.id === lead.clients_band)?.label ?? null}</Row>
              <Row label="Pontos de atendimento">
                {lead.counters || lead.tables ? `${lead.counters ?? 0} balcão(ões) · ${lead.tables ?? 0} mesa(s)/atendente(s)` : null}
              </Row>
              <Row label="Meta / prazo">{lead.goal ? `${lead.goal} avaliações · ${lead.estimate ?? ""}` : null}</Row>
              <Row label="Etapa">{lead.step}</Row>
              {Object.keys(lead.utm as object).length > 0 && (
                <Row label="Origem">
                  {Object.entries(lead.utm as Record<string, string>)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(" · ")}
                </Row>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Negócio no Google</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3">
              <Row label="Nome">{lead.place_name}</Row>
              <Row label="Categoria">{lead.place_category}</Row>
              <Row label="Endereço">{lead.place_address ?? lead.place_city}</Row>
              <Row label="Nota">
                {lead.place_rating !== null ? `${String(lead.place_rating).replace(".", ",")} (${lead.place_reviews ?? 0} avaliações)` : null}
              </Row>
              <Row label="Última avaliação">{lead.place_last_review_at ? formatDateTime(lead.place_last_review_at) : null}</Row>
              <Row label="Place ID">{lead.place_id ? <code className="text-xs break-all">{lead.place_id}</code> : "Não informado (cadastro manual)"}</Row>
            </dl>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              {lead.place_maps_url && (
                <a href={lead.place_maps_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                  <ExternalLinkIcon className="size-3.5" /> Ver no Google Maps
                </a>
              )}
              {lead.place_id && (
                <a href={reviewUrl(lead.place_id)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                  <ExternalLinkIcon className="size-3.5" /> Testar link de avaliação
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
