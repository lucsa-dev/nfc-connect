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
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/action-state";
import { slugify } from "@/lib/slug";

type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

interface BusinessDefaults {
  name: string;
  slug: string;
  description: string | null;
}

function BusinessForm({
  action,
  defaults,
  siteUrl,
  onSuccess,
}: {
  action: FormAction;
  defaults?: BusinessDefaults;
  siteUrl: string;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionFeedback(action, onSuccess);
  const errors = state.fieldErrors ?? {};
  const [name, setName] = useState(state.values?.name ?? defaults?.name ?? "");
  const [slug, setSlug] = useState(state.values?.slug ?? defaults?.slug ?? "");
  // Em negócios novos o endereço acompanha o nome até ser editado.
  const [slugTouched, setSlugTouched] = useState(Boolean(defaults));

  return (
    <form action={formAction} className="grid gap-4">
      <Field id="business-name" label="Nome do negócio" errors={errors.name}>
        <Input
          id="business-name"
          name="name"
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          placeholder="Padaria São João"
          aria-invalid={Boolean(errors.name)}
        />
      </Field>
      <Field
        id="business-slug"
        label="Endereço"
        errors={errors.slug}
        hint={defaults ? "Atenção: mudar o endereço invalida as TAGs e QR Codes já gravados." : "Usado em todos os links deste negócio."}
      >
        <SlugInput
          id="business-slug"
          prefix={`${siteUrl.replace(/^https?:\/\//, "")}/`}
          value={slug}
          onChange={(v) => {
            setSlugTouched(true);
            setSlug(v);
          }}
          invalid={Boolean(errors.slug)}
        />
      </Field>
      <Field id="business-description" label="Observações" errors={errors.description}>
        <Textarea
          id="business-description"
          name="description"
          rows={3}
          defaultValue={state.values?.description ?? defaults?.description ?? ""}
          placeholder="Contato, endereço, detalhes do pedido..."
        />
      </Field>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function BusinessFormDialog({
  action,
  defaults,
  siteUrl,
}: {
  action: FormAction;
  defaults?: BusinessDefaults;
  siteUrl: string;
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
        {editing ? "Editar" : "Adicionar negócio"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar negócio" : "Novo negócio"}</DialogTitle>
          <DialogDescription>
            {editing ? "Atualize os dados do negócio." : "Cadastre o cliente que vai receber os cartões."}
          </DialogDescription>
        </DialogHeader>
        <BusinessForm
          key={formKey}
          action={action}
          defaults={defaults}
          siteUrl={siteUrl}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
