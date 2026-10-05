import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";

/** Botão principal: leva ao quiz de compra (/comecar). */
export function CtaButton({
  children = "Quero minha placa",
  size = "lg",
  variant = "default",
  className,
}: {
  children?: React.ReactNode;
  size?: "default" | "lg";
  variant?: "default" | "outline" | "secondary";
  className?: string;
}) {
  return (
    <Link
      href="/comecar"
      className={cn(buttonVariants({ size, variant }), size === "lg" && "h-11 px-5 text-base", className)}
    >
      {children}
      <ArrowRightIcon />
    </Link>
  );
}
