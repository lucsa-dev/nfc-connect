import type { Metadata } from "next";
import Link from "next/link";
import { InboxIcon } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { countLeadsByStatus, LEAD_STATUSES, listLeads, type LeadStatus } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { LEAD_STATUS_LABEL } from "@/lib/leads";
import { formatBRL } from "@/lib/pricing";
import { formatBrPhone } from "@/lib/quiz";

export const metadata: Metadata = { title: "Pedidos" };

const VARIANT: Record<LeadStatus, "default" | "secondary" | "outline"> = {
  lead: "default",
  quiz: "secondary",
  convertido: "outline",
  descartado: "outline",
};

export default async function LeadsPage({ searchParams }: PageProps<"/dashboard/pedidos">) {
  const raw = (await searchParams).status;
  const status = LEAD_STATUSES.find((s) => s === raw) ?? null;
  const [leads, counts] = await Promise.all([listLeads(status), countLeadsByStatus()]);

  const tabs: Array<{ id: LeadStatus | null; label: string; count?: number }> = [
    { id: null, label: "Todos" },
    ...LEAD_STATUSES.map((s) => ({ id: s, label: LEAD_STATUS_LABEL[s], count: counts[s] })),
  ];

  return (
    <>
      <PageHeader title="Pedidos" description="Pedidos e interessados que passaram pelo quiz em /comecar." />

      <div className="mb-4 flex flex-wrap rounded-lg bg-muted p-0.5 sm:w-fit" role="group" aria-label="Filtrar por status">
        {tabs.map((t) => (
          <Link
            key={t.id ?? "todos"}
            href={t.id ? `/dashboard/pedidos?status=${t.id}` : "/dashboard/pedidos"}
            aria-current={t.id === status ? "page" : undefined}
            className="rounded-md px-2.5 py-1 text-sm text-muted-foreground aria-[current=page]:bg-background aria-[current=page]:text-foreground aria-[current=page]:shadow-sm"
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1 tabular-nums opacity-70">{t.count}</span>}
          </Link>
        ))}
      </div>

      {leads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <InboxIcon className="size-10 text-muted-foreground" />
            <p className="font-medium">Nenhum pedido aqui</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Os pedidos chegam pelo quiz em <Link href="/comecar" className="text-primary hover:underline">/comecar</Link>.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Negócio</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Kit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Atualizado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <Link href={`/dashboard/pedidos/${l.id}`} className="font-medium hover:underline">
                      {l.place_name ?? "Sem nome"}
                    </Link>
                    {(l.place_city || l.place_state) && (
                      <div className="text-xs text-muted-foreground">{[l.place_city, l.place_state].filter(Boolean).join(" - ")}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {l.contact_name ?? "—"}
                    {l.whatsapp && <div className="text-xs text-muted-foreground tabular-nums">{formatBrPhone(l.whatsapp)}</div>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {[l.plaques ? `${l.plaques} placa(s)` : null, l.cards ? `${l.cards} cartão(ões)` : null].filter(Boolean).join(" + ") || "—"}
                    {l.total_cents ? <div className="text-xs text-muted-foreground">{formatBRL(l.total_cents)}</div> : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant={VARIANT[l.status as LeadStatus] ?? "outline"}>{LEAD_STATUS_LABEL[l.status as LeadStatus] ?? l.status}</Badge>
                    {l.status === "quiz" && l.step && <div className="mt-1 text-xs text-muted-foreground">parou em: {l.step}</div>}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground tabular-nums">{formatDateTime(l.updated_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
