"use client";

import { createBatch } from "@/app/dashboard/cartoes/actions";
import { Field } from "@/components/dashboard/field";
import { useActionFeedback } from "@/components/dashboard/use-action-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRODUCTS, STYLES } from "@/lib/card";
import { BATCH_MAX } from "@/lib/cards";

const SELECT =
  "h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function BatchForm() {
  const [state, action, pending] = useActionFeedback(createBatch);
  const errors = state.fieldErrors ?? {};
  const v = state.values ?? {};

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[8rem_1fr_1fr_1.5fr_auto] lg:items-start">
      <Field id="batch-quantity" label="Quantidade" errors={errors.quantity}>
        <Input
          id="batch-quantity"
          name="quantity"
          type="number"
          inputMode="numeric"
          min={1}
          max={BATCH_MAX}
          defaultValue={v.quantity ?? "50"}
          required
          aria-invalid={Boolean(errors.quantity)}
        />
      </Field>
      <Field id="batch-product" label="Produto" errors={errors.product}>
        <select id="batch-product" name="product" defaultValue={v.product ?? "cartao"} className={SELECT}>
          {PRODUCTS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>
      <Field id="batch-style" label="Estilo" errors={errors.style}>
        <select id="batch-style" name="style" defaultValue={v.style ?? "classico"} className={SELECT}>
          {STYLES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>
      <Field id="batch-name" label="Nome (opcional)" errors={errors.name}>
        <Input id="batch-name" name="name" defaultValue={v.name ?? ""} placeholder="Ex.: Lote gráfica outubro" maxLength={120} />
      </Field>
      <div className="grid gap-1.5">
        <span className="hidden text-sm lg:block" aria-hidden>
          &nbsp;
        </span>
        <Button type="submit" disabled={pending}>
          {pending ? "Gerando..." : "Gerar lote"}
        </Button>
      </div>
    </form>
  );
}
