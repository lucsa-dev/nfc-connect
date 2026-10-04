import { ArrowRightIcon, MessageCircleIcon } from "lucide-react";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import { contactHref } from "@/lib/site-config";

/** Botão principal de contato. Sem contato configurado, leva para os modelos. */
export function CtaButton({
  children = "Quero minha placa",
  size = "lg",
  variant = "default",
  className,
  message,
}: {
  children?: React.ReactNode;
  size?: "default" | "lg";
  variant?: "default" | "outline" | "secondary";
  className?: string;
  message?: string;
}) {
  const href = contactHref(message) ?? "#modelos";
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={cn(buttonVariants({ size, variant }), size === "lg" && "h-11 px-5 text-base", className)}
    >
      {href.startsWith("https://wa.me") ? <MessageCircleIcon /> : null}
      {children}
      <ArrowRightIcon />
    </a>
  );
}
