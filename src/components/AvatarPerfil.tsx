import { useEffect, useState } from "react";
import { urlDaFoto } from "@/lib/fotos";
import { cn } from "@/lib/utils";

export function AvatarPerfil({ caminho, nome, className }: { caminho?: string | null; nome: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    urlDaFoto(caminho).then((foto) => ativo && setUrl(foto));
    return () => { ativo = false; };
  }, [caminho]);

  return (
    <span className={cn("flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted font-semibold text-primary", className)}>
      {url ? <img src={url} alt={`Foto de ${nome}`} className="size-full object-cover" /> : nome.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}