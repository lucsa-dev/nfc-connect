import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3Icon,
  BatteryFullIcon,
  CarIcon,
  CheckIcon,
  CoffeeIcon,
  DumbbellIcon,
  HotelIcon,
  MapPinIcon,
  PawPrintIcon,
  QrCodeIcon,
  RefreshCwIcon,
  ScissorsIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  SmartphoneNfcIcon,
  StethoscopeIcon,
  TimerIcon,
  UtensilsIcon,
  XIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ArtPreview, type ArtData } from "@/components/cards/print-art";
import { CtaButton } from "@/components/landing/cta-button";
import { PhoneMock } from "@/components/landing/phone-mock";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { CARD_COPY, displayUrl, qrPath, STYLES } from "@/lib/card";
import { formatBRL, PRICING } from "@/lib/pricing";
import { siteConfig } from "@/lib/site-config";
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
  { href: "#vantagens", label: "Vantagens" },
  { href: "#modelos", label: "Modelos" },
  { href: "#duvidas", label: "Dúvidas" },
];

const STEPS = [
  {
    icon: SmartphoneNfcIcon,
    title: "O cliente aproxima o celular",
    text: "A placa fica colada no balcão ou no caixa, sempre à vista na hora de pagar. Quem não usa NFC escaneia o QR Code ao lado.",
  },
  {
    icon: MapPinIcon,
    title: "Abre direto a sua avaliação",
    text: "A tela de avaliar o seu negócio no Google aparece na hora. Sem buscar, sem digitar, sem app.",
  },
  {
    icon: BarChart3Icon,
    title: "Cada toque é contado",
    text: "Você sabe quantas vezes o cartão foi usado, em que dias e se foi por NFC ou QR Code.",
  },
];

const ADVANTAGES = [
  {
    icon: MapPinIcon,
    title: "Apareça antes do concorrente",
    text: "A quantidade e a nota das avaliações estão entre os fatores que o Google considera para ordenar negócios no Maps e na busca local.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Mais confiança para quem não te conhece",
    text: "Antes de escolher onde comer, cortar o cabelo ou levar o carro, as pessoas olham as estrelas. Muitas avaliações recentes passam segurança.",
  },
  {
    icon: TimerIcon,
    title: "Avaliar leva segundos",
    text: "O cliente satisfeito quer ajudar, mas desiste no meio do caminho. Com um toque, o caminho some.",
  },
  {
    icon: QrCodeIcon,
    title: "Funciona em qualquer celular",
    text: "NFC para iPhone e Android e QR Code de reserva para qualquer aparelho com câmera.",
  },
  {
    icon: RefreshCwIcon,
    title: "Troque o destino sem reimprimir",
    text: "A placa aponta para o seu link TopTap. Se o seu perfil mudar, atualizamos o destino e a mesma placa continua funcionando.",
  },
  {
    icon: BatteryFullIcon,
    title: "Fixa no balcão, sem manutenção",
    text: "A placa fica colada onde o cliente paga e não some. O chip NFC é passivo: não precisa de energia e não descarrega.",
  },
];

const SEGMENTS = [
  { icon: UtensilsIcon, label: "Restaurantes e bares" },
  { icon: CoffeeIcon, label: "Cafés e padarias" },
  { icon: ScissorsIcon, label: "Salões e barbearias" },
  { icon: StethoscopeIcon, label: "Clínicas e consultórios" },
  { icon: CarIcon, label: "Oficinas e lava-rápidos" },
  { icon: HotelIcon, label: "Hotéis e pousadas" },
  { icon: ShoppingBagIcon, label: "Lojas" },
  { icon: DumbbellIcon, label: "Academias" },
  { icon: PawPrintIcon, label: "Pet shops" },
];

const BEFORE = ["Abrir o Google", "Buscar o nome do lugar", "Achar o perfil certo", "Rolar até as avaliações", "Tocar em “Escrever avaliação”"];

