import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";

export function CartaoAuth({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="mb-6">
        <Logo tamanho="lg" />
      </div>
      <div className="w-full max-w-md overflow-hidden rounded-[8px] border border-border bg-card">
        <div className="h-1 w-full bg-gradient-to-r from-primary to-accent" aria-hidden />
        <div className="p-6 sm:p-8">
          <h1 className="font-serif text-2xl font-semibold text-primary">{titulo}</h1>
          {descricao && <p className="mt-2 text-sm text-muted-foreground">{descricao}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
