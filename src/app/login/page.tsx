import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;

  return (
    <main className="relative flex flex-1 items-center justify-center bg-brand-surface p-4">
      <div className="absolute top-4 right-4">
        <ThemeSwitcher />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <Link href="/" className="mb-3 w-fit" aria-label="TopTap: página inicial">
            <Logo className="h-10" withStars />
          </Link>
          <CardTitle className="text-xl">Painel de administração</CardTitle>
          <CardDescription>Entre para gerenciar os cartões dos seus clientes.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm next={typeof next === "string" ? next : undefined} />
        </CardContent>
      </Card>
    </main>
  );
}