const FAQ = [
  {
    q: "Precisa instalar algum aplicativo?",
    a: "Não. O celular lê o chip NFC da placa ou o QR Code e abre a página de avaliação no navegador ou no app do Google, se o cliente tiver.",
  },
  {
    q: "Funciona no iPhone?",
    a: "Sim. iPhones a partir do XS leem NFC sem nenhum app: basta aproximar a parte de cima do aparelho. No Android, o NFC precisa estar ligado. E qualquer celular com câmera lê o QR Code.",
  },
  {
    q: "O cliente é obrigado a dar 5 estrelas?",
    a: "Não, e isso é importante: o cartão leva para a página oficial de avaliação do Google, onde o cliente escreve o que quiser. Avaliações espontâneas de clientes reais são as que mais valem, e o Google proíbe oferecer recompensa em troca de avaliação.",
  },
  {
    q: "Preciso ter um perfil no Google?",
    a: "Sim, o cartão leva para o Perfil da Empresa no Google, que é gratuito. Com o perfil criado, geramos o link de avaliação e gravamos no cartão.",
  },
  {
    q: "E se o meu link ou endereço mudar?",
    a: "A placa grava o seu link TopTap, não o link do Google. Basta atualizar o destino no nosso painel e as placas e cartões já entregues continuam funcionando.",
  },
  {
    q: "Onde fica a placa?",
    a: "Colada no balcão, no caixa ou na recepção, onde o cliente está satisfeito e com o celular na mão. O NFC e o QR Code ficam na frente; o verso é colado na superfície. Para mesas ou para o atendente entregar junto com a conta, também temos o cartão.",
  },
  {
    q: "Também serve para outras coisas?",
    a: "Sim. Fazemos placas e cartões para pagamento por Pix e cartão de visita com Instagram ou site, todos com NFC e QR Code.",
  },
];

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      <p className="mb-2 text-sm font-semibold text-primary">{eyebrow}</p>
      <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h2>
      {text && <p className="mt-3 text-lg text-pretty text-muted-foreground">{text}</p>}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
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
        {/* Hero */}
        <section className="relative overflow-hidden bg-brand-surface">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-14 md:grid-cols-[1.1fr_1fr] md:py-20">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
                <SmartphoneNfcIcon className="size-4" /> Placa de balcão com NFC + QR Code
              </p>
              <h1 className="text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Mais avaliações 5 estrelas no Google, <span className="text-primary">com um toque.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-pretty text-muted-foreground">
                A placa TopTap fica fixa no seu balcão: o cliente aproxima o celular ou escaneia o QR Code e cai direto na
                tela de avaliação do seu negócio. Sem procurar no Google, sem digitar nada, sem baixar app.
              </p>
              <p className="mt-5 text-lg">
                <span className="text-muted-foreground">Placa a partir de </span>
                <span className="font-heading text-2xl font-semibold">{formatBRL(PRICING.plaque)}</span>
                <span className="text-muted-foreground"> · pagamento único, sem mensalidade</span>
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <CtaButton />
                <a
                  href="#como-funciona"
                  className="inline-flex h-11 items-center rounded-lg px-4 text-base font-medium text-foreground hover:bg-muted"
                >
                  Como funciona
                </a>
              </div>
              <ul className="mt-8 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                {["iPhone e Android", "QR Code de reserva", "Pronta para usar"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckIcon className="size-4 shrink-0 text-[#34A853]" /> {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative mx-auto flex h-[25rem] w-full max-w-md items-center justify-center sm:h-[28rem]" aria-hidden>
              <div className="absolute top-2 left-0 w-[15rem] -rotate-3 sm:w-[17rem]">
                <ArtPreview product="placa-quadrada" style="classico" data={demoCard} className="shadow-2xl" />
              </div>
              <div className="absolute right-0 bottom-4 z-10">
                <PhoneMock />
              </div>
              <span className="absolute top-[45%] left-[48%] z-20 flex size-4">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#4285F4] opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex size-4 rounded-full bg-[#4285F4] ring-4 ring-background" />
              </span>
            </div>
          </div>
        </section>

        {/* Problema */}
        <section className="mx-auto w-full max-w-6xl px-4 py-20">
          <SectionTitle
            eyebrow="O problema"
            title="Seu cliente gostou. Mas não avaliou."
            text="Quem teve uma experiência ruim avalia sozinho. Quem saiu satisfeito até quer ajudar, mas o caminho é longo e ele esquece no meio."
          />
          <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
              <h3 className="mb-4 font-semibold">Sem TopTap: 5 passos</h3>
              <ol className="grid gap-3">
                {BEFORE.map((step, i) => (
                  <li key={step} className="flex items-center gap-3 text-muted-foreground">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium tabular-nums">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <XIcon className="size-4 text-[#EA4335]" /> Pelo caminho, muita gente desiste.
              </p>
            </div>
            <div className="flex flex-col rounded-2xl bg-primary p-6 text-primary-foreground">
              <h3 className="mb-4 font-semibold">Com TopTap: 1 toque</h3>
              <div className="flex items-center gap-3 text-lg">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-foreground/20 text-xs font-medium">
                  1
                </span>
                Aproximar o celular da placa
              </div>
              <p className="mt-auto pt-6 text-pretty opacity-90">
                A tela de avaliação abre na hora, enquanto a boa experiência ainda está fresca. É aí que nascem as
                avaliações 5 estrelas.
              </p>
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="scroll-mt-16 bg-brand-surface py-20">
          <div className="mx-auto w-full max-w-6xl px-4">
            <SectionTitle eyebrow="Como funciona" title="Simples para o cliente. Simples para você." />
            <ol className="grid gap-6 md:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                      <Icon className="size-5" />
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">Passo {i + 1}</span>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{title}</h3>
                  <p className="text-muted-foreground">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Vantagens */}
        <section id="vantagens" className="mx-auto w-full max-w-6xl scroll-mt-16 px-4 py-20">
          <SectionTitle
            eyebrow="Por que vale a pena"
            title="Um vendedor silencioso trabalhando no seu balcão"
            text="Cada avaliação nova ajuda o próximo cliente a escolher você."
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ADVANTAGES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl p-6 ring-1 ring-foreground/10">
                <Icon className="mb-4 size-6 text-primary" />
                <h3 className="mb-2 font-semibold">{title}</h3>
                <p className="text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-14">
            <h3 className="mb-5 text-center text-lg font-semibold">Feito para negócios que vivem de reputação</h3>
            <ul className="flex flex-wrap justify-center gap-2.5">
              {SEGMENTS.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm">
                  <Icon className="size-4 text-muted-foreground" /> {label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Modelos */}
        <section id="modelos" className="scroll-mt-16 bg-brand-surface py-20">
          <div className="mx-auto w-full max-w-6xl px-4">
            <SectionTitle
              eyebrow="Modelos"
              title="Pronta para o balcão, já com o seu link"
              text="Placa rígida com chip NFC e QR Code na frente e adesivo no verso para colar no balcão. Chega configurada com o link de avaliação do seu negócio. Em 10 × 10 cm ou 10 × 15 cm, em três estilos."
            />
            <div className="grid items-end gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {STYLES.map((s) => (
                <figure key={s.id} className="grid gap-3">
                  <ArtPreview product="placa-quadrada" style={s.id} data={demoCard} />
                  <figcaption className="text-center text-sm">
                    <span className="font-semibold">Placa {s.label.toLowerCase()}</span>
                    <span className="text-muted-foreground"> · 10 × 10 cm</span>
                  </figcaption>
                </figure>
              ))}
              <figure className="grid gap-3">
                <ArtPreview product="placa-retangular" style="classico" data={demoCard} className="mx-auto w-[75%]" />
                <figcaption className="text-center text-sm">
                  <span className="font-semibold">Placa vertical</span>
                  <span className="text-muted-foreground"> · 10 × 15 cm</span>
                </figcaption>
              </figure>
            </div>

            <div className="mt-16 grid items-center gap-8 rounded-3xl bg-card p-6 ring-1 ring-foreground/10 md:grid-cols-[1fr_1.4fr] md:p-10">
              <div>
                <p className="mb-2 text-sm font-semibold text-primary">Complemento</p>
                <h3 className="text-2xl font-semibold tracking-tight text-balance">Cartão para mesas e atendentes</h3>
                <p className="mt-3 text-pretty text-muted-foreground">
                  No tamanho de cartão de crédito, com NFC na frente e QR Code no verso. O garçom entrega junto com a conta,
                  ou fica em cada mesa.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <ArtPreview product="cartao" style="escuro" side="front" data={demoCard} />
                <ArtPreview product="cartao" style="escuro" side="back" data={demoCard} />
              </div>
            </div>
            <div className="mt-12 flex flex-col items-center gap-3 text-center">
              <p className="max-w-xl text-pretty text-muted-foreground">Pedidos em grande quantidade podem ser personalizados com o nome do seu negócio. Também fazemos placas e cartões para pagamento por Pix e cartão de visita digital.</p>
              <CtaButton>Montar meu kit</CtaButton>
            </div>
          </div>
        </section>

        {/* Dúvidas */}
        <section id="duvidas" className="mx-auto w-full max-w-3xl scroll-mt-16 px-4 py-20">
          <SectionTitle eyebrow="Dúvidas" title="Perguntas frequentes" />
          <div className="divide-y rounded-2xl ring-1 ring-foreground/10">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
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
        <section className="px-4 pb-20">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground">
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Seu próximo cliente está lendo suas avaliações agora.
            </h2>
            <p className="max-w-xl text-lg text-pretty opacity-90">
              Transforme quem já gosta do seu negócio em avaliações que trazem gente nova.
            </p>
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
        <p className="mx-auto w-full max-w-6xl px-4 pb-8 text-xs text-muted-foreground">
          Google e Google Maps são marcas da Google LLC. A TopTap é um serviço independente, sem afiliação com o Google.
        </p>
      </footer>
    </div>
  );
}
