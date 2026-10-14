import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3Icon,
  CameraIcon,
  CarIcon,
  CheckIcon,
  CoffeeIcon,
  CreditCardIcon,
  DumbbellIcon,
  GlobeIcon,
  HotelIcon,
  MapPinIcon,
  MessageCircleIcon,
  PawPrintIcon,
  ScissorsIcon,
  ShoppingBagIcon,
  SmartphoneNfcIcon,
  StarIcon,
  StethoscopeIcon,
  UtensilsCrossedIcon,
  UtensilsIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ArtPreview, type ArtData } from "@/components/cards/print-art";
import { CtaButton } from "@/components/landing/cta-button";
import { PhoneMock } from "@/components/landing/phone-mock";
import { WhatsAppFab } from "@/components/landing/whatsapp-fab";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { CARD_COPY, displayUrl, qrPath } from "@/lib/card";
import { getSiteSettings } from "@/lib/settings";
import { siteConfig, whatsappHref } from "@/lib/site-config";
import { getSiteUrl } from "@/lib/urls";

export const metadata: Metadata = {
  title: { absolute: "TopTap · Mais avaliações no Google com um toque" },
  description:
    "Placa de balcão e cartão com NFC e QR Code que levam o cliente direto para a avaliação do seu negócio no Google. Sem app, funciona em iPhone e Android.",
};

const siteUrl = getSiteUrl();

const demoCard: ArtData = {
  copy: CARD_COPY.review,
  qr: qrPath(siteUrl),
  url: displayUrl(siteUrl),
};

const NAV = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#modelos", label: "Modelos" },
  { href: "#duvidas", label: "Dúvidas" },
];

const STEPS = [
  { icon: SmartphoneNfcIcon, title: "Aproxima", text: "O cliente encosta o celular na placa ou lê o QR Code." },
  { icon: StarIcon, title: "Avalia", text: "A avaliação do seu negócio no Google abre na hora." },
  { icon: BarChart3Icon, title: "Acompanha", text: "Você vê cada toque no seu painel." },
];

const SEGMENTS = [
  { icon: UtensilsIcon, label: "Restaurantes" },
  { icon: CoffeeIcon, label: "Cafés e padarias" },
  { icon: ScissorsIcon, label: "Salões e barbearias" },
  { icon: StethoscopeIcon, label: "Clínicas" },
  { icon: CarIcon, label: "Oficinas" },
  { icon: HotelIcon, label: "Pousadas" },
  { icon: ShoppingBagIcon, label: "Lojas" },
  { icon: DumbbellIcon, label: "Academias" },
  { icon: PawPrintIcon, label: "Pet shops" },
];

const BEFORE = ["Abrir o Google", "Buscar o seu negócio", "Achar o perfil certo", "Rolar até as avaliações", "Tocar em “Avaliar”"];

const DESTINATIONS = [
  { icon: CameraIcon, label: "Instagram" },
  { icon: MessageCircleIcon, label: "WhatsApp" },
  { icon: UtensilsCrossedIcon, label: "Cardápio" },
  { icon: CreditCardIcon, label: "Pix" },
  { icon: GlobeIcon, label: "Site" },
  { icon: MapPinIcon, label: "Maps" },
];

const FAQ = [
  { q: "Precisa de aplicativo?", a: "Não. O celular lê o NFC ou o QR Code e abre a avaliação direto." },
  {
    q: "Funciona no iPhone?",
    a: "Sim, do iPhone XS em diante, sem app. No Android, basta o NFC ligado. E qualquer câmera lê o QR Code.",
  },
  {
    q: "O cliente é obrigado a dar 5 estrelas?",
    a: "Não. Ele avalia na página oficial do Google, do jeito que quiser. Avaliações espontâneas são as que mais valem.",
  },
  {
    q: "E se o meu link mudar?",
    a: "A placa grava o seu link TopTap. Trocamos o destino no painel e a mesma placa continua funcionando.",
  },
];

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="tt-reveal mx-auto mb-12 max-w-2xl text-center">
      <p className="mb-2 text-sm font-semibold text-primary">{eyebrow}</p>
      <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">{title}</h2>
    </div>
  );
}

// Página estática: regenerada quando as configurações mudam no painel.
export const revalidate = 3600;

