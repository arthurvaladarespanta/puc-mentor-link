import { createFileRoute } from "@tanstack/react-router";
import { PaginaEmBreve } from "@/components/PaginaEmBreve";

export const Route = createFileRoute("/_app/criar-aula")({
  head: () => ({
    meta: [
      { title: "Criar aula | Calouro+" },
      { name: "description", content: "Ofereça uma aula particular para calouros da PUC-Rio." },
      { property: "og:title", content: "Criar aula | Calouro+" },
      { property: "og:description", content: "Ofereça uma aula particular para calouros da PUC-Rio." },
    ],
  }),
  component: () => (
    <PaginaEmBreve titulo="Criar aula" texto="Em breve você vai poder publicar suas aulas e horários por aqui." />
  ),
});
