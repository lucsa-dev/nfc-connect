import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRightIcon, MailIcon, PhoneIcon } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { NearbyProspectForm, ProspectForm } from "@/components/market/market-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apifyEnabled } from "@/lib/apify";
import { placesEnabled } from "@/lib/google";
import { listProspects, listProspectSearches, listReports } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { readMarketData } from "@/lib/market";
import { PROSPECT_STATUSES, statusLabel } from "@/lib/prospects";

export const metadata: Metadata = { title: "Prospecção" };

const STATUS = { running: "Buscando", ready: "Pronto", failed: "Falhou" } as Record<string, string>;

/** Lista de clientes em prospecção, com filtro por status. */
function ProspectList({ prospects, status }: { prospects: Awaited<ReturnType<typeof listProspects>>; status: string | undefined }) {
  const filters = [{ id: undefined, label: "Todos" }, ...PROSPECT_STATUSES];
  return (
    <section className="mb-8 grid content-start gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Meus clientes</h2>
        <div className="-mx-4 flex overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="flex w-fit rounded-lg bg-muted p-0.5" role="group" aria-label="Filtrar por status">
            {filters.map((f) => (
              <Link
                key={f.label}
                href={f.id ? `/dashboard/prospeccao?status=${f.id}` : "/dashboard/prospeccao"}
                aria-current={f.id === status ? "page" : undefined}
                className="rounded-md px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground aria-[current=page]:bg-background aria-[current=page]:text-foreground aria-[current=page]:shadow-sm"
              >
                {f.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
      {prospects.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {status ? "Nenhum cliente com este status." : "Faça uma busca e toque em “Prospectar” nos negócios que quer abordar."}
        </p>
      ) : (
        <Card className="py-0">
          <ul className="divide-y">
            {prospects.map((p) => (
              <li key={p.id}>
                <Link href={`/dashboard/prospeccao/clientes/${p.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/50">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {p.name}
                      {p.contact_name && <span className="font-normal text-muted-foreground"> · {p.contact_name}</span>}
                    </span>
                    <span className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      {p.category && <span>{p.category}</span>}
                      {p.phone && (
                        <span className="inline-flex items-center gap-1">
                          <PhoneIcon className="size-3" /> {p.phone}
                        </span>
                      )}
                      {p.email && (
                        <span className="inline-flex items-center gap-1 break-all">
                          <MailIcon className="size-3" /> {p.email}
                        </span>
                      )}
                      {p.contacted_at && <span>contato em {formatDateTime(p.contacted_at)}</span>}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge variant={p.status === "novo" ? "default" : p.status === "perdido" ? "outline" : "secondary"}>{statusLabel(p.status)}</Badge>
                    <ChevronRightIcon className="size-4 text-muted-foreground" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}

export default async function ProspectingPage({ searchParams }: PageProps<"/dashboard/prospeccao">) {
  const requested = (await searchParams).status;
  const status = PROSPECT_STATUSES.some((s) => s.id === requested) ? (requested as string) : undefined;
  const [prospects, searches, reports] = await Promise.all([listProspects(status), listProspectSearches(), listReports({})]);
  const searchEnabled = placesEnabled() || apifyEnabled();
  // Pela Places API a busca termina em segundos; o scraper leva minutos.
  const duration = placesEnabled() ? "Leva alguns segundos." : "Leva de 1 a 4 minutos.";

  return (
    <>
      <PageHeader
        title="Prospecção"
        description="Ache no Google Maps os negócios que mais ganham com a placa, perto de você ou numa região. Toque em “Prospectar” para ver o contato e mandar a proposta em PDF pelo WhatsApp."
      />

      <ProspectList prospects={prospects} status={status} />

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Perto de mim</CardTitle>
            <p className="text-sm text-muted-foreground">
              Usa a localização do seu celular para achar, ao seu redor, os negócios que mais precisam de avaliações e de um perfil
              melhor no Google. {duration}
            </p>
          </CardHeader>
          <CardContent>
            {searchEnabled ? <NearbyProspectForm /> : <p className="text-sm text-muted-foreground">Configure a variável GOOGLE_PLACES_API_KEY para buscar negócios.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Por região</CardTitle>
            <p className="text-sm text-muted-foreground">
              Coleta até 40 negócios de “tipo em bairro ou cidade” e ordena pela nota de oportunidade: nota boa com poucas
              avaliações, poucas avaliações recentes e perfil incompleto. {duration}
            </p>
          </CardHeader>
          <CardContent>
            {searchEnabled ? <ProspectForm /> : <p className="text-sm text-muted-foreground">Configure a variável GOOGLE_PLACES_API_KEY para buscar negócios.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="grid content-start gap-3">
          <h2 className="text-lg font-semibold">Buscas</h2>
          {searches.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma busca ainda.</p>
          ) : (
            <Card className="py-0">
              <ul className="divide-y">
                {searches.map((s) => (
                  <li key={s.id}>
                    <Link href={`/dashboard/prospeccao/${s.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/50">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {s.term} em {s.area}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(s.created_at)}
                          {s.status === "ready" && ` · ${s.count} negócios`}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {s.status !== "ready" && <Badge variant={s.status === "failed" ? "outline" : "secondary"}>{STATUS[s.status]}</Badge>}
                        <ChevronRightIcon className="size-4 text-muted-foreground" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>

        <section className="grid content-start gap-3">
          <h2 className="text-lg font-semibold">Relatórios de prospectos</h2>
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">Gere o relatório de um negócio a partir de uma busca.</p>
          ) : (
            <Card className="py-0">
              <ul className="divide-y">
                {reports.map((r) => {
                  const rank = readMarketData(r.data)?.client.rank;
                  return (
                    <li key={r.id}>
                      <Link href={`/dashboard/relatorios/${r.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/50">
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{r.name}</span>
                          <span className="text-xs text-muted-foreground">
                            “{r.term} em {r.area}” · {formatDateTime(r.created_at)}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          {r.status === "ready" ? (
                            <Badge variant="secondary">{rank ? `${rank}º` : "fora"}</Badge>
                          ) : (
                            <Badge variant="outline">{STATUS[r.status]}</Badge>
                          )}
                          <ChevronRightIcon className="size-4 text-muted-foreground" />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </section>
      </div>
    </>
  );
}
