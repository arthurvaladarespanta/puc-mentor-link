import { createFileRoute } from "@tanstack/react-router";
import { PaginaEmBreve } from "@/components/PaginaEmBreve";

export const Route = createFileRoute("/_app/feed")({
  head: () => ({
    meta: [
      { title: "Feed | Calouro+" },
      { name: "description", content: "Veja as aulas oferecidas por veteranos da PUC-Rio." },
      { property: "og:title", content: "Feed | Calouro+" },
      { property: "og:description", content: "Veja as aulas oferecidas por veteranos da PUC-Rio." },
    ],
  }),
  component: () => (
    <PaginaEmBreve
      titulo="Feed"
      texto="Em breve você vai ver aqui as aulas disponíveis nas suas matérias de interesse."
    />
  ),
});
