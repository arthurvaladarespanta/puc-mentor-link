import { createFileRoute } from "@tanstack/react-router";
import { PaginaEmBreve } from "@/components/PaginaEmBreve";

export const Route = createFileRoute("/_app/conversas")({
  head: () => ({
    meta: [
      { title: "Conversas | Calouro+" },
      { name: "description", content: "Converse com tutores e alunos sobre as aulas marcadas." },
      { property: "og:title", content: "Conversas | Calouro+" },
      { property: "og:description", content: "Converse com tutores e alunos sobre as aulas marcadas." },
    ],
  }),
  component: () => (
    <PaginaEmBreve titulo="Conversas" texto="Em breve suas conversas com tutores e alunos aparecem aqui." />
  ),
});
