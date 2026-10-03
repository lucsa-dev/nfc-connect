"use client";

import { QrCodeIcon } from "lucide-react";
import { QrCode } from "@/components/dashboard/qr-code";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function QrDialog({ title, url, filename }: { title: string; url: string; filename: string }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="icon-sm" aria-label="QR Code" title="QR Code" />}>
        <QrCodeIcon />
      </DialogTrigger>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="font-mono text-xs break-all">{url}</DialogDescription>
        </DialogHeader>
        <QrCode value={url} filename={filename} size={240} />
      </DialogContent>
    </Dialog>
  );
}
