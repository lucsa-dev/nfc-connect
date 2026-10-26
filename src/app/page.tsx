import type { Metadata } from "next";
import Link from "next/link";
import {
  BrainIcon,
  CalendarCheckIcon,
  CameraIcon,
  CarIcon,
  CheckIcon,
  CoffeeIcon,
  CreditCardIcon,
  DumbbellIcon,
  GlobeIcon,
  HandshakeIcon,
  HotelIcon,
  MapIcon,
  MapPinIcon,
  MessageCircleIcon,
  MessageSquareWarningIcon,
  PawPrintIcon,
  ScissorsIcon,
  SearchIcon,
  ShoppingBagIcon,
  SmartphoneNfcIcon,
  SparklesIcon,
  StarIcon,
  StethoscopeIcon,
  SwordsIcon,
  TrendingUpIcon,
  UtensilsCrossedIcon,
  UtensilsIcon,
  WalletIcon,
  WifiIcon,
  type LucideIcon,
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
  title: { absolute: "TopTap · Monitoramento da sua reputação no Google Maps por 12 meses" },
  description:
    "Mais avaliações e mais destaque no Google Maps: placa com NFC para o cliente avaliar em um toque e um relatório por mês, durante 12 meses, com sua posição, seus concorrentes e o que fazer para subir. Pagamento único, sem mensalidade.",
};

const siteUrl = getSiteUrl();

const demoCard: ArtData = {
  copy: CARD_COPY.review,
  qr: qrPath(siteUrl),
  url: displayUrl(siteUrl),
};

/** Cores da marca (as do Google, da logo). Os tons escuros têm contraste com texto branco. */
const BRAND = {
  blue: { fg: "#1A73E8", soft: "bg-[#4285F4]/12", text: "text-[#1A73E8] dark:text-[#8AB4F8]" },
  red: { fg: "#EA4335", soft: "bg-[#EA4335]/12", text: "text-[#C5221F] dark:text-[#F28B82]" },
  yellow: { fg: "#FBBC05", soft: "bg-[#FBBC05]/18", text: "text-[#B06000] dark:text-[#FDD663]" },
  green: { fg: "#34A853", soft: "bg-[#34A853]/14", text: "text-[#188038] dark:text-[#81C995]" },
} as const;
type BrandColor = keyof typeof BRAND;

const NAV = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#relatorio", label: "Relatório mensal" },
  { href: "#plano", label: "Plano" },
  { href: "#duvidas", label: "Dúvidas" },
];

const PILLARS: Array<{ icon: LucideIcon; color: BrandColor; title: string; text: string }> = [
  { icon: StarIcon, color: "yellow", title: "Mais avaliações", text: "Placa com NFC e QR Code: o cliente avalia em um toque, sem procurar seu perfil." },
  { icon: MapPinIcon, color: "blue", title: "Posição no Maps", text: "Onde você aparece quando alguém busca o que você vende na sua região." },
  { icon: SwordsIcon, color: "red", title: "Concorrentes", text: "Quem está na sua frente, quanto cresce por mês e quanto falta para passar." },
  { icon: TrendingUpIcon, color: "green", title: "Evolução mensal", text: "Um relatório novo todo mês, comparado com o anterior, durante 12 meses." },
];

const BEFORE = ["Abrir o Google", "Buscar o seu negócio", "Achar o perfil certo", "Rolar até as avaliações", "Tocar em “Avaliar”"];

const STEPS: Array<{ icon: LucideIcon; color: BrandColor; when: string; title: string; text: string }> = [
  {
    icon: SearchIcon,
    color: "blue",
    when: "Hoje",
    title: "Diagnóstico grátis",
    text: "Achamos seu negócio no Google e mostramos onde você está e quantas avaliações faltam para crescer.",
  },
  {
    icon: SmartphoneNfcIcon,
    color: "yellow",
    when: "Em poucos dias",
    title: "Placa no balcão",
    text: "Chega pronta, com o link da sua avaliação. Você cola e os clientes já podem avaliar.",
  },
  {
    icon: CalendarCheckIcon,
    color: "green",
    when: "Todo mês",
    title: "Relatório na mão",
    text: "Sua posição, seus concorrentes e o que fazer no mês seguinte. São 12 relatórios no ano.",
  },
];

