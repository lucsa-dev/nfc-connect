import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QrCode } from "@/components/dashboard/qr-code";
import { PixCopy } from "@/components/pix-copy";
import { formatCurrency } from "@/lib/format";
import { buildPixPayload } from "@/lib/pix";
import { isValidSlug } from "@/lib/slug";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pagamento Pix", robots: { index: false } };

export default async function PixPage({ params }: PageProps<"/[business]/[link]/pix">) {
  const { business, link } = await params;
  if (!isValidSlug(business) || !isValidSlug(link)) notFound();

  const { data } = await createAdminClient()
    .from("links")
    .select("name, pix_key, pix_name, pix_city, pix_amount, pix_description, businesses!inner(name, slug)")
    .eq("businesses.slug", business)
    .eq("slug", link)
    .eq("type", "pix")
    .eq("is_active", true)
    .maybeSingle();

  if (!data?.pix_key || !data.pix_name || !data.pix_city) notFound();

  const amount = data.pix_amount ? Number(data.pix_amount) : null;
  const payload = buildPixPayload({
    key: data.pix_key,
    merchantName: data.pix_name,
    merchantCity: data.pix_city,
    amount,
    description: data.pix_description,
  });

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="grid w-full max-w-sm gap-5 rounded-2xl bg-card p-6 text-center ring-1 ring-foreground/10">
        <div>
          <p className="text-sm text-muted-foreground">Pagamento via Pix para</p>
          <h1 className="text-xl font-semibold">{data.businesses.name}</h1>
          {amount && <p className="mt-2 text-3xl font-semibold tabular-nums">{formatCurrency(amount)}</p>}
          {data.pix_description && <p className="mt-1 text-sm text-muted-foreground">{data.pix_description}</p>}
        </div>
        <div className="flex justify-center">
          <QrCode value={payload} filename="pix" size={220} downloadable={false} />
        </div>
        <PixCopy payload={payload} />
        <ol className="grid gap-1 text-left text-sm text-muted-foreground">
          <li>1. Toque em &quot;Copiar código Pix&quot;.</li>
          <li>2. Abra o app do seu banco e escolha Pix Copia e Cola.</li>
          <li>3. Cole o código e confira o recebedor: <strong className="text-foreground">{data.pix_name}</strong>.</li>
        </ol>
      </div>
    </main>
  );
}
