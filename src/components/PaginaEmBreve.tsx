import { Sparkles } from "lucide-react";

export function PaginaEmBreve({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <section>
      <h1 className="font-serif text-3xl font-semibold text-primary">{titulo}</h1>
      <div className="mt-6 flex flex-col items-center gap-3 rounded-[8px] border border-border bg-card p-10 text-center">
        <Sparkles className="size-6 text-accent" />
        <p className="max-w-sm text-sm text-muted-foreground">{texto}</p>
      </div>
    </section>
  );
}
