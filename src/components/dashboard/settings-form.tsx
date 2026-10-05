"use client";

import { updateSettings } from "@/app/dashboard/configuracoes/actions";
import { Field } from "@/components/dashboard/field";
import { useActionFeedback } from "@/components/dashboard/use-action-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBrPhone } from "@/lib/quiz";

export function SettingsForm({ whatsapp }: { whatsapp: string | null }) {
  const [state, action, pending] = useActionFeedback(updateSettings);
  const current = state.values?.whatsapp ?? (whatsapp ? formatBrPhone(whatsapp) : "");

  return (
    <form action={action} className="grid max-w-md gap-4">
      <Field
        id="whatsapp"
        label="WhatsApp da TopTap"
        errors={state.fieldErrors?.whatsapp}
        hint="Usado no botão flutuante do site e no fim do quiz. Deixe vazio para esconder o botão."
      >
        <Input
          key={current}
          id="whatsapp"
          name="whatsapp"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="(85) 98207-8212"
          defaultValue={current}
          aria-invalid={Boolean(state.fieldErrors?.whatsapp)}
        />
      </Field>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
