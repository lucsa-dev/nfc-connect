import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpIcon, MessageCircleIcon, SearchIcon, StarIcon } from "lucide-react";
import { Logo, LogoIcon, NfcWaves } from "@/components/brand/logo";
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

/** Texto nas cores da marca, com contraste nos dois temas. */
const TEXT = {
  blue: "text-[#1A73E8] dark:text-[#8AB4F8]",
  red: "text-[#C5221F] dark:text-[#F28B82]",
  yellow: "text-[#B06000] dark:text-[#FDD663]",
  green: "text-[#188038] dark:text-[#81C995]",
} as const;

const NAV = [
  { href: "#problema", label: "O problema" },
  { href: "#ano", label: "Como funciona" },
  { href: "#relatorio", label: "Relatório" },
  { href: "#plano", label: "Plano" },
];

/** Busca de exemplo no Maps: o negócio com a melhor nota fica em 4º por ter poucas avaliações. */
const MAPS_RESULTS = [
  { name: "Padaria Pão Dourado", rating: 4.6, reviews: 612, meta: "Padaria · 400 m" },
  { name: "Panificadora Central", rating: 4.5, reviews: 438, meta: "Padaria · 650 m" },
  { name: "Casa do Pão", rating: 4.4, reviews: 297, meta: "Padaria · 300 m" },
  { name: "A sua padaria", rating: 4.9, reviews: 41, meta: "Padaria · 200 m", you: true },
];

const BEFORE = ["Abrir o Google", "Buscar o seu negócio", "Achar o perfil certo", "Rolar até as avaliações", "Tocar em “Avaliar”"];

/** Linha do tempo do plano: o que acontece em cada mês. */
const MILESTONES: Record<number, { title: string; color: keyof typeof TEXT; dot: string }> = {
  0: { title: "Diagnóstico", color: "blue", dot: "bg-[#4285F4]" },
  1: { title: "Placa no balcão", color: "yellow", dot: "bg-[#FBBC05]" },
  6: { title: "Meio do caminho", color: "red", dot: "bg-[#EA4335]" },
  12: { title: "Balanço do ano", color: "green", dot: "bg-[#34A853]" },
};

const REPORT_ITEMS = [
  ["Posição na busca", "Em que lugar você aparece na busca que o seu cliente faz."],
  ["Mapa de ranking", "Sua posição vista de vários pontos do bairro, não só da porta da loja."],
  ["Você e os concorrentes", "Nota, avaliações e ritmo de cada um, lado a lado."],
  ["Quanto falta", "Quantas avaliações por mês você precisa para passar quem está na frente."],
  ["O que os clientes dizem", "Elogios e reclamações, seus e dos concorrentes, lidos por IA."],
  ["Negativas sem resposta", "As avaliações ruins que ainda esperam uma resposta sua."],
  ["Oportunidades no perfil", "O que os concorrentes mostram no Google e você ainda não."],
  ["Resultado da placa", "Quantos clientes tocaram na placa e quantas avaliações chegaram."],
];

/** Posição no Maps mês a mês, só para ilustrar o relatório. */
const RANK_EXAMPLE = [9, 9, 7, 6, 6, 5, 4, 4, 3, 3, 2, 2];

const RECEIPT: Array<[string, string]> = [
  ["Diagnóstico do perfil", "grátis"],
  ["Placa de balcão NFC + QR Code", "1"],
  ["Relatórios mensais", "12"],
  ["Mapa de ranking", "todo mês"],
  ["Leitura das avaliações por IA", "todo mês"],
  ["Painel de toques e avaliações", "12 meses"],
  ["Troca do destino da placa", "à vontade"],
];

const SEGMENTS = ["Restaurantes", "Cafés e padarias", "Salões e barbearias", "Clínicas", "Oficinas", "Pousadas", "Lojas", "Academias", "Pet shops"];

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

const decimal = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function Heading({ kicker, children, className = "" }: { kicker: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`tt-reveal max-w-3xl ${className}`}>
      <p className="mb-4 text-sm font-medium text-muted-foreground">{kicker}</p>
      <h2 className="text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">{children}</h2>
    </div>
  );
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="flex" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon key={i} className={`size-3 ${i < Math.round(rating) ? "fill-[#FBBC05] text-[#FBBC05]" : "fill-muted text-muted"}`} />
      ))}
    </span>
  );
}

