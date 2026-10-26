import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { AtSignIcon, ChevronRightIcon, GlobeIcon, LinkIcon, QrCodeIcon, StarIcon, WifiIcon, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { MetaPixel } from "@/components/meta-pixel";
import { pageLinkHref, sortPageLinks } from "@/lib/business-page";
import { normalizeCode } from "@/lib/cards";
import { isValidSlug } from "@/lib/slug";
import { createAdminClient } from "@/lib/supabase/admin";
import { CARD_PARAM, SOURCE_PARAM } from "@/lib/urls";
import { extractVisitInfo } from "@/lib/visit";

// Sempre dinâmico: cada abertura é contada.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

function linkIcon(type: string, url: string | null): LucideIcon {
  if (type === "review") return StarIcon;
  if (type === "pix") return QrCodeIcon;
  if (type === "wifi") return WifiIcon;
  if (type === "business_card") return url?.includes("instagram.com") ? AtSignIcon : GlobeIcon;
  return LinkIcon;
}

export default async function BusinessLinksPage({ params, searchParams }: PageProps<"/[business]">) {
  const slug = (await params).business.toLowerCase();
  if (!isValidSlug(slug)) notFound();
  const query = await searchParams;
  const one = (key: string) => (typeof query[key] === "string" ? (query[key] as string) : null);

  const supabase = createAdminClient();
  const { data: business, error } = await supabase
    .from("businesses")
    .select("id, name, meta_pixel_id, links(name, slug, type, url, created_at)")
    .eq("slug", slug)
    .eq("links.is_active", true)
    .maybeSingle();
  if (error) throw new Error(`Falha ao buscar o negócio ${slug}: ${error.code} ${error.message}`);
  if (!business) notFound();

  // Registra a abertura depois de responder, com a peça que trouxe a pessoa.
  const code = normalizeCode(one(CARD_PARAM) ?? "");
  const requestHeaders = new Headers(await headers());
  const visitParams = new URLSearchParams();
  const source = one(SOURCE_PARAM);
  if (source) visitParams.set(SOURCE_PARAM, source);
  after(async () => {
    const { data: card } = code
      ? await supabase.from("cards").select("id").eq("code", code).eq("business_id", business.id).maybeSingle()
      : { data: null };
    const visit = await extractVisitInfo(requestHeaders, visitParams, process.env.IP_HASH_SALT ?? "");
    const { error } = await supabase
      .from("link_visits")
      .insert({ ...visit, link_id: null, card_id: card?.id ?? null, business_id: business.id });
    if (error) console.error("Falha ao registrar abertura da página", error);
  });

  const links = sortPageLinks(business.links);

  return (
    <main className="flex min-h-dvh flex-col items-center bg-brand-surface px-4 py-10">
      <MetaPixel pixelId={business.meta_pixel_id} />
      <div className="grid w-full max-w-md gap-6">
        <h1 className="text-center font-heading text-2xl font-semibold text-balance">{business.name}</h1>

        {links.length === 0 ? (
          <p className="rounded-2xl bg-card p-6 text-center text-muted-foreground ring-1 ring-foreground/10">
            Nenhum link disponível no momento.
          </p>
        ) : (
          <ul className="grid gap-3">
            {links.map((link) => {
              const Icon = linkIcon(link.type, link.url);
              const primary = link.type === "review";
              return (
                <li key={link.slug}>
                  <a
                    href={pageLinkHref(slug, link.slug, source)}
                    className={
                      primary
                        ? "flex min-h-14 items-center gap-3 rounded-2xl bg-primary px-5 py-3 font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
                        : "flex min-h-14 items-center gap-3 rounded-2xl bg-card px-5 py-3 font-medium shadow-sm ring-1 ring-foreground/10 transition-colors hover:bg-muted"
                    }
                  >
                    <Icon className="size-5 shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1 break-words">{link.name}</span>
                    <ChevronRightIcon className="size-4 shrink-0 opacity-60" aria-hidden />
                  </a>
                </li>
              );
            })}
          </ul>
        )}

        <Link href="/" className="justify-self-center opacity-70 transition-opacity hover:opacity-100" aria-label="TopTap">
          <Logo className="h-6" />
        </Link>
      </div>
    </main>
  );
}
