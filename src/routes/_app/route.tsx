import { useEffect, useRef, useState } from "react";
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { Bell, BookOpen, CalendarDays, MessagesSquare, Plus, LogOut, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { urlDaFoto } from "@/lib/fotos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/entrar" });
    return { user: data.user };
  },
  component: LayoutApp,
});

const ITENS = [
  { para: "/feed", rotulo: "Feed", icone: BookOpen },
  { para: "/conversas", rotulo: "Conversas", icone: MessagesSquare },
  { para: "/aulas", rotulo: "Aulas", icone: CalendarDays },
] as const;

function LayoutApp() {
  const navigate = useNavigate();
  const rota = useRouterState({ select: (s) => s.location.pathname });
  const [foto, setFoto] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [naoLidos, setNaoLidos] = useState(0);
  const [avisos, setAvisos] = useState<{ id: string; texto: string; lido: boolean; created_at: string }[]>([]);
  const [painelAvisos, setPainelAvisos] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const avisosRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data: sessao } = await supabase.auth.getUser();
      const uid = sessao.user?.id;
      if (!uid) return;
      const { data: perfil } = await supabase
        .from("perfis")
        .select("nome, foto_url")
        .eq("id", uid)
        .maybeSingle();
      const { data: listaAvisos, count } = await supabase
        .from("avisos")
        .select("id,texto,lido,created_at", { count: "exact" })
        .eq("usuario_id", uid)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!ativo) return;
      setNome(perfil?.nome ?? "");
      setNaoLidos(count ?? 0);
      setAvisos(listaAvisos ?? []);
      setFoto(await urlDaFoto(perfil?.foto_url));
    })();
    return () => {
      ativo = false;
    };
  }, [rota]);

  useEffect(() => {
    function fechar(e: PointerEvent) { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); if (!avisosRef.current?.contains(e.target as Node)) setPainelAvisos(false); }
    function escapar(e: KeyboardEvent) { if (e.key === "Escape") { setMenu(false); setPainelAvisos(false); } }
    document.addEventListener("pointerdown", fechar);
    document.addEventListener("keydown", escapar);
    return () => { document.removeEventListener("pointerdown", fechar); document.removeEventListener("keydown", escapar); };
  }, []);

  async function sair() {
    await supabase.auth.signOut();
    navigate({ to: "/entrar", replace: true });
  }

  async function abrirAvisos() {
    const abrir = !painelAvisos;
    setPainelAvisos(abrir);
    setMenu(false);
    if (!abrir || naoLidos === 0) return;
    const ids = avisos.filter((aviso) => !aviso.lido).map((aviso) => aviso.id);
    if (ids.length) await supabase.from("avisos").update({ lido: true }).in("id", ids);
    setAvisos((atuais) => atuais.map((aviso) => ({ ...aviso, lido: true })));
    setNaoLidos(0);
  }

  const iniciais = (nome || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link to="/feed" aria-label="Ir para o feed">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação principal">
            {ITENS.map((i) => (
              <Link
                key={i.para}
                to={i.para}
                className={cn(
                  "rounded-[4px] px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted",
                  rota === i.para && "bg-muted text-primary",
                )}
              >
                {i.rotulo}
              </Link>
            ))}
            <Link
              to="/criar-aula"
              className="ml-2 inline-flex h-11 items-center gap-2 rounded-[4px] bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-accent/90"
            >
              <Plus className="size-4" /> Criar aula
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <div className="relative" ref={avisosRef}>
              <button type="button" onClick={abrirAvisos} aria-haspopup="dialog" aria-expanded={painelAvisos} aria-label={`Avisos${naoLidos ? `, ${naoLidos} não lidos` : ""}`} className="relative flex size-11 items-center justify-center rounded-[4px] hover:bg-muted">
                <Bell className="size-5 text-primary" />
                {naoLidos > 0 && <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">{naoLidos}</span>}
              </button>
              {painelAvisos && <div role="dialog" aria-label="Avisos" className="absolute right-0 mt-2 max-h-96 w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-[8px] border border-border bg-card">
                <div className="border-b border-border px-4 py-3"><h2 className="font-serif text-lg font-semibold">Avisos</h2></div>
                {avisos.length ? <ul className="divide-y divide-border">{avisos.map((aviso) => <li key={aviso.id} className="px-4 py-3"><p className="text-sm">{aviso.texto}</p><time className="mt-1 block text-xs text-muted-foreground">{new Date(aviso.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</time></li>)}</ul> : <p className="p-5 text-center text-sm text-muted-foreground">Nenhum aviso por enquanto.</p>}
              </div>}
            </div>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenu((m) => !m)}
                aria-haspopup="menu"
                aria-expanded={menu}
                aria-label="Abrir menu da conta"
                className="flex size-10 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-sm font-semibold text-primary"
              >
                {foto ? <img src={foto} alt="" className="size-full object-cover" /> : iniciais}
              </button>
              {menu && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-48 overflow-hidden rounded-[8px] border border-border bg-card"
                >
                  <Link
                    to="/perfil"
                    role="menuitem"
                    onClick={() => setMenu(false)}
                    className="flex items-center gap-2 px-3 py-3 text-sm hover:bg-muted"
                  >
                    <UserCog className="size-4" /> Editar perfil
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={sair}
                    className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm hover:bg-muted"
                  >
                    <LogOut className="size-4" /> Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8 pb-28 md:pb-10">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card md:hidden"
        aria-label="Navegação principal"
      >
        <ul className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
          {ITENS.slice(0, 2).map((i) => (
            <ItemMobile key={i.para} {...i} ativo={rota === i.para} />
          ))}
          <li>
            <Link
              to="/criar-aula"
              aria-label="Criar aula"
              className="flex size-14 -translate-y-3 items-center justify-center rounded-full bg-accent text-accent-foreground"
            >
              <Plus className="size-6" />
            </Link>
          </li>
          <ItemMobile {...ITENS[2]} ativo={rota === ITENS[2].para} />
          <ItemMobile para="/perfil" rotulo="Perfil" icone={UserCog} ativo={rota === "/perfil"} />
        </ul>
      </nav>
    </div>
  );
}

function ItemMobile({
  para,
  rotulo,
  icone: Icone,
  ativo,
}: {
  para: string;
  rotulo: string;
  icone: typeof BookOpen;
  ativo: boolean;
}) {
  return (
    <li>
      <Link
        to={para}
        className={cn(
          "flex w-16 flex-col items-center gap-1 rounded-[4px] py-1 text-[11px] font-medium text-muted-foreground",
          ativo && "text-primary",
        )}
      >
        <Icone className="size-5" />
        {rotulo}
      </Link>
    </li>
  );
}
