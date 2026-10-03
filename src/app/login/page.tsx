import type { Metadata } from "next";
import { NfcIcon } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;

  return (
    <main className="relative flex flex-1 items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeSwitcher />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <NfcIcon className="size-5" />
          </div>
          <CardTitle className="text-xl">NFC Connect</CardTitle>
          <CardDescription>Entre para administrar os links dos seus clientes.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm next={typeof next === "string" ? next : undefined} />
        </CardContent>
      </Card>
    </main>
  );
}
