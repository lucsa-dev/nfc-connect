import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WifiIcon } from "lucide-react";
import { WifiCopy } from "@/components/wifi-copy";
import { isValidSlug } from "@/lib/slug";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Wi-Fi", robots: { index: false } };

export default async function WifiPage({ params }: PageProps<"/[business]/[link]/wifi">) {
  const { business, link } = await params;
  if (!isValidSlug(business) || !isValidSlug(link)) notFound();

  const { data } = await createAdminClient()
    .from("links")
    .select("wifi_ssid, wifi_password, businesses!inner(name, slug)")
    .eq("businesses.slug", business)
    .eq("slug", link)
    .eq("type", "wifi")
    .eq("is_active", true)
    .maybeSingle();

  if (!data?.wifi_ssid) notFound();

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="grid w-full max-w-sm gap-5 rounded-2xl bg-card p-6 text-center ring-1 ring-foreground/10">
        <div className="grid justify-items-center gap-2">
          <WifiIcon className="size-10 text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">Wi-Fi de</p>
          <h1 className="text-xl font-semibold">{data.businesses.name}</h1>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Rede</p>
          <p className="text-lg font-medium break-words">{data.wifi_ssid}</p>
        </div>
        {data.wifi_password ? (
          <>
            <WifiCopy password={data.wifi_password} />
            <ol className="grid gap-1 text-left text-sm text-muted-foreground">
              <li>1. Toque em &quot;Copiar senha&quot;.</li>
              <li>
                2. Abra os ajustes de Wi-Fi do celular e escolha a rede <strong className="text-foreground">{data.wifi_ssid}</strong>.
              </li>
              <li>3. Cole a senha e conecte.</li>
            </ol>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Rede aberta: é só escolher nos ajustes de Wi-Fi do celular, sem senha.</p>
        )}
      </div>
    </main>
  );
}
