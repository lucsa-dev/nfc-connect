import type { Metadata } from "next";
import Link from "next/link";
import { MousePointerClickIcon, LinkIcon, StoreIcon } from "lucide-react";
import { BusinessFormDialog } from "@/components/dashboard/business-form-dialog";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listBusinesses } from "@/lib/data";
import { formatNumber } from "@/lib/format";
import { getSiteUrl } from "@/lib/urls";
import { createBusiness } from "./actions";

export const metadata: Metadata = { title: "Negócios" };

export default async function DashboardPage() {
  const businesses = await listBusinesses();
  const siteUrl = getSiteUrl();
  const host = siteUrl.replace(/^https?:\/\//, "");

  return (
    <>
      <PageHeader
        title="Negócios"
        description="Clientes com cartões NFC e QR Code."
        actions={<BusinessFormDialog action={createBusiness} siteUrl={siteUrl} />}
      />

      {businesses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <StoreIcon className="size-10 text-muted-foreground" />
            <p className="font-medium">Nenhum negócio cadastrado</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Adicione o primeiro cliente para criar links de avaliação, Pix ou cartão de visita.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((b) => (
            <Link key={b.id} href={`/dashboard/${b.id}`} className="group rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
              <Card className="h-full transition-colors group-hover:ring-primary/40">
                <CardHeader>
                  <CardTitle className="truncate">{b.name}</CardTitle>
                  <CardDescription className="truncate font-mono text-xs">
                    {host}/{b.slug}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <LinkIcon className="size-4" />
                    {b.linkCount} {b.linkCount === 1 ? "link" : "links"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MousePointerClickIcon className="size-4" />
                    {formatNumber(b.clickCount)} acessos
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
