"use client";

import { CheckIcon } from "lucide-react";
import { ArtPreview, type ArtData } from "@/components/cards/print-art";
import { PRODUCTS, STYLES, type Product, type ProductId, type StyleId } from "@/lib/card";

/**
 * Seletores visuais de estilo e de produto (placa/cartão), com a prévia da arte.
 * Usados no painel (lotes de peças em branco) e no quiz de vendas (/comecar).
 * Com `name`, cada opção é um rádio de formulário; sem, é só controlado.
 */

function PickerOption({
  name,
  value,
  checked,
  onSelect,
  label,
  description,
  compact = false,
  children,
}: {
  name?: string;
  value: string;
  checked: boolean;
  onSelect: () => void;
  label: string;
  description: string;
  /** Prévia menor e sem descrição no celular (3 opções lado a lado). */
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="relative grid cursor-pointer content-between gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10 transition hover:ring-primary/50 has-checked:ring-2 has-checked:ring-primary has-focus-visible:outline-2 has-focus-visible:outline-ring">
      <input type="radio" name={name} value={value} checked={checked} onChange={onSelect} className="sr-only" />
      {checked && (
        <span className="absolute top-2 right-2 z-10 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <CheckIcon className="size-3.5" />
        </span>
      )}
      <div className={`flex items-center justify-center rounded-lg bg-muted/50 ${compact ? "h-20 p-2 sm:h-36 sm:p-3" : "h-36 p-3"}`}>{children}</div>
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className={`text-xs text-muted-foreground ${compact ? "hidden sm:block" : ""}`}>{description}</div>
      </div>
    </label>
  );
}

export function StylePicker({
  value,
  onChange,
  art,
  name,
}: {
  value: StyleId;
  onChange: (style: StyleId) => void;
  art: ArtData;
  name?: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3" role="radiogroup" aria-label="Estilo">
      {STYLES.map((s) => (
        <PickerOption key={s.id} compact name={name} value={s.id} checked={value === s.id} onSelect={() => onChange(s.id)} label={s.label} description={s.description}>
          <ArtPreview product="cartao" style={s.id} data={art} className="w-full max-w-44" />
        </PickerOption>
      ))}
    </div>
  );
}

/** Prévia de um produto: cartões mostram frente e verso (o verso tem o QR Code). */
export function ProductArt({ product, style, art }: { product: Product; style: StyleId; art: ArtData }) {
  if (product.sides.length === 1) return <ArtPreview product={product.id} style={style} data={art} className="h-full" />;
  const vertical = product.height > product.width;
  return (
    <div className={`flex h-full items-center justify-center gap-1.5 ${vertical ? "" : "flex-col"}`}>
      <ArtPreview product={product.id} style={style} side="front" data={art} className={vertical ? "h-full" : "h-[48%]"} />
      <ArtPreview product={product.id} style={style} side="back" data={art} className={vertical ? "h-full" : "h-[48%]"} />
    </div>
  );
}

export function ProductPicker({
  value,
  onChange,
  style,
  art,
  kind,
  name,
}: {
  value: ProductId;
  onChange: (product: ProductId) => void;
  style: StyleId;
  art: ArtData;
  /** Só placas ou só cartões (padrão: todos). */
  kind?: Product["kind"];
  name?: string;
}) {
  const products = PRODUCTS.filter((p) => !kind || p.kind === kind);
  const cols = products.length > 2 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2";
  return (
    <div className={`grid grid-cols-1 gap-3 ${cols}`} role="radiogroup" aria-label="Modelo">
      {products.map((p) => (
        <PickerOption key={p.id} name={name} value={p.id} checked={value === p.id} onSelect={() => onChange(p.id)} label={p.label} description={p.description}>
          <ProductArt product={p} style={style} art={art} />
        </PickerOption>
      ))}
    </div>
  );
}
