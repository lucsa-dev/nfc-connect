import type { Metadata } from "next";
import { QuizLoader } from "@/components/quiz/quiz-loader";
import { CARD_COPY, displayUrl, qrPath } from "@/lib/card";
import { getSiteSettings } from "@/lib/settings";
import { getSiteUrl } from "@/lib/urls";

export const metadata: Metadata = {
  title: "Monte sua placa",
  description: "Encontre seu negócio no Google, veja o seu plano para conseguir mais avaliações e peça a sua placa TopTap.",
};

const siteUrl = getSiteUrl();

// Estática: regenerada quando as configurações mudam no painel.
export const revalidate = 3600;

export default async function StartPage() {
  const { whatsapp } = await getSiteSettings();
  return <QuizLoader whatsapp={whatsapp} art={{ copy: CARD_COPY.review, qr: qrPath(siteUrl), url: displayUrl(siteUrl) }} />;
}
