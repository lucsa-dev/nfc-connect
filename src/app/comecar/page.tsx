import type { Metadata } from "next";
import { QuizLoader } from "@/components/quiz/quiz-loader";
import { CARD_COPY, displayUrl, qrPath } from "@/lib/card";
import { apifyEnabled } from "@/lib/apify";
import { getSiteSettings } from "@/lib/settings";
import { getSiteUrl } from "@/lib/urls";

export const metadata: Metadata = {
  title: "Diagnóstico grátis",
  description: "Encontre seu negócio no Google, veja onde você está no Maps e contrate 12 meses de monitoramento TopTap, com placa e relatório mensal.",
};

const siteUrl = getSiteUrl();

// Estática: regenerada quando as configurações mudam no painel.
export const revalidate = 3600;
// A busca do negócio pelo scraper (Server Action desta página) leva até ~1 min.
export const maxDuration = 90;

export default async function StartPage() {
  const { whatsapp } = await getSiteSettings();
  return <QuizLoader whatsapp={whatsapp} placesEnabled={Boolean(process.env.GOOGLE_PLACES_API_KEY)} mapsSearch={apifyEnabled()} art={{ copy: CARD_COPY.review, qr: qrPath(siteUrl), url: displayUrl(siteUrl) }} />;
}
