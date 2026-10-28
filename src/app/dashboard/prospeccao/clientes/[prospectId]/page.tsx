import type { Metadata } from "next";
import { ExternalLinkIcon } from "lucide-react";
import { ConfirmDelete } from "@/components/dashboard/confirm-delete";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProspectForm, SendProposal } from "@/components/prospects/prospect-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProspect } from "@/lib/data";
import { formatDateTime, formatNumber } from "@/lib/format";
import { parseBrazilPhone, proposalFileName, proposalMessage, readProspectData, statusLabel } from "@/lib/prospects";
import { deleteProspect } from "../../actions";

export const metadata: Metadata = { title: "Cliente em prospecção" };

const decimal = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-primary hover:underline">
      {children} <ExternalLinkIcon className="size-3 shrink-0" />
    </a>
  );
}

export default async function ProspectPage({ params }: PageProps<"/dashboard/prospeccao/clientes/[prospectId]">) {
  const { prospectId } = await params;
  const prospect = await getProspect(prospectId);
  const data = readProspectData(prospect.data);
  const phone = parseBrazilPhone(prospect.phone);
  const pdfUrl = `/dashboard/prospeccao/clientes/${prospect.id}/proposta`;
  const otherEmails = (data.contact?.emails ?? []).filter((e) => e !== prospect.email);

  const stats = [
    data.rating != null && ["Nota", decimal(data.rating)],
    data.reviews !== undefined && ["Avaliações", formatNumber(data.reviews)],
    data.pace !== undefined && ["Novas por mês", decimal(data.pace)],
    data.score !== undefined && ["Oportunidade", String(data.score)],
  ].filter((s): s is [string, string] => Boolean(s));

  return (
    <>
      <PageHeader
        breadcrumbs={[{ href: "/dashboard/prospeccao", label: "Prospecção" }]}
        title={prospect.name}
        description={[data.category, data.address].filter(Boolean).join(" · ") || undefined}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                Perfil no Google <Badge variant="secondary">{statusLabel(prospect.status)}</Badge>
              </CardTitle>
              {prospect.contacted_at && <p className="text-sm text-muted-foreground">Último contato em {formatDateTime(prospect.contacted_at)}.</p>}
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              {stats.length > 0 && (
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {stats.map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-muted/50 p-3">
                      <dd className="text-xl font-semibold tabular-nums">{value}</dd>
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                    </div>
                  ))}
                </dl>
              )}
              {data.reasons && data.reasons.length > 0 && <p className="text-muted-foreground">{data.reasons.join(" · ")}</p>}
              <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-2">
                <dt className="text-muted-foreground">Telefone</dt>
                <dd>
                  {prospect.phone ? (
                    <>
                      {prospect.phone}{" "}
                      <span className="text-xs text-muted-foreground">
                        {phone ? (phone.mobile ? "· celular" : "· fixo, pode não ter WhatsApp") : "· número inválido"}
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </dd>
                <dt className="text-muted-foreground">E-mail</dt>
                <dd className="break-all">{[prospect.email, ...otherEmails].filter(Boolean).join(", ") || "—"}</dd>
                <dt className="text-muted-foreground">Instagram</dt>
                <dd>{prospect.instagram ? <ExternalLink href={`https://instagram.com/${prospect.instagram}`}>@{prospect.instagram}</ExternalLink> : "—"}</dd>
                <dt className="text-muted-foreground">Site</dt>
                <dd>{prospect.website ? <ExternalLink href={prospect.website}>{prospect.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</ExternalLink> : "—"}</dd>
                {data.mapsUrl && (
                  <>
                    <dt className="text-muted-foreground">Google</dt>
                    <dd>
                      <ExternalLink href={data.mapsUrl}>Abrir no Maps</ExternalLink>
                    </dd>
                  </>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cliente e proposta</CardTitle>
            </CardHeader>
            <CardContent>
              <ProspectForm prospect={prospect} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:sticky lg:top-20">
          <Card>
            <CardHeader>
              <CardTitle>Enviar a proposta</CardTitle>
            </CardHeader>
            <CardContent>
              <SendProposal
                // Recria a mensagem padrão quando os dados salvos mudam.
                key={prospect.updated_at}
                id={prospect.id}
                phone={prospect.phone}
                defaultMessage={proposalMessage({ name: prospect.name, contactName: prospect.contact_name, data })}
                pdfUrl={pdfUrl}
                fileName={proposalFileName(prospect.name)}
              />
            </CardContent>
          </Card>
          <iframe
            key={prospect.updated_at}
            src={`${pdfUrl}#view=FitH`}
            title={`Proposta para ${prospect.name}`}
            className="hidden aspect-[1/1.414] w-full rounded-xl border bg-white lg:block"
          />
        </div>
      </div>

      <div className="mt-8">
        <ConfirmDelete
          title="Remover da prospecção?"
          description={`${prospect.name} sai da sua lista, com os dados e as anotações. O negócio continua na busca.`}
          action={deleteProspect.bind(null, prospect.id)}
          label="Remover da lista"
        />
      </div>
    </>
  );
}
