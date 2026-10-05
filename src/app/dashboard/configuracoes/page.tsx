import type { Metadata } from "next";
import { ExternalLinkIcon } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { whatsappHref } from "@/lib/site-config";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("site_settings").select("whatsapp, updated_at").maybeSingle();
  if (error) throw error;
  const whatsapp = data?.whatsapp ?? null;

  return (
    <>
      <PageHeader title="Configurações" description="Dados de contato exibidos no site." />
      <Card>
        <CardHeader>
          <CardTitle>Contato</CardTitle>
          <CardDescription>As mudanças aparecem no site em alguns segundos.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <SettingsForm whatsapp={whatsapp} />
          {whatsapp && (
            <a
              href={whatsappHref(whatsapp, "Teste do botão do site TopTap")}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-fit items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLinkIcon className="size-3.5" /> Testar o link do WhatsApp
            </a>
          )}
        </CardContent>
      </Card>
    </>
  );
}
