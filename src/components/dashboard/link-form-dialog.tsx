"use client";

import { PencilIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { Field } from "@/components/dashboard/field";
import { SlugInput } from "@/components/dashboard/slug-input";
import { useActionFeedback } from "@/components/dashboard/use-action-feedback";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/action-state";
import type { Link } from "@/lib/models";
import { LINK_TYPE_INFO, LINK_TYPES, type LinkType } from "@/lib/link-types";
import { slugify } from "@/lib/slug";

type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export type LinkDefaults = Pick<
  Link,
  "name" | "slug" | "type" | "url" | "is_active" | "pix_key" | "pix_name" | "pix_city" | "pix_amount" | "pix_description"
>;

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

function LinkForm({
  action,
  defaults,
  urlPrefix,
  initialType,
  onSuccess,
}: {
  action: FormAction;
  defaults?: LinkDefaults;
  urlPrefix: string;
  initialType: LinkType;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionFeedback(action, onSuccess);
  const errors = state.fieldErrors ?? {};
  const v = state.values;

  const [name, setName] = useState(v?.name ?? defaults?.name ?? "");
  const [slug, setSlug] = useState(v?.slug ?? defaults?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(defaults));
  const [type, setType] = useState<LinkType>((v?.type as LinkType) ?? defaults?.type ?? initialType);
  const [active, setActive] = useState(v ? v.is_active !== "false" : (defaults?.is_active ?? true));

  const text = (key: keyof LinkDefaults) => {
    if (v && key in v) return v[key];
    const d = defaults?.[key];
    return d === null || d === undefined ? "" : String(d);
  };

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="link-name" label="Nome do link" errors={errors.name}>
          <Input
            id="link-name"
            name="name"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            placeholder="Avaliação Google"
            aria-invalid={Boolean(errors.name)}
          />
        </Field>
        <Field id="link-type" label="Produto" errors={errors.type}>
          <select
            id="link-type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as LinkType)}
            className={selectClass}
          >
            {LINK_TYPES.map((t) => (
              <option key={t} value={t}>
                {LINK_TYPE_INFO[t].product}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        id="link-slug"
        label="Endereço do link"
        errors={errors.slug}
        hint={defaults ? "Atenção: mudar o endereço invalida as TAGs e QR Codes já gravados." : undefined}
      >
        <SlugInput
          id="link-slug"
          prefix={urlPrefix}
          value={slug}
          onChange={(value) => {
            setSlugTouched(true);
            setSlug(value);
          }}
          invalid={Boolean(errors.slug)}
        />
      </Field>

      <Field id="link-url" label="URL de redirecionamento" errors={errors.url} hint={LINK_TYPE_INFO[type].urlHint}>
        <Input
          id="link-url"
          name="url"
          defaultValue={text("url")}
          placeholder={type === "business_card" ? "@perfil ou meusite.com.br" : "https://"}
          inputMode="url"
          aria-invalid={Boolean(errors.url)}
        />
      </Field>

      {type === "pix" && (
        <fieldset className="grid gap-4 rounded-lg border p-3">
          <legend className="px-1 text-sm font-medium">Pix Copia e Cola</legend>
          <Field
            id="pix-key"
            label="Chave Pix"
            errors={errors.pix_key}
            hint="CPF, CNPJ, e-mail, chave aleatória ou telefone com +55"
          >
            <Input id="pix-key" name="pix_key" defaultValue={text("pix_key")} aria-invalid={Boolean(errors.pix_key)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="pix-name" label="Nome do recebedor" errors={errors.pix_name}>
              <Input id="pix-name" name="pix_name" maxLength={25} defaultValue={text("pix_name")} aria-invalid={Boolean(errors.pix_name)} />
            </Field>
            <Field id="pix-city" label="Cidade" errors={errors.pix_city}>
              <Input id="pix-city" name="pix_city" maxLength={15} defaultValue={text("pix_city")} aria-invalid={Boolean(errors.pix_city)} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="pix-amount" label="Valor fixo (opcional)" errors={errors.pix_amount} hint="Vazio: o cliente digita o valor">
              <Input id="pix-amount" name="pix_amount" inputMode="decimal" placeholder="0,00" defaultValue={text("pix_amount").replace(".", ",")} aria-invalid={Boolean(errors.pix_amount)} />
            </Field>
            <Field id="pix-description" label="Descrição (opcional)" errors={errors.pix_description}>
              <Input id="pix-description" name="pix_description" maxLength={50} defaultValue={text("pix_description")} />
            </Field>
          </div>
        </fieldset>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="size-4 accent-primary"
        />
        Link ativo
        <input type="hidden" name="is_active" value={active ? "true" : "false"} />
      </label>

      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function LinkFormDialog({
  action,
  defaults,
  urlPrefix,
}: {
  action: FormAction;
  defaults?: LinkDefaults;
  urlPrefix: string;
}) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const editing = Boolean(defaults);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setFormKey((k) => k + 1);
        setOpen(next);
      }}
    >
      <DialogTrigger render={<Button variant={editing ? "outline" : "default"} size={editing ? "sm" : "default"} />}>
        {editing ? <PencilIcon /> : <PlusIcon />}
        {editing ? "Editar" : "Adicionar link"}
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar link" : "Novo link"}</DialogTitle>
          <DialogDescription>
            Este endereço será gravado na TAG NFC e no QR Code e redireciona para a URL de destino.
          </DialogDescription>
        </DialogHeader>
        <LinkForm
          key={formKey}
          action={action}
          defaults={defaults}
          urlPrefix={urlPrefix}
          initialType="review"
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
