import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm, MagicLinkForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, erro } = await searchParams;

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
          <CardTitle className="text-xl">Entrar</CardTitle>
          <CardDescription>Acompanhe os relatórios e os acessos do seu negócio. Enviamos um link de acesso para o seu e-mail.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          {erro === "link" && (
            <p role="alert" className="text-sm text-destructive">
              Esse link expirou ou já foi usado. Peça um novo abaixo.
            </p>
          )}
          <MagicLinkForm />
          {/* Quem veio do painel (?next=/dashboard...) é da equipe: já abre a senha. */}
          <details className="group border-t pt-4" open={typeof next === "string" && next.startsWith("/dashboard")}>
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">Entrar com senha (equipe TopTap)</summary>
            <div className="mt-4">
              <LoginForm next={typeof next === "string" ? next : undefined} />
            </div>
          </details>
        </CardContent>
      </Card>
    </main>
  );
}