/** Lista de resultados no estilo do Google Maps. */
function MapsResults() {
  return (
    <figure className="overflow-hidden rounded-[1.75rem] bg-card shadow-2xl ring-1 ring-foreground/10">
      <div className="flex items-center gap-3 border-b px-5 py-4">
        <SearchIcon className="size-4 text-muted-foreground" />
        <span className="text-sm">padaria perto de mim</span>
      </div>
      <ol>
        {MAPS_RESULTS.map((r, i) => (
          <li
            key={r.name}
            className={`flex items-start gap-4 border-b px-5 py-4 last:border-b-0 ${r.you ? "bg-[#4285F4]/8 shadow-[inset_3px_0_0_#1A73E8]" : ""}`}
          >
            <span className={`w-5 pt-0.5 font-heading text-lg font-semibold tabular-nums ${r.you ? TEXT.blue : "text-muted-foreground"}`}>{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{r.name}</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-sm">
                <span className="tabular-nums">{decimal(r.rating)}</span>
                <RatingStars rating={r.rating} />
                <span className="text-muted-foreground tabular-nums">({r.reviews})</span>
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {r.meta} · <span className={TEXT.green}>Aberto</span>
              </span>
            </span>
          </li>
        ))}
      </ol>
      <figcaption className="border-t bg-muted/50 px-5 py-2.5 text-[11px] text-muted-foreground">Exemplo ilustrativo</figcaption>
    </figure>
  );
}

/** Relatório de exemplo: posição no Maps subindo mês a mês e os números do mês. */
function ReportMock() {
  const worst = Math.max(...RANK_EXAMPLE);
  return (
    <figure className="rounded-[1.75rem] bg-card p-6 shadow-2xl ring-1 ring-foreground/10 sm:p-8">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-heading text-lg font-semibold">Padaria Exemplo</p>
        <p className="text-xs text-muted-foreground">relatório 12 de 12</p>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Posição na busca “padaria” em Aldeota, Fortaleza</p>

      <div className="mt-8 flex items-end justify-between gap-6">
        <p className="font-heading text-7xl leading-none font-semibold tracking-tight">
          2<span className="text-4xl">º</span>
        </p>
        <p className={`flex items-center gap-1 text-sm font-medium ${TEXT.green}`}>
          <ArrowUpIcon className="size-4" /> subiu 7 posições em 12 meses
        </p>
      </div>

      <svg viewBox="0 0 220 80" className="mt-6 h-24 w-full overflow-visible" role="img" aria-label="Posição subindo do 9º para o 2º lugar em 12 meses">
        <polyline
          fill="none"
          stroke="#4285F4"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={RANK_EXAMPLE.map((rank, i) => `${i * 20},${((rank - 1) / (worst - 1)) * 70 + 5}`).join(" ")}
        />
        {RANK_EXAMPLE.map((rank, i) => (
          <circle
            key={i}
            cx={i * 20}
            cy={((rank - 1) / (worst - 1)) * 70 + 5}
            r={i === RANK_EXAMPLE.length - 1 ? 5 : 2.5}
            fill={i === RANK_EXAMPLE.length - 1 ? "#34A853" : "#4285F4"}
          />
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground" aria-hidden>
        <span>mês 1 · 9º</span>
        <span>mês 12 · 2º</span>
      </div>

      <dl className="mt-8 grid grid-cols-3 divide-x border-t pt-5 text-center">
        {(
          [
            { label: "avaliações no mês", value: "+14", color: "yellow" },
            { label: "toques na placa", value: "86", color: "blue" },
            { label: "negativas sem resposta", value: "0", color: "green" },
          ] as const
        ).map((s) => (
          <div key={s.label} className="px-2">
            <dd className={`font-heading text-2xl font-semibold tabular-nums ${TEXT[s.color]}`}>{s.value}</dd>
            <dt className="text-[11px] leading-tight text-muted-foreground">{s.label}</dt>
          </div>
        ))}
      </dl>
      <figcaption className="mt-6 text-[11px] text-muted-foreground">Exemplo ilustrativo</figcaption>
    </figure>
  );
}

/** Plano em forma de recibo: o que um pagamento cobre. */
function Receipt() {
  return (
    <div className="relative mx-auto w-full max-w-md -rotate-1 bg-card font-mono text-sm shadow-2xl ring-1 ring-foreground/10">
      <div className="flex items-center justify-between px-7 pt-7">
        <Logo className="h-6" />
        <span className="text-xs text-muted-foreground">plano anual</span>
      </div>
      <ul className="grid gap-2.5 px-7 pt-6 pb-7">
        {RECEIPT.map(([item, value]) => (
          <li key={item} className="flex items-end">
            <span>{item}</span>
            <span className="mx-2 mb-1 flex-1 border-b border-dotted border-foreground/30" aria-hidden />
            <span className="tabular-nums">{value}</span>
          </li>
        ))}
      </ul>
      {/* Picote: os recortes têm a cor do fundo da seção do plano. */}
      <div className="relative border-t-2 border-dashed border-foreground/15">
        <span className="absolute -top-3 -left-3 size-6 rounded-full bg-[#1A73E8] dark:bg-[#0B3B8C]" aria-hidden />
        <span className="absolute -top-3 -right-3 size-6 rounded-full bg-[#1A73E8] dark:bg-[#0B3B8C]" aria-hidden />
      </div>
      <ul className="grid gap-2.5 px-7 pt-6 pb-7">
        <li className="flex items-end">
          <span>Mensalidade</span>
          <span className="mx-2 mb-1 flex-1 border-b border-dotted border-foreground/30" aria-hidden />
          <span className={TEXT.green}>R$ 0</span>
        </li>
        <li className="flex items-end text-base font-semibold">
          <span>Pagamento</span>
          <span className="mx-2 mb-1 flex-1 border-b border-dotted border-foreground/30" aria-hidden />
          <span>único</span>
        </li>
      </ul>
      <div className="flex h-2" aria-hidden>
        <span className="flex-1 bg-[#4285F4]" />
        <span className="flex-1 bg-[#EA4335]" />
        <span className="flex-1 bg-[#FBBC05]" />
        <span className="flex-1 bg-[#34A853]" />
      </div>
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
        {/* Hero: a animação mostra a placa funcionando. */}
        <section className="relative overflow-hidden bg-brand-surface">
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pt-14 pb-16 md:grid-cols-[1.1fr_1fr] md:py-24">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <p className="mb-6 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <LogoIcon className="h-5" title="" />
                Monitoramento de reputação no Google Maps
              </p>
              <h1 className="text-5xl leading-[1.02] font-semibold tracking-tight text-balance sm:text-7xl">
                Seu cliente procura no Google. <span className={TEXT.blue}>Você aparece em que lugar?</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg text-pretty text-muted-foreground">
                Por 12 meses, a TopTap coloca uma placa no seu balcão para o cliente avaliar em um toque e te entrega, todo mês, um
                relatório com sua posição no Maps, seus concorrentes e o próximo passo.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
                <CtaButton>Fazer diagnóstico grátis</CtaButton>
                <span className="text-sm text-muted-foreground">Pagamento único. Sem mensalidade.</span>
              </div>
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

        {/* O problema: a busca no Maps, como o cliente vê. */}
        <section id="problema" className="mx-auto w-full max-w-6xl scroll-mt-16 px-4 py-24 md:py-32">
          <div className="grid items-center gap-14 md:grid-cols-[1fr_1fr]">
            <div>
              <Heading kicker="O problema">
                Nota 4,9. <span className={TEXT.red}>E em 4º lugar.</span>
              </Heading>
              <div className="tt-reveal mt-6 grid max-w-md gap-4 text-lg text-pretty text-muted-foreground">
                <p>
                  Quem tem mais avaliações passa mais confiança, para o cliente e para o Google. Com 41 avaliações contra 612, a melhor
                  padaria do bairro fica escondida.
                </p>
                <p>O cliente satisfeito até quer avaliar. Mas, para isso, precisa:</p>
              </div>
              <ol className="tt-reveal mt-4 grid max-w-md gap-1.5">
                {BEFORE.map((step, i) => (
                  <li key={step} className="flex items-baseline gap-3 text-muted-foreground">
                    <span className="w-4 text-sm tabular-nums">{i + 1}.</span>
                    <span
                      className="tt-strike bg-[linear-gradient(#EA4335,#EA4335)] bg-size-[100%_2px] bg-position-[0_55%] bg-no-repeat"
                      style={{ "--i": i } as React.CSSProperties}
                    >
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="tt-reveal mt-6 max-w-md text-lg font-medium">
                Com a placa TopTap, é <span className={TEXT.blue}>um toque</span>. E você não fica sem saber se o concorrente passou na sua
                frente.
              </p>
            </div>
            <div className="tt-reveal">
              <MapsResults />
              <p className="mt-4 text-xs text-muted-foreground">
                83% dos consumidores leem avaliações no Google (BrightLocal, Local Consumer Review Survey 2025).
              </p>
            </div>
          </div>
        </section>

        {/* O ano: linha do tempo dos 12 meses. */}
        <section id="ano" className="scroll-mt-16 border-y bg-brand-surface py-24 md:py-32">
          <div className="mx-auto w-full max-w-6xl px-4">
            <Heading kicker="Como funciona">Um ano inteiro de olho no seu Google.</Heading>

            <div className="tt-reveal mt-16 -mx-4 overflow-x-auto px-4 pb-2">
              <ol className="grid min-w-[44rem] grid-cols-13" aria-label="Linha do tempo do plano">
                {Array.from({ length: 13 }, (_, m) => {
                  const milestone = MILESTONES[m];
                  return (
                    <li key={m} className="relative flex flex-col items-center">
                      <span className="absolute top-[0.6875rem] h-px w-full bg-foreground/15" aria-hidden />
                      <span
                        className={`relative rounded-full ring-4 ring-brand-surface ${milestone ? `size-6 ${milestone.dot}` : "mt-1.5 size-3 bg-foreground/25"}`}
                      />
                      <span className="mt-3 text-xs text-muted-foreground tabular-nums">{m === 0 ? "hoje" : `mês ${m}`}</span>
                      {milestone && (
                        <span className={`mt-1 text-center text-xs font-semibold text-balance ${TEXT[milestone.color]}`}>{milestone.title}</span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="mt-14 grid gap-10 md:grid-cols-3">
              {[
                {
                  n: "Hoje",
                  title: "Diagnóstico grátis",
                  text: "Achamos seu negócio no Google e mostramos em que lugar você está e quantas avaliações faltam para subir.",
                  color: "border-[#4285F4]",
                },
                {
                  n: "Mês 1",
                  title: "A placa chega pronta",
                  text: "Com o link da sua avaliação já gravado. Você cola no balcão e os clientes passam a avaliar em um toque.",
                  color: "border-[#FBBC05]",
                },
                {
                  n: "Todo mês",
                  title: "Um relatório novo",
                  text: "Comparado com o mês anterior: subiu ou caiu, quem chegou perto, o que responder e o que melhorar no perfil.",
                  color: "border-[#34A853]",
                },
              ].map((s) => (
                <div key={s.title} className={`tt-reveal border-t-2 pt-5 ${s.color}`}>
                  <p className="text-sm text-muted-foreground">{s.n}</p>
                  <h3 className="mt-1 text-2xl font-semibold">{s.title}</h3>
                  <p className="mt-2 text-pretty text-muted-foreground">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Relatório mensal */}
        <section id="relatorio" className="mx-auto w-full max-w-6xl scroll-mt-16 px-4 py-24 md:py-32">
          <div className="grid items-start gap-14 md:grid-cols-[1fr_1fr]">
            <div>
              <Heading kicker="Relatório mensal">Seu Google Maps, mês a mês.</Heading>
              <p className="tt-reveal mt-6 max-w-md text-lg text-pretty text-muted-foreground">
                Sem planilha e sem termo técnico. Em dois minutos você sabe onde está, quem está na frente e o que fazer.
              </p>
              <ol className="tt-reveal mt-10 border-t">
                {REPORT_ITEMS.map(([title, text], i) => (
                  <li key={title} className="grid grid-cols-[2.5rem_1fr] gap-x-2 border-b py-4 sm:grid-cols-[2.5rem_12rem_1fr]">
                    <span className="font-mono text-sm text-muted-foreground tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    <span className="font-medium">{title}</span>
                    <span className="col-start-2 text-sm text-muted-foreground sm:col-start-3">{text}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="tt-reveal md:sticky md:top-24">
              <ReportMock />
            </div>
          </div>
        </section>

        {/* Plano: pagamento único, 12 meses */}
        <section id="plano" className="scroll-mt-16 bg-[#1A73E8] py-24 text-white md:py-32 dark:bg-[#0B3B8C]">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-16 px-4 md:grid-cols-[1fr_1fr]">
            <div className="tt-reveal">
              <p className="mb-4 text-sm font-medium text-white/75">O plano</p>
              <h2 className="text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
                Paga uma vez. Acompanha o ano todo.
              </h2>
              <p className="mt-6 max-w-md text-lg text-pretty text-white/85">
                Nada de mensalidade nem fidelidade. Um pagamento cobre a placa e 12 meses de relatórios. Antes de decidir, você vê o
                diagnóstico de graça.
              </p>
              <div className="mt-8">
                <CtaButton variant="secondary">Começar pelo diagnóstico</CtaButton>
              </div>
            </div>
            <div className="tt-reveal text-foreground">
              <Receipt />
            </div>
          </div>
        </section>

        {/* Para quem é */}
        <section className="mx-auto w-full max-w-6xl px-4 py-20">
          <p className="tt-reveal max-w-4xl font-heading text-2xl leading-snug font-medium text-balance sm:text-3xl">
            <span className="text-muted-foreground">Para quem depende do cliente que procura no Google: </span>
            {SEGMENTS.map((s, i) => (
              <span key={s}>
                {s}
                {i < SEGMENTS.length - 1 && <span className={["text-[#4285F4]", "text-[#EA4335]", "text-[#FBBC05]", "text-[#34A853]"][i % 4]}> • </span>}
              </span>
            ))}
            .
          </p>
          <p className="tt-reveal mt-8 max-w-xl text-pretty text-muted-foreground">
            Também fazemos placas e cartões com a sua marca, levando o cliente para o Instagram, o cardápio, o Pix ou a senha do Wi-Fi.{" "}
            {settings.whatsapp && (
              <a
                href={whatsappHref(
                  settings.whatsapp,
                  "Olá! Quero um orçamento de placa/cartão TopTap personalizado com a identidade visual do meu negócio.",
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-4 hover:text-primary"
              >
                <MessageCircleIcon className="size-4" /> Pedir orçamento
              </a>
            )}
          </p>
        </section>

        {/* Dúvidas */}
        <section id="duvidas" className="mx-auto w-full max-w-6xl scroll-mt-16 border-t px-4 py-24">
          <div className="grid gap-12 md:grid-cols-[1fr_1.4fr]">
            <Heading kicker="Dúvidas">Antes de você perguntar.</Heading>
            <div className="tt-reveal divide-y border-y">
              {FAQ.map(({ q, a }) => (
                <details key={q} className="group py-5 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium">
                    {q}
                    <span className="text-2xl leading-none text-muted-foreground transition group-open:rotate-45" aria-hidden>
                      +
                    </span>
                  </summary>
                  <p className="mt-3 max-w-xl text-pretty text-muted-foreground">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="px-4 pb-24">
          <div className="tt-reveal relative mx-auto grid max-w-6xl items-center gap-10 overflow-hidden rounded-[2rem] bg-[#202124] px-8 py-14 text-white sm:px-14 md:grid-cols-[1.4fr_1fr]">
            <div className="relative">
              <h2 className="text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl">
                Descubra em que lugar você está no Google Maps.
              </h2>
              <p className="mt-5 max-w-lg text-lg text-pretty text-white/75">
                O diagnóstico é grátis e leva um minuto: sua posição, seus concorrentes e quantas avaliações faltam.
              </p>
              <div className="mt-8">
                <CtaButton>Fazer diagnóstico grátis</CtaButton>
              </div>
            </div>
            <svg viewBox="58 50 92 140" className="mx-auto hidden h-56 w-auto md:block" aria-hidden>
              <NfcWaves strokeWidth={12} />
            </svg>
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
