"use client";

import { DownloadIcon, FileTextIcon, Loader2Icon, MessageCircleIcon, SaveIcon, Share2Icon, UserPlusIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addProspect, markProposalSent, updateProspect } from "@/app/dashboard/prospeccao/actions";
import { CopyButton } from "@/components/dashboard/copy-button";
import { Field } from "@/components/dashboard/field";
import { useActionFeedback } from "@/components/dashboard/use-action-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice, PROSPECT_STATUSES, prospectWhatsappHref } from "@/lib/prospects";

/** Na lista da busca: põe o negócio na prospecção e abre a ficha dele. */
export function AddProspectButton({ searchId, placeId }: { searchId: string; placeId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      onClick={() =>
        startTransition(async () => {
          // Em caso de sucesso a action redireciona; só volta aqui com erro.
          const result = await addProspect(searchId, placeId);
          if (result?.message) toast.error(result.message);
        })
      }
      disabled={pending}
    >
      {pending ? <Loader2Icon className="animate-spin" /> : <UserPlusIcon />} Prospectar
    </Button>
  );
}

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none md:text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export interface ProspectFormValues {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  status: string;
  price_cents: number | null;
  proposal_note: string | null;
  notes: string | null;
}

/** Dados do cliente e da proposta. */
export function ProspectForm({ prospect }: { prospect: ProspectFormValues }) {
  const [state, formAction, pending] = useActionFeedback(updateProspect.bind(null, prospect.id));
  const errors = state.fieldErrors ?? {};
  const value = (key: string, fallback: string | null) => state.values?.[key] ?? fallback ?? "";

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="p-name" label="Negócio" errors={errors.name}>
          <Input id="p-name" name="name" defaultValue={value("name", prospect.name)} required />
        </Field>
        <Field id="p-contact" label="Nome do contato" hint="Aparece na proposta e na mensagem." errors={errors.contact_name}>
          <Input id="p-contact" name="contact_name" defaultValue={value("contact_name", prospect.contact_name)} placeholder="Ex.: Ana" />
        </Field>
        <Field id="p-phone" label="WhatsApp" errors={errors.phone}>
          <Input id="p-phone" name="phone" type="tel" inputMode="tel" defaultValue={value("phone", prospect.phone)} placeholder="(85) 99999-9999" />
        </Field>
        <Field id="p-email" label="E-mail" errors={errors.email}>
          <Input id="p-email" name="email" type="email" defaultValue={value("email", prospect.email)} />
        </Field>
        <Field id="p-instagram" label="Instagram" errors={errors.instagram}>
          <Input id="p-instagram" name="instagram" defaultValue={value("instagram", prospect.instagram)} placeholder="@negocio" />
        </Field>
        <Field id="p-status" label="Status" errors={errors.status}>
          <select id="p-status" name="status" defaultValue={value("status", prospect.status)} className={selectClass}>
            {PROSPECT_STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="p-price" label="Valor na proposta" hint="Deixe em branco para a proposta sair sem valor." errors={errors.price}>
          <Input id="p-price" name="price" inputMode="decimal" defaultValue={value("price", formatPrice(prospect.price_cents))} placeholder="R$ 90,00" />
        </Field>
      </div>
      <Field id="p-note" label="Observação na proposta" hint="Condição especial, forma de pagamento etc. Sai no PDF, abaixo do valor." errors={errors.proposal_note}>
        <Textarea id="p-note" name="proposal_note" rows={2} defaultValue={value("proposal_note", prospect.proposal_note)} />
      </Field>
      <Field id="p-notes" label="Anotações internas" hint="Só você vê." errors={errors.notes}>
        <Textarea id="p-notes" name="notes" rows={3} defaultValue={value("notes", prospect.notes)} />
      </Field>
      <Button type="submit" className="w-full sm:w-fit" disabled={pending}>
        {pending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />} Salvar
      </Button>
    </form>
  );
}

/**
 * Envio da proposta um a um. No celular, "Enviar PDF" abre a folha de
 * compartilhar com o arquivo (escolha o WhatsApp e a conversa). No computador,
 * baixe o PDF, abra a conversa pelo link e arraste o arquivo.
 */
export function SendProposal({
  id,
  phone,
  defaultMessage,
  pdfUrl,
  fileName,
}: {
  id: string;
  phone: string | null;
  defaultMessage: string;
  pdfUrl: string;
  fileName: string;
}) {
  const [message, setMessage] = useState(defaultMessage);
  const [sharing, setSharing] = useState(false);
  const whatsapp = prospectWhatsappHref(phone, message);

  async function sharePdf() {
    setSharing(true);
    try {
      const res = await fetch(pdfUrl);
      if (!res.ok) throw new Error(`PDF ${res.status}`);
      const file = new File([await res.blob()], fileName, { type: "application/pdf" });
      if (!navigator.canShare?.({ files: [file] })) {
        toast.error("Este navegador não compartilha arquivos. Baixe o PDF e anexe na conversa.");
        return;
      }
      // Copia a mensagem antes: alguns apps descartam o texto quando vai um arquivo junto.
      await navigator.clipboard?.writeText(message).catch(() => {});
      await navigator.share({ files: [file], text: message });
      await markProposalSent(id);
    } catch (error) {
      if ((error as Error).name !== "AbortError") toast.error("Não foi possível compartilhar o PDF.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="grid gap-4">
      <Field id="p-message" label="Mensagem" hint="Vai junto com o PDF. Edite à vontade antes de enviar.">
        <Textarea id="p-message" rows={8} value={message} onChange={(e) => setMessage(e.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button onClick={sharePdf} disabled={sharing} className="md:hidden">
          {sharing ? <Loader2Icon className="animate-spin" /> : <Share2Icon />} Enviar PDF
        </Button>
        {whatsapp ? (
          <Button variant="outline" nativeButton={false} render={<a href={whatsapp} target="_blank" rel="noopener noreferrer" onClick={() => markProposalSent(id)} />}>
            <MessageCircleIcon /> Abrir conversa
          </Button>
        ) : (
          <Button variant="outline" disabled title="Cadastre um WhatsApp válido">
            <MessageCircleIcon /> Abrir conversa
          </Button>
        )}
        <Button variant="outline" nativeButton={false} render={<a href={`${pdfUrl}?baixar=1`} download={fileName} />}>
          <DownloadIcon /> Baixar PDF
        </Button>
        <Button variant="ghost" nativeButton={false} render={<a href={pdfUrl} target="_blank" rel="noopener noreferrer" />}>
          <FileTextIcon /> Ver PDF
        </Button>
        <CopyButton value={message} label="Copiar mensagem" />
      </div>
      <p className="text-xs text-muted-foreground">
        No celular, “Enviar PDF” abre o compartilhamento: escolha o WhatsApp e a conversa. No computador, baixe o PDF, clique em “Abrir
        conversa” e arraste o arquivo para o chat. Salve os dados antes, para o PDF sair atualizado.
      </p>
    </div>
  );
}
