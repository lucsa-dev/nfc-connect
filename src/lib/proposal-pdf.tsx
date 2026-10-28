import "server-only";
import { Circle, Document, Font, Page, Path, renderToBuffer, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import { BRAND } from "@/components/brand/logo";
import { formatBRL, PRICING } from "@/lib/pricing";
import type { Prospect } from "@/lib/market";
import { formatBrPhone } from "@/lib/quiz";
import { PROPOSAL_VALID_DAYS } from "@/lib/prospects";

/**
 * Proposta comercial em PDF (A4, uma página) para mandar pelo WhatsApp.
 * Helvetica, a fonte padrão do PDF, cobre os acentos do português; símbolos
 * fora do Latin-1 (como ★) não aparecem, por isso não são usados.
 */

export interface ProposalInput {
  name: string;
  contactName: string | null;
  data: Partial<Prospect>;
  /** Busca de onde o negócio veio ("padaria em Aldeota, Fortaleza"), para a posição. */
  search: { term: string; area: string } | null;
  priceCents: number | null;
  note: string | null;
  /** WhatsApp da TopTap (+55...) e endereço do site, no rodapé. */
  whatsapp: string | null;
  siteUrl: string;
  date: Date;
}

// A hifenização padrão segue o inglês ("avali-ações"): quebra só entre palavras.
Font.registerHyphenationCallback((word) => [word]);

const INK = "#202124";
const MUTED = "#5F6368";
const LINE = "#DADCE0";
const SURFACE = "#F1F5FE";

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 56, paddingHorizontal: 44, fontFamily: "Helvetica", fontSize: 10, color: INK, lineHeight: 1.35 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logo: { flexDirection: "row", alignItems: "center", gap: 6 },
  logoText: { fontFamily: "Helvetica-Bold", fontSize: 20, letterSpacing: -0.5 },
  meta: { fontSize: 9, color: MUTED, textAlign: "right" },
  stripe: { flexDirection: "row", height: 3, marginTop: 12, marginBottom: 20 },
  kicker: { fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 24, lineHeight: 1.15, letterSpacing: -0.3 },
  subtitle: { fontSize: 10, color: MUTED, marginTop: 4 },
  section: { marginTop: 16 },
  h2: { fontFamily: "Helvetica-Bold", fontSize: 13, marginBottom: 8 },
  stats: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, backgroundColor: SURFACE, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 10 },
  statValue: { fontFamily: "Helvetica-Bold", fontSize: 18, lineHeight: 1.1 },
  statLabel: { fontSize: 8.5, color: MUTED, marginTop: 4 },
  bullet: { flexDirection: "row", gap: 6, marginBottom: 2 },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 4.5 },
  item: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINE, paddingVertical: 5 },
  itemTitle: { width: 170, fontFamily: "Helvetica-Bold" },
  itemText: { flex: 1, color: MUTED },
  price: { marginTop: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: INK, color: "#FFFFFF", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
  priceLabel: { fontSize: 10, color: "#BDC1C6" },
  priceValue: { fontFamily: "Helvetica-Bold", fontSize: 20, lineHeight: 1.1 },
  note: { marginTop: 8, color: MUTED },
  steps: { flexDirection: "row", gap: 10 },
  step: { flex: 1, borderTopWidth: 2, paddingTop: 6 },
  stepTitle: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  stepText: { fontSize: 9, color: MUTED, marginTop: 2 },
  footer: { position: "absolute", bottom: 26, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", fontSize: 8.5, color: MUTED, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 8 },
});

const COLORS = [BRAND.blue, BRAND.red, BRAND.yellow, BRAND.green];

const decimal = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const formatDate = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Fortaleza" });

function Logo() {
  return (
    <View style={s.logo}>
      <Svg viewBox="58 50 92 140" width={15} height={23}>
        <Circle cx="80" cy="120" r="12" fill={BRAND.green} />
        <Path d="M101.86 93.96 A34 34 0 0 1 101.86 146.04" stroke={BRAND.yellow} strokeWidth={14} strokeLinecap="round" fill="none" />
        <Path d="M116 77.1 A56 56 0 0 1 116 162.9" stroke={BRAND.red} strokeWidth={14} strokeLinecap="round" fill="none" />
        <Path d="M130.15 60.25 A78 78 0 0 1 130.15 179.75" stroke={BRAND.blue} strokeWidth={14} strokeLinecap="round" fill="none" />
      </Svg>
      <Text style={s.logoText}>
        Top<Text style={{ color: BRAND.blue }}>Tap</Text>
      </Text>
    </View>
  );
}

function Stripe() {
  return (
    <View style={s.stripe}>
      {COLORS.map((c) => (
        <View key={c} style={{ flex: 1, backgroundColor: c }} />
      ))}
    </View>
  );
}