const REPORT_ITEMS: Array<{ icon: LucideIcon; color: BrandColor; title: string; text: string }> = [
  { icon: MapPinIcon, color: "blue", title: "Posição na busca", text: "Em que lugar você aparece na busca que o seu cliente faz." },
  { icon: MapIcon, color: "blue", title: "Mapa de ranking", text: "Sua posição de vários pontos do bairro, não só da porta da loja." },
  { icon: SwordsIcon, color: "red", title: "Você × concorrentes", text: "Nota, avaliações e ritmo de cada um, lado a lado." },
  { icon: TrendingUpIcon, color: "green", title: "Quanto falta", text: "Quantas avaliações por mês você precisa para passar quem está na frente." },
  { icon: BrainIcon, color: "yellow", title: "O que os clientes dizem", text: "Elogios e reclamações, seus e dos concorrentes, lidos por IA." },
  { icon: MessageSquareWarningIcon, color: "red", title: "Negativas sem resposta", text: "As avaliações ruins que ainda pedem uma resposta sua." },
  { icon: SparklesIcon, color: "yellow", title: "Oportunidades no perfil", text: "O que os concorrentes mostram no Google e você ainda não." },
  { icon: SmartphoneNfcIcon, color: "green", title: "Resultado da placa", text: "Quantos clientes tocaram na placa e quantas avaliações chegaram." },
];

/** Posição no Maps mês a mês, só para ilustrar o relatório. */
const RANK_EXAMPLE = [9, 9, 7, 6, 6, 5, 4, 4, 3, 3, 2, 2];

