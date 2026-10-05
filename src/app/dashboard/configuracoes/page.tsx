import type { Metadata } from "next";
import { CheckCircle2Icon, ExternalLinkIcon, OctagonAlertIcon } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { runDiagnostics } from "@/lib/diagnostics";
import { createClient } from "@/lib/supabase/server";
import { whatsappHref } from "@/lib/site-config";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("site_settings").select("whatsapp, updated_at").maybeSingle();
  if (error) throw error;
  const whatsapp = data?.whatsapp ?? null;
  const diagnostics = await runDiagnostics();

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

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Diagnóstico</CardTitle>
          <CardDescription>Confere as variáveis de ambiente deste servidor. Nenhum valor é exibido.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3">
            {diagnostics.map((d) => (
              <li key={d.label} className="flex gap-2.5 text-sm">
                {d.ok ? (
                  <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-[#188038]" />
                ) : (
                  <OctagonAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
                )}
                <span>
                  <span className="font-medium">{d.label}:</span> <span className="text-muted-foreground">{d.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
