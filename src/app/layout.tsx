import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import { Providers } from "@/components/theme/providers";
import { getSiteUrl } from "@/lib/urls";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Fonte da logo, usada nos títulos.
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { default: "TopTap · Cartão NFC de avaliação no Google", template: "%s · TopTap" },
  description:
    "Cartão com NFC e QR Code que leva o cliente direto para a avaliação do seu negócio no Google. Mais avaliações 5 estrelas com um toque.",
  openGraph: { siteName: "TopTap", locale: "pt_BR", type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
