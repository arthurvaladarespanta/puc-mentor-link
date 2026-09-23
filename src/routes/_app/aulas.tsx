import { createFileRoute } from "@tanstack/react-router";
import { PaginaEmBreve } from "@/components/PaginaEmBreve";

export const Route = createFileRoute("/_app/aulas")({
  head: () => ({
    meta: [
      { title: "Minhas aulas | Calouro+" },
      { name: "description", content: "Acompanhe as aulas que você dá e as que você marcou." },
      { property: "og:title", content: "Minhas aulas | Calouro+" },
      { property: "og:description", content: "Acompanhe as aulas que você dá e as que você marcou." },
    ],
  }),
  component: () => (
    <PaginaEmBreve titulo="Aulas" texto="Em breve suas aulas como tutor e como aluno ficam reunidas aqui." />
  ),
});