const INCLUDED = [
  "Placa de balcão com NFC e QR Code, pronta para colar",
  "12 relatórios mensais de reputação e concorrência",
  "Mapa de ranking no Google Maps",
  "Leitura das avaliações por IA",
  "Painel com os toques e as avaliações",
  "Troca do destino da placa quando quiser",
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

const DESTINATIONS = [
  { icon: CameraIcon, label: "Instagram" },
  { icon: MessageCircleIcon, label: "WhatsApp" },
  { icon: UtensilsCrossedIcon, label: "Cardápio" },
  { icon: CreditCardIcon, label: "Pix" },
  { icon: WifiIcon, label: "Wi-Fi" },
  { icon: GlobeIcon, label: "Site" },
];

const FAQ = [
  {
    q: "Tem mensalidade?",
    a: "Não. É um pagamento único que cobre 12 meses de monitoramento, com um relatório por mês. Sem fidelidade e sem cobrança recorrente.",
  },
  {
    q: "O que acontece depois dos 12 meses?",
    a: "A placa continua levando seus clientes para a avaliação. Os relatórios mensais param, e você pode renovar o acompanhamento se quiser.",
  },
  {
    q: "Vocês garantem o 1º lugar no Google Maps?",
    a: "Ninguém pode garantir: quem decide a ordem é o Google. A quantidade, a nota e a frequência das avaliações pesam na posição. A TopTap ajuda a conseguir mais avaliações e mostra, todo mês, onde você está e o que fazer para subir.",
  },
  {
    q: "Precisa de aplicativo?",
    a: "Não. O celular lê o NFC ou o QR Code e abre a avaliação direto. Funciona no iPhone (do XS em diante) e no Android com NFC ligado. Qualquer câmera lê o QR Code.",
  },
  {
    q: "O cliente é obrigado a dar 5 estrelas?",
    a: "Não. Ele avalia na página oficial do Google, do jeito que quiser. Avaliações espontâneas são as que mais valem, e o Google proíbe comprar ou filtrar avaliações.",
  },
  {
    q: "Como recebo o relatório?",
    a: "Todo mês você recebe o link do relatório do seu negócio para abrir no celular ou no computador, com a comparação com o mês anterior.",
  },
];

function SectionTitle({ eyebrow, title, text, color = "blue" }: { eyebrow: string; title: string; text?: string; color?: BrandColor }) {
  return (
    <div className="tt-reveal mx-auto mb-12 max-w-2xl text-center">
      <p className={`mb-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${BRAND[color].soft} ${BRAND[color].text}`}>{eyebrow}</p>
      <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">{title}</h2>
      {text && <p className="mt-4 text-lg text-pretty text-muted-foreground">{text}</p>}
    </div>
  );
}

function IconBadge({ icon: Icon, color, className = "size-12 rounded-2xl" }: { icon: LucideIcon; color: BrandColor; className?: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center ${BRAND[color].soft} ${BRAND[color].text} ${className}`}>
      <Icon className="size-[45%]" />
    </span>
  );
}

/** Faixa com as quatro cores da logo. */
function BrandStripe({ className = "" }: { className?: string }) {
  return (
    <div className={`flex h-1.5 overflow-hidden rounded-full ${className}`} aria-hidden>
      <span className="flex-1 bg-[#4285F4]" />
      <span className="flex-1 bg-[#EA4335]" />
      <span className="flex-1 bg-[#FBBC05]" />
      <span className="flex-1 bg-[#34A853]" />
    </div>
  );
}

/** Relatório de exemplo: posição no Maps subindo mês a mês e os números do mês. */
function ReportMock() {
  const worst = Math.max(...RANK_EXAMPLE);
  return (
    <div className="relative rounded-3xl bg-card p-5 shadow-2xl ring-1 ring-foreground/10 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Relatório do mês 12</p>
          <p className="font-heading text-lg font-semibold">Padaria Exemplo</p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">Exemplo ilustrativo</span>
      </div>
      <BrandStripe className="mt-4" />

      <p className="mt-5 text-sm font-medium">Posição na busca “padaria” · 12 meses</p>
      <div className="mt-3 flex h-36 items-end gap-1.5" role="img" aria-label="Posição subindo do 9º para o 2º lugar em 12 meses">
        {RANK_EXAMPLE.map((rank, i) => {
          const last = i === RANK_EXAMPLE.length - 1;
          return (
            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <span className={`text-[10px] font-semibold tabular-nums ${last ? BRAND.green.text : "text-muted-foreground"}`}>{rank}º</span>
              <span
                className={`w-full rounded-t-md ${last ? "bg-[#34A853]" : "bg-[#4285F4]/70"}`}
                style={{ height: `${((worst + 1 - rank) / worst) * 100}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground" aria-hidden>
        <span>mês 1</span>
        <span>mês 12</span>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-2.5">
        {(
          [
            { label: "Posição", value: "2º", note: "subiu 7", color: "blue" },
            { label: "Avaliações no mês", value: "+14", note: "o 1º fez 11", color: "yellow" },
            { label: "Toques na placa", value: "86", note: "últimos 30 dias", color: "green" },
            { label: "Negativas sem resposta", value: "0", note: "tudo respondido", color: "red" },
          ] as const
        ).map((s) => (
          <div key={s.label} className={`rounded-2xl p-3 ${BRAND[s.color].soft}`}>
            <dt className="text-[11px] text-muted-foreground">{s.label}</dt>
            <dd className={`font-heading text-2xl font-semibold tabular-nums ${BRAND[s.color].text}`}>{s.value}</dd>
            <dd className="text-[11px] text-muted-foreground">{s.note}</dd>
          </div>
        ))}
      </dl>
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
              Diagnóstico grátis
            </CtaButton>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero: a animação mostra a placa funcionando; o cartão, o relatório do mês. */}
        <section className="relative overflow-hidden bg-brand-surface">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute -top-32 right-[-8rem] size-[30rem] rounded-full bg-[#4285F4]/20 blur-3xl" />
            <div className="absolute top-1/3 right-1/3 size-[18rem] rounded-full bg-[#FBBC05]/15 blur-3xl" />
            <div className="absolute -bottom-24 left-[-6rem] size-[24rem] rounded-full bg-[#34A853]/15 blur-3xl" />
            <div className="absolute top-10 left-1/3 size-[12rem] rounded-full bg-[#EA4335]/10 blur-3xl" />
          </div>
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pt-12 pb-16 md:grid-cols-[1.05fr_1fr] md:py-24">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1.5 text-sm font-medium ring-1 ring-foreground/10 backdrop-blur">
                <span className="flex gap-0.5" aria-hidden>
                  {(["#4285F4", "#EA4335", "#FBBC05", "#34A853"] as const).map((c) => (
                    <span key={c} className="size-2 rounded-full" style={{ background: c }} />
                  ))}
                </span>
                Monitoramento de reputação no Google Maps
              </p>
              <h1 className="text-5xl leading-[1.04] font-semibold tracking-tight text-balance sm:text-6xl">
                Mais avaliações. Mais destaque no Maps.{" "}
                <span className="bg-gradient-to-r from-[#1A73E8] via-[#34A853] to-[#FBBC05] bg-clip-text text-transparent">
                  Acompanhado todo mês.
                </span>
              </h1>
              <p className="mt-5 max-w-lg text-lg text-pretty text-muted-foreground">
                Durante 12 meses, a TopTap ajuda o seu negócio a crescer no Google: uma placa para o cliente avaliar em um toque e um
                relatório por mês com sua posição, seus concorrentes e o próximo passo.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <CtaButton>Fazer diagnóstico grátis</CtaButton>
                <a
                  href="#relatorio"
                  className="inline-flex h-11 items-center rounded-lg px-4 text-base font-medium text-foreground hover:bg-muted"
                >
                  Ver o relatório
                </a>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {["Pagamento único", "Sem mensalidade", "12 relatórios mensais"].map((item) => (
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
              {/* Resumo do relatório do mês (ilustrativo). */}
              <div className="tt-float absolute top-2 -left-2 z-20 flex items-center gap-3 rounded-2xl bg-card px-3.5 py-2.5 shadow-xl ring-1 ring-foreground/10 sm:-left-8">
                <IconBadge icon={TrendingUpIcon} color="green" className="size-9 rounded-xl" />
                <span className="text-left">
                  <span className="block text-[11px] text-muted-foreground">Relatório do mês</span>
                  <span className="block text-sm font-semibold">
                    5º → <span className={BRAND.green.text}>3º lugar</span> no Maps
                  </span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Os quatro pilares do serviço, um em cada cor. */}
        <section className="mx-auto w-full max-w-6xl px-4 py-20">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p) => (
              <li
                key={p.title}
                className="tt-reveal group relative overflow-hidden rounded-3xl bg-card p-6 ring-1 ring-foreground/10 transition hover:-translate-y-1 hover:shadow-xl"
              >
                <span className="absolute inset-x-0 top-0 h-1" style={{ background: BRAND[p.color].fg }} aria-hidden />
                <IconBadge icon={p.icon} color={p.color} className="mb-5 size-12 rounded-2xl transition group-hover:scale-110 group-hover:rotate-6" />
                <h3 className="mb-1 text-xl font-semibold">{p.title}</h3>
                <p className="text-sm text-muted-foreground">{p.text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Problema → solução */}
        <section className="bg-brand-surface py-24">
          <div className="mx-auto w-full max-w-6xl px-4">
            <SectionTitle
              eyebrow="O problema"
              color="red"
              title="Quem tem mais avaliações aparece primeiro. E leva o cliente."
              text="O Google é onde o brasileiro procura onde comer, cortar o cabelo ou levar o carro. O cliente satisfeito até quer avaliar, mas são cinco passos. E ninguém te avisa quando o concorrente passa na sua frente."
            />
            <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
              <div className="tt-reveal rounded-3xl bg-card p-7 ring-1 ring-foreground/10">
                <p className="mb-5 font-heading text-lg font-semibold">Hoje: 5 passos para avaliar</p>
                <ol className="grid gap-3">
                  {BEFORE.map((step, i) => (
                    <li key={step} className="flex items-center gap-3 text-muted-foreground">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#EA4335]/12 text-xs font-medium text-[#C5221F] tabular-nums dark:text-[#F28B82]">
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
              <div className="tt-reveal relative flex flex-col justify-between gap-8 overflow-hidden rounded-3xl bg-gradient-to-br from-[#1A73E8] to-[#174EA6] p-7 text-white">
                <div className="absolute -right-10 -bottom-10 size-48 rounded-full bg-[#34A853]/40 blur-2xl" aria-hidden />
                <p className="relative font-heading text-lg font-semibold">Com TopTap</p>
                <div className="relative">
                  <p className="font-heading text-7xl leading-none font-semibold tracking-tight sm:text-8xl">1 toque</p>
                  <p className="mt-3 text-lg opacity-90">para avaliar. E um relatório por mês para você saber se está funcionando.</p>
                </div>
              </div>
            </div>
            <p className="tt-reveal mx-auto mt-8 max-w-2xl text-center text-xs text-muted-foreground">
              Segundo a pesquisa Local Consumer Review Survey 2025, da BrightLocal, 83% dos consumidores usam o Google para ler avaliações.
            </p>
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="mx-auto w-full max-w-6xl scroll-mt-16 px-4 py-24">
          <SectionTitle eyebrow="Como funciona" title="Um ano cuidando da sua reputação." text="Você atende bem. A gente transforma isso em avaliação e acompanha o resultado." />
          <ol className="grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="tt-reveal relative flex flex-col items-center rounded-3xl bg-card p-7 text-center ring-1 ring-foreground/10">
                <span
                  className="mb-5 flex size-14 items-center justify-center rounded-full text-white shadow-lg ring-4 ring-background"
                  style={{ background: BRAND[s.color].fg }}
                >
                  <s.icon className="size-6" />
                </span>
                <p className={`text-xs font-semibold tracking-wide uppercase ${BRAND[s.color].text}`}>
                  {i + 1}. {s.when}
                </p>
                <h3 className="mt-1 mb-2 text-2xl font-semibold">{s.title}</h3>
                <p className="text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Relatório mensal */}
        <section id="relatorio" className="relative scroll-mt-16 overflow-hidden bg-brand-surface py-24">
          <div className="pointer-events-none absolute top-1/4 -right-32 size-[26rem] rounded-full bg-[#34A853]/12 blur-3xl" aria-hidden />
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 md:grid-cols-[1fr_1.05fr]">
            <div className="tt-reveal">
              <p className={`mb-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${BRAND.green.soft} ${BRAND.green.text}`}>
                Relatório mensal
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">Seu Google Maps, mês a mês.</h2>
              <p className="mt-4 text-lg text-pretty text-muted-foreground">
                Todo mês, um relatório novo comparado com o anterior. Sem planilha e sem termo técnico: você entende em dois minutos.
              </p>
              <ul className="mt-8 grid gap-x-6 gap-y-5 sm:grid-cols-2">
                {REPORT_ITEMS.map((item) => (
                  <li key={item.title} className="flex gap-3">
                    <IconBadge icon={item.icon} color={item.color} className="size-10 rounded-xl" />
                    <span>
                      <span className="block font-medium">{item.title}</span>
                      <span className="block text-sm text-muted-foreground">{item.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="tt-reveal">
              <ReportMock />
            </div>
          </div>
        </section>

        {/* Plano: pagamento único, 12 meses */}
        <section id="plano" className="mx-auto w-full max-w-6xl scroll-mt-16 px-4 py-24">
          <SectionTitle
            eyebrow="O plano"
            color="yellow"
            title="Um pagamento. 12 meses de acompanhamento."
            text="Nada de mensalidade nem fidelidade. Você paga uma vez e tem um ano inteiro de monitoramento."
          />
          <div className="tt-reveal mx-auto grid max-w-5xl overflow-hidden rounded-3xl ring-1 ring-foreground/10 md:grid-cols-[1fr_1.1fr]">
            <div className="relative flex flex-col justify-between gap-8 overflow-hidden bg-gradient-to-br from-[#1A73E8] via-[#1967D2] to-[#174EA6] p-8 text-white">
              <div className="absolute -top-16 -right-16 size-56 rounded-full bg-[#FBBC05]/30 blur-3xl" aria-hidden />
              <div className="relative">
                <p className="font-heading text-lg font-semibold">Plano anual TopTap</p>
                <p className="mt-6 font-heading text-6xl leading-none font-semibold tracking-tight">12 meses</p>
                <p className="mt-2 text-lg opacity-90">12 relatórios · 1 placa · 1 pagamento</p>
              </div>
              <div className="relative grid grid-cols-12 gap-1" aria-label="Um relatório por mês, durante 12 meses">
                {Array.from({ length: 12 }, (_, i) => (
                  <span key={i} className="flex aspect-square items-center justify-center rounded-md bg-white/15 text-[10px] font-semibold tabular-nums">
                    {i + 1}
                  </span>
                ))}
              </div>
              <div className="relative">
                <CtaButton variant="secondary">Começar pelo diagnóstico</CtaButton>
              </div>
            </div>
            <div className="bg-card p-8">
              <p className="mb-5 font-heading text-lg font-semibold">O que está incluso</p>
              <ul className="grid gap-3.5">
                {INCLUDED.map((item, i) => {
                  const color = (["blue", "red", "yellow", "green"] as const)[i % 4];
                  return (
                    <li key={item} className="flex items-start gap-3">
                      <IconBadge icon={CheckIcon} color={color} className="mt-0.5 size-6 rounded-full" />
                      <span>{item}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-8 grid grid-cols-3 gap-2 text-center text-sm">
                {(
                  [
                    { icon: WalletIcon, label: "Sem mensalidade", color: "red" },
                    { icon: SmartphoneNfcIcon, label: "Sem app", color: "blue" },
                    { icon: HandshakeIcon, label: "Sem fidelidade", color: "green" },
                  ] as const
                ).map((b) => (
                  <div key={b.label} className={`rounded-2xl px-2 py-3 ${BRAND[b.color].soft}`}>
                    <b.icon className={`mx-auto mb-1 size-5 ${BRAND[b.color].text}`} />
                    <span className="font-medium">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Segmentos rolando */}
        <section className="bg-brand-surface py-16">
          <p className="tt-reveal mb-6 text-center text-sm font-medium text-muted-foreground">Para quem depende do cliente que procura no Google</p>
          <div className="overflow-hidden mask-x-from-85% mask-x-to-100%" aria-label="Para quem é">
            <ul className="tt-marquee flex w-max gap-3">
              {[...SEGMENTS, ...SEGMENTS].map(({ icon: Icon, label }, i) => {
                const color = (["blue", "red", "yellow", "green"] as const)[i % 4];
                return (
                  <li
                    key={i}
                    aria-hidden={i >= SEGMENTS.length}
                    className="flex shrink-0 items-center gap-2 rounded-full bg-background px-4 py-2 text-sm ring-1 ring-foreground/10"
                  >
                    <Icon className={`size-4 ${BRAND[color].text}`} /> {label}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Personalizado */}
        <section id="personalizado" className="scroll-mt-16 py-24">
          <div className="tt-reveal mx-auto flex w-full max-w-3xl flex-col items-center px-4 text-center">
            <p className={`mb-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${BRAND.red.soft} ${BRAND.red.text}`}>Vai além da avaliação</p>
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">Com a sua marca. Para onde quiser.</h2>
            <p className="mt-4 text-lg text-pretty text-muted-foreground">
              Placas e cartões com a identidade do seu negócio, levando o cliente para o Instagram, o cardápio, o Pix ou a senha do Wi-Fi.
            </p>
            <ul className="mt-8 flex flex-wrap justify-center gap-2">
              {DESTINATIONS.map(({ icon: Icon, label }, i) => {
                const color = (["blue", "red", "yellow", "green"] as const)[i % 4];
                return (
                  <li
                    key={label}
                    className="flex items-center gap-1.5 rounded-full bg-background px-4 py-2 text-sm ring-1 ring-foreground/10 transition hover:-translate-y-0.5 hover:ring-primary"
                  >
                    <Icon className={`size-4 ${BRAND[color].text}`} /> {label}
                  </li>
                );
              })}
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
        <section id="duvidas" className="mx-auto w-full max-w-3xl scroll-mt-16 px-4 pb-24">
          <SectionTitle eyebrow="Dúvidas" title="Perguntas frequentes" />
          <div className="tt-reveal divide-y rounded-3xl bg-card ring-1 ring-foreground/10">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {q}
                  <span className="text-xl leading-none text-primary transition group-open:rotate-45" aria-hidden>
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
          <div className="tt-reveal relative mx-auto flex max-w-5xl flex-col items-center gap-7 overflow-hidden rounded-3xl bg-gradient-to-br from-[#1A73E8] to-[#174EA6] px-6 py-16 text-center text-white">
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              <div className="absolute -top-20 -left-16 size-64 rounded-full bg-[#EA4335]/30 blur-3xl" />
              <div className="absolute -right-10 -bottom-24 size-72 rounded-full bg-[#34A853]/35 blur-3xl" />
              <div className="absolute top-0 right-1/4 size-40 rounded-full bg-[#FBBC05]/25 blur-3xl" />
            </div>
            <div className="relative flex gap-1" aria-hidden>
              {Array.from({ length: 5 }, (_, i) => (
                <StarIcon key={i} className="size-7 fill-[#FBBC05] text-[#FBBC05]" />
              ))}
            </div>
            <h2 className="relative max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Descubra em que lugar você está no Google Maps.
            </h2>
            <p className="relative max-w-xl text-lg text-pretty opacity-90">
              O diagnóstico é grátis e leva um minuto: você vê sua posição, seus concorrentes e quantas avaliações faltam.
            </p>
            <CtaButton variant="secondary" className="relative">
              Fazer diagnóstico grátis
            </CtaButton>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <BrandStripe className="mx-auto -mt-px h-1 w-full max-w-6xl rounded-none" />
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Logo className="h-6" />
            <span>© {new Date().getFullYear()} {siteConfig.name} · Monitoramento de reputação no Google Maps</span>
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