function Stats({ data, search }: Pick<ProposalInput, "data" | "search">) {
  const items: Array<[string, string]> = [];
  if (data.rating != null) items.push([decimal(data.rating), "nota no Google"]);
  if (data.reviews !== undefined) items.push([data.reviews.toLocaleString("pt-BR"), "avaliações no total"]);
  if (data.pace !== undefined) items.push([decimal(data.pace), "avaliações novas por mês"]);
  if (search && data.rank !== undefined) items.push([data.rank ? `${data.rank}º` : "fora", `na busca “${search.term}”`]);
  if (items.length === 0) return null;
  return (
    <View style={s.stats}>
      {items.map(([value, label]) => (
        <View key={label} style={s.stat}>
          <Text style={s.statValue}>{value}</Text>
          <Text style={s.statLabel}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const INCLUDED: Array<[string, string]> = [
  ["Placa de balcão NFC + QR Code", "O cliente encosta o celular (ou aponta a câmera) e cai direto na tela de avaliar o seu negócio no Google."],
  [`Até ${PRICING.includedStickers} adesivos QR`, "Para mesas, recepção ou atendentes: mais pontos para o cliente avaliar."],
  ["Relatório todo mês", "Sua posição no Google Maps, os concorrentes lado a lado e quantas avaliações faltam para subir."],
  ["Mapa de ranking", "Onde você aparece na busca vista de vários pontos do bairro, não só da porta da loja."],
  ["Leitura das avaliações", "Elogios e reclamações, seus e dos concorrentes, resumidos para você agir."],
  ["Painel de resultados", "Quantos clientes tocaram na placa e quantas avaliações chegaram."],
];

const STEPS: Array<[string, string]> = [
  ["1. Você aprova", "Responde esta mensagem e confirma os dados do seu negócio."],
  ["2. A placa chega pronta", "Com o link da sua avaliação já gravado. É só colar no balcão."],
  ["3. Todo mês, o relatório", "Você acompanha a posição e o que fazer para subir."],
];

function ProposalDocument(input: ProposalInput) {
  const { data, search } = input;
  const valid = new Date(input.date.getTime() + PROPOSAL_VALID_DAYS * 86_400_000);
  const place = [data.category, data.address].filter(Boolean).join(" · ");
  const reasons = (data.reasons ?? []).filter((r) => r !== "Fechado").slice(0, 4);

  return (
    <Document title={`Proposta TopTap · ${input.name}`} author="TopTap" language="pt-BR">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Logo />
          <View>
            <Text style={s.meta}>Proposta comercial · {formatDate(input.date)}</Text>
            <Text style={s.meta}>Válida até {formatDate(valid)}</Text>
          </View>
        </View>
        <Stripe />

        <Text style={s.kicker}>{input.contactName ? `Para ${input.contactName}` : "Proposta para"}</Text>
        <Text style={s.title}>{input.name}</Text>
        {place ? <Text style={s.subtitle}>{place}</Text> : null}

        <View style={s.section}>
          <Text style={s.h2}>Como vocês aparecem hoje no Google</Text>
          <Stats data={data} search={search} />
          {search ? <Text style={[s.subtitle, { marginTop: 6 }]}>Posição na busca “{search.term} em {search.area}” no Google Maps.</Text> : null}
          {reasons.length > 0 && (
            <View style={{ marginTop: 10 }}>
              {reasons.map((r, i) => (
                <View key={r} style={s.bullet}>
                  <View style={[s.dot, { backgroundColor: COLORS[i % COLORS.length] }]} />
                  <Text style={{ flex: 1 }}>{r}.</Text>
                </View>
              ))}
            </View>
          )}
          <Text style={[s.note, { marginTop: 8 }]}>
            Quem tem mais avaliações passa mais confiança, para o cliente e para o Google, e aparece antes na busca. O cliente satisfeito
            até quer avaliar, mas são cinco passos até a tela certa. Com a TopTap, é um toque.
          </Text>
        </View>

        <View style={s.section}>
          <Text style={s.h2}>O que está incluído</Text>
          {INCLUDED.map(([title, text]) => (
            <View key={title} style={s.item} wrap={false}>
              <Text style={s.itemTitle}>{title}</Text>
              <Text style={s.itemText}>{text}</Text>
            </View>
          ))}
        </View>

        {input.priceCents !== null && (
          <View style={s.price} wrap={false}>
            <Text style={s.priceLabel}>Investimento</Text>
            <Text style={s.priceValue}>{formatBRL(input.priceCents)}</Text>
          </View>
        )}
        {input.note ? <Text style={s.note}>{input.note}</Text> : null}

        <View style={s.section} wrap={false}>
          <Text style={s.h2}>Próximos passos</Text>
          <View style={s.steps}>
            {STEPS.map(([title, text], i) => (
              <View key={title} style={[s.step, { borderTopColor: COLORS[i] }]}>
                <Text style={s.stepTitle}>{title}</Text>
                <Text style={s.stepText}>{text}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>TopTap · {input.siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}</Text>
          {input.whatsapp ? <Text>WhatsApp {formatBrPhone(input.whatsapp)}</Text> : null}
        </View>
      </Page>
    </Document>
  );
}

export function renderProposal(input: ProposalInput): Promise<Buffer> {
  return renderToBuffer(<ProposalDocument {...input} />);
}
