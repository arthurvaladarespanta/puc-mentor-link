import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Spinner } from "@/components/Spinner";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Calouro+ | Aulas particulares entre estudantes da PUC-Rio" },
      {
        name: "description",
        content: "Encontre veteranos para te ajudar nas matérias ou ofereça suas próprias aulas.",
      },
      { property: "og:title", content: "Calouro+ | Aulas particulares entre estudantes da PUC-Rio" },
      {
        property: "og:description",
        content: "Encontre veteranos para te ajudar nas matérias ou ofereça suas próprias aulas.",
      },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    throw redirect({ to: data.user ? "/feed" : "/entrar" });
  },
  component: () => (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner />
    </div>
  ),
});
