import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  encontrarEquivalente,
  normalizarMateria,
  sugerirMaterias,
  type Materia,
} from "@/lib/materias";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/Spinner";

interface Props {
  selecionadas: Materia[];
  aoMudar: (materias: Materia[]) => void;
  multiplo?: boolean;
  rotulo?: string;
}

export function SeletorDeMateria({ selecionadas, aoMudar, multiplo = true, rotulo }: Props) {
  const [todas, setTodas] = useState<Materia[]>([]);
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const [posicao, setPosicao] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    let ativo = true;
    supabase
      .from("materias")
      .select("id, nome, nome_normalizado")
      .order("nome")
      .then(({ data }) => {
        if (!ativo) return;
        setTodas((data ?? []) as Materia[]);
        setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (!aberto) return;
    function atualizar() {
      const rect = campo.current?.getBoundingClientRect();
      if (rect) setPosicao({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    function teclado(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAberto(false);
        campo.current?.focus();
      }
    }
    atualizar();
    window.addEventListener("resize", atualizar);
    window.addEventListener("scroll", atualizar, true);
    document.addEventListener("keydown", teclado);
    return () => {
      window.removeEventListener("resize", atualizar);
      window.removeEventListener("scroll", atualizar, true);
      document.removeEventListener("keydown", teclado);
    };
  }, [aberto]);

  useEffect(() => {
    function fora(e: MouseEvent) {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  const sugestoes = useMemo(
    () =>
      sugerirMaterias(todas, busca).filter((m) => !selecionadas.some((s) => s.id === m.id)),
    [todas, busca, selecionadas],
  );

  const equivalente = encontrarEquivalente(todas, busca);
  const podeCriar = normalizarMateria(busca).length > 1 && !equivalente;

  function escolher(materia: Materia) {
    setErro(null);
    if (selecionadas.some((s) => s.id === materia.id)) return;
    aoMudar(multiplo ? [...selecionadas, materia] : [materia]);
    setBusca("");
    setAberto(false);
  }

  async function criar() {
    const nome = busca.trim().replace(/\s+/g, " ");
    const nome_normalizado = normalizarMateria(nome);
    setSalvando(true);
    setErro(null);
    const { data, error } = await supabase
      .from("materias")
      .insert({ nome, nome_normalizado })
      .select("id, nome, nome_normalizado")
      .single();
    setSalvando(false);
    if (error || !data) {
      // Alguém pode ter criado a mesma matéria: tenta reaproveitar.
      const { data: existente } = await supabase
        .from("materias")
        .select("id, nome, nome_normalizado")
        .eq("nome_normalizado", nome_normalizado)
        .maybeSingle();
      if (existente) {
        setTodas((t) => [...t, existente as Materia]);
        escolher(existente as Materia);
        return;
      }
      setErro("Não deu para criar a matéria agora. Tente de novo em instantes.");
      return;
    }
    setTodas((t) => [...t, data as Materia]);
    escolher(data as Materia);
  }

  return (
    <div className="space-y-2" ref={caixa}>
      {rotulo && (
        <label htmlFor="busca-materia" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {rotulo}
        </label>
      )}

      {selecionadas.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {selecionadas.map((m) => (
            <li key={m.id}>
              <span className="inline-flex items-center gap-2 rounded-[4px] border border-border bg-muted px-3 py-1.5 text-sm">
                <span className="size-1.5 rounded-full bg-accent" aria-hidden />
                {m.nome}
                <button
                  type="button"
                  aria-label={`Remover ${m.nome}`}
                  onClick={() => aoMudar(selecionadas.filter((s) => s.id !== m.id))}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="size-4" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <Input
          ref={campo}
          id="busca-materia"
          value={busca}
          onFocus={() => setAberto(true)}
          onChange={(e) => {
            setBusca(e.target.value);
            setAberto(true);
          }}
          placeholder={multiplo ? "Buscar ou adicionar matéria" : "Buscar matéria"}
          autoComplete="off"
        />
        {aberto && typeof document !== "undefined" && createPortal(
          <div
            className="fixed z-[100] overflow-hidden rounded-[8px] border border-border bg-card"
            style={{ top: posicao.top, left: posicao.left, width: posicao.width }}
          >
            {carregando ? (
              <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                <Spinner className="size-4" /> Carregando matérias
              </div>
            ) : (
              <ul className="max-h-56 overflow-auto">
                {sugestoes.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => escolher(m)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      {m.nome}
                    </button>
                  </li>
                ))}
                {equivalente && sugestoes.length === 0 && (
                  <li className="px-3 py-2 text-sm text-muted-foreground">Essa matéria já está escolhida.</li>
                )}
                {podeCriar && (
                  <li>
                    <button
                      type="button"
                      onClick={criar}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-muted"
                    >
                      {salvando ? <Spinner className="size-4" /> : <Plus className="size-4 text-accent" />}
                      Criar matéria “{busca.trim()}”
                    </button>
                  </li>
                )}
                {!podeCriar && sugestoes.length === 0 && !equivalente && (
                  <li className="px-3 py-2 text-sm text-muted-foreground">
                    Digite o nome da matéria para buscar ou criar.
                  </li>
                )}
              </ul>
            )}
          </div>,
          document.body,
        )}
      </div>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
    </div>
  );
}
