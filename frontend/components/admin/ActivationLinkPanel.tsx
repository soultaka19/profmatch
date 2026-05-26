"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy, Link as LinkIcon } from "lucide-react";

interface Props {
  url: string;
  email: string;
}

export function ActivationLinkPanel({ url, email }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignorer silencieusement (peut arriver hors HTTPS)
    }
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-fg">
        <LinkIcon className="h-4 w-4 text-primary" />
        Lien d&apos;activation pour {email}
      </div>
      <p className="text-xs text-fg-muted">
        Ce lien expire dans 72 heures et ne peut être utilisé qu&apos;une fois.
        Transmettez-le à l&apos;utilisateur par un canal sécurisé — il n&apos;apparaîtra plus dans l&apos;interface.
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded border border-border bg-canvas-pure px-3 py-2 text-xs">
          {url}
        </code>
        <Button size="sm" variant={copied ? "default" : "outline"} onClick={handleCopy}>
          {copied ? (
            <>
              <Check className="mr-1 h-3 w-3" />
              Copié
            </>
          ) : (
            <>
              <Copy className="mr-1 h-3 w-3" />
              Copier
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