export default async function LandingPage() {
  const settings = await getSiteSettings();
  return (
    <div className="flex flex-1 flex-col overflow-x-clip">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4">
          <Link href="/" aria-label="TopTap: início">
            <Logo className="h-8" />
          </Link>
          <nav aria-label="Seções" className="hidden gap-5 text-sm text-muted-foreground md:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="hover:text-foreground">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeSwitcher />
            <Link href="/login" className="hidden px-2 text-sm text-muted-foreground hover:text-foreground sm:inline">
              Entrar
            </Link>
            <CtaButton size="default" className="hidden sm:inline-flex">
              Quero minha placa
            </CtaButton>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero: a animação mostra o produto funcionando. */}
        <section className="relative overflow-hidden bg-brand-surface">
          <div
            className="pointer-events-none absolute -top-40 right-[-10rem] size-[36rem] rounded-full bg-[#4285F4]/15 blur-3xl"
            aria-hidden
          />
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pt-12 pb-16 md:grid-cols-[1fr_1fr] md:py-24">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h1 className="text-5xl leading-[1.04] font-semibold tracking-tight text-balance sm:text-6xl">
                Mais avaliações no Google. <span className="text-primary">Com um toque.</span>
              </h1>
              <p className="mt-5 max-w-md text-lg text-pretty text-muted-foreground">
                O cliente aproxima o celular da placa e avalia na hora. Sem app.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <CtaButton />
                <a
                  href="#como-funciona"
                  className="inline-flex h-11 items-center rounded-lg px-4 text-base font-medium text-foreground hover:bg-muted"
                >
                  Ver como funciona
                </a>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {["iPhone e Android", "QR Code incluso", "Chega pronta"].map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <CheckIcon className="size-4 shrink-0 text-[#34A853]" /> {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative mx-auto flex h-[24rem] w-full max-w-md items-center sm:h-[28rem]" aria-hidden>
              <div className="relative w-[13rem] sm:w-[16rem]">
                <div className="tt-float">
                  <ArtPreview product="placa-quadrada" style="classico" data={demoCard} className="shadow-2xl" />
                </div>
                {/* Ondas do NFC no momento do toque. */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="tt-ring absolute size-32 rounded-full border-2 border-[#4285F4] opacity-0" />
                  <span
                    className="tt-ring absolute size-32 rounded-full border-2 border-[#4285F4] opacity-0"
                    style={{ animationDelay: "0.25s" }}
                  />
                </div>
              </div>
              <div className="absolute right-0 bottom-0 z-10">
                <div className="tt-phone origin-bottom">
                  <PhoneMock />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Problema → solução */}
        <section className="mx-auto w-full max-w-6xl px-4 py-24">
          <SectionTitle eyebrow="O problema" title="Seu cliente gostou. Mas não avaliou." />
          <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
            <div className="tt-reveal rounded-3xl bg-card p-7 ring-1 ring-foreground/10">
              <p className="mb-5 font-heading text-lg font-semibold">Hoje: 5 passos</p>
              <ol className="grid gap-3">
                {BEFORE.map((step, i) => (
                  <li key={step} className="flex items-center gap-3 text-muted-foreground">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium tabular-nums">
                      {i + 1}
                    </span>
                    <span
                      className="tt-strike bg-[linear-gradient(#EA4335,#EA4335)] bg-size-[100%_2px] bg-position-[0_55%] bg-no-repeat opacity-55"
                      style={{ "--i": i } as React.CSSProperties}
                    >
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="tt-reveal flex flex-col justify-between gap-8 rounded-3xl bg-primary p-7 text-primary-foreground">
              <p className="font-heading text-lg font-semibold">Com TopTap</p>
              <div>
                <p className="font-heading text-7xl leading-none font-semibold tracking-tight sm:text-8xl">1 toque</p>
                <p className="mt-3 text-lg opacity-90">E a avaliação já está aberta.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="scroll-mt-16 bg-brand-surface py-24">
          <div className="mx-auto w-full max-w-6xl px-4">
            <SectionTitle eyebrow="Como funciona" title="Aproxima. Avalia. Pronto." />
            <ol className="grid gap-4 md:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, text }, i) => (
                <li
                  key={title}
                  className="tt-reveal group relative overflow-hidden rounded-3xl bg-card p-7 ring-1 ring-foreground/10 transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <span
                    className="absolute -top-4 right-3 font-heading text-[7rem] leading-none font-semibold text-foreground/[0.04] tabular-nums"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <span className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground transition group-hover:scale-110 group-hover:rotate-6">
                    <Icon className="size-6" />
                  </span>
                  <h3 className="mb-1 text-2xl font-semibold">{title}</h3>
                  <p className="text-muted-foreground">{text}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Segmentos rolando */}
          <div className="mt-16 overflow-hidden mask-x-from-85% mask-x-to-100%" aria-label="Para quem é">
            <ul className="tt-marquee flex w-max gap-3">
              {[...SEGMENTS, ...SEGMENTS].map(({ icon: Icon, label }, i) => (
                <li
                  key={i}
                  aria-hidden={i >= SEGMENTS.length}
                  className="flex shrink-0 items-center gap-2 rounded-full bg-background px-4 py-2 text-sm ring-1 ring-foreground/10"
                >
                  <Icon className="size-4 text-primary" /> {label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Produto */}
        <section id="modelos" className="mx-auto w-full max-w-6xl scroll-mt-16 px-4 py-24">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="tt-reveal order-2 md:order-1">
              <p className="mb-2 text-sm font-semibold text-primary">A placa</p>
              <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">Chega pronta. É só colar.</h2>
              <ul className="mt-8 grid gap-4">
                {[
                  { icon: SmartphoneNfcIcon, text: "NFC + QR Code grande" },
                  { icon: StarIcon, text: "Já com o link da sua avaliação" },
                  { icon: CheckIcon, text: "10 × 10 cm, adesivo no verso" },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3 text-lg">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                      <Icon className="size-5" />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
              <div className="mt-10">
                <CtaButton>Quero a minha</CtaButton>
              </div>
            </div>
            <div className="tt-reveal order-1 flex justify-center perspective-[1200px] md:order-2">
              <div className="tt-tilt w-full max-w-sm">
                <ArtPreview product="placa-quadrada" style="classico" data={demoCard} className="shadow-2xl" />
              </div>
            </div>
          </div>
        </section>

        {/* Personalizado */}
        <section id="personalizado" className="scroll-mt-16 bg-brand-surface py-24">
          <div className="tt-reveal mx-auto flex w-full max-w-3xl flex-col items-center px-4 text-center">
            <p className="mb-2 text-sm font-semibold text-primary">Personalizado</p>
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">Com a sua marca. Para onde quiser.</h2>
            <ul className="mt-8 flex flex-wrap justify-center gap-2">
              {DESTINATIONS.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-1.5 rounded-full bg-background px-4 py-2 text-sm ring-1 ring-foreground/10 transition hover:-translate-y-0.5 hover:ring-primary"
                >
                  <Icon className="size-4 text-primary" /> {label}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              {settings.whatsapp ? (
                <a
                  href={whatsappHref(
                    settings.whatsapp,
                    "Olá! Quero um orçamento de placa/cartão TopTap personalizado com a identidade visual do meu negócio.",
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#25D366] px-5 text-base font-semibold text-[#063D1E] hover:brightness-95"
                >
                  <MessageCircleIcon className="size-5" /> Pedir orçamento
                </a>
              ) : (
                <CtaButton>Pedir orçamento</CtaButton>
              )}
            </div>
          </div>
        </section>

        {/* Dúvidas */}
        <section id="duvidas" className="mx-auto w-full max-w-3xl scroll-mt-16 px-4 py-24">
          <SectionTitle eyebrow="Dúvidas" title="Perguntas rápidas" />
          <div className="tt-reveal divide-y rounded-3xl ring-1 ring-foreground/10">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {q}
                  <span className="text-xl leading-none text-muted-foreground transition group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 text-pretty text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="px-4 pb-24">
          <div className="tt-reveal relative mx-auto flex max-w-5xl flex-col items-center gap-7 overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center text-primary-foreground">
            <div className="flex gap-1" aria-hidden>
              {Array.from({ length: 5 }, (_, i) => (
                <StarIcon key={i} className="size-7 fill-[#FBBC05] text-[#FBBC05]" />
              ))}
            </div>
            <h2 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Sua próxima avaliação está a um toque.
            </h2>
            <CtaButton variant="secondary" />
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Logo className="h-6" />
            <span>© {new Date().getFullYear()} {siteConfig.name}</span>
          </div>
          <div className="flex flex-wrap gap-4">
            {siteConfig.instagram && (
              <a href={`https://instagram.com/${siteConfig.instagram}`} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                Instagram
              </a>
            )}
            <Link href="/login" className="hover:text-foreground">
              Área do parceiro
            </Link>
          </div>
        </div>
        <p className="mx-auto w-full max-w-6xl px-4 pb-24 text-xs text-muted-foreground sm:pb-8">
          Google e Google Maps são marcas da Google LLC. A TopTap é um serviço independente, sem afiliação com o Google.
        </p>
      </footer>
      <WhatsAppFab number={settings.whatsapp} />
    </div>
  );
}
