import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarPlus, Plus, Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SeletorDeMateria } from "@/components/SeletorDeMateria";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/Spinner";
import { inicioLocal } from "@/lib/formatacao";
import type { Materia } from "@/lib/materias";

export const Route = createFileRoute("/_app/criar-aula")({
  head: () => ({
    meta: [
      { title: "Criar aula | Calouro+" },
      { name: "description", content: "Ofereça uma aula particular para calouros da PUC-Rio." },
      { property: "og:title", content: "Criar aula | Calouro+" },
      { property: "og:description", content: "Ofereça uma aula particular para calouros da PUC-Rio." },
    ],
  }),
  component: CriarAula,
});

type Horario = { data: string; hora: string; duracao: "60" | "120" };
const novoHorario = (): Horario => ({ data: "", hora: "", duracao: "60" });

function CriarAula() {
  const navigate = useNavigate();
  const [materia, setMateria] = useState<Materia[]>([]);
  const [descricao, setDescricao] = useState("");
  const [horarios, setHorarios] = useState<Horario[]>([novoHorario()]);
  const [preco, setPreco] = useState("");
  const [maxAlunos, setMaxAlunos] = useState("");
  const [modo, setModo] = useState("");
  const [local, setLocal] = useState("");
  const [selo, setSelo] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  function alterarHorario(indice: number, campo: keyof Horario, valor: string) {
    setHorarios((atuais) => atuais.map((h, i) => i === indice ? { ...h, [campo]: valor } as Horario : h));
  }

  async function publicar(e: React.FormEvent) {
    e.preventDefault();
    const novos: Record<string, string> = {};
    if (!materia[0]) novos.materia = "Escolha uma matéria.";
    if (!descricao.trim()) novos.descricao = "Conte o que será estudado na aula.";
    const convertidos = horarios.map((h, i) => {
      if (!h.data || !h.hora) novos[`horario-${i}`] = "Informe a data e a hora.";
      const inicio = h.data && h.hora ? new Date(`${h.data}T${h.hora}:00`) : null;
      if (inicio && inicio <= new Date()) novos[`horario-${i}`] = "Escolha um horário futuro.";
      return inicio ? { inicio: inicioLocal(h.data, h.hora), duracao_minutos: Number(h.duracao) } : null;
    });
    const numeroPreco = preco ? Number(preco.replace(",", ".")) : null;
    const numeroMax = maxAlunos ? Number(maxAlunos) : null;
    if (numeroPreco != null && (Number.isNaN(numeroPreco) || numeroPreco < 0)) novos.preco = "Informe um preço válido.";
    if (numeroMax != null && (!Number.isInteger(numeroMax) || numeroMax < 1)) novos.max = "Informe pelo menos 1 aluno.";
    setErros(novos);
    if (Object.keys(novos).length || !materia[0]) return;

    setSalvando(true);
    const { error } = await supabase.rpc("publicar_aula", {
      p_materia_id: materia[0].id,
      p_descricao: descricao.trim(),
      p_preco: numeroPreco,
      p_max_alunos: numeroMax,
      p_local: local.trim() || null,
      p_modo: modo || null,
      p_selo: selo || null,
      p_horarios: convertidos.filter(Boolean),
    } as never);
    setSalvando(false);
    if (error) {
      setErros({ geral: /passado/.test(error.message) ? "Um dos horários já passou. Escolha outro." : "Não foi possível publicar. Confira os dados e tente de novo." });
      return;
    }
    navigate({ to: "/feed", search: { publicada: "1" } });
  }

  return (
    <section className="mx-auto max-w-2xl">
      <div className="flex items-center gap-2 text-sm font-semibold uppercase text-accent"><CalendarPlus className="size-4" /> Nova atividade acadêmica</div>
      <h1 className="mt-2 font-serif text-4xl font-semibold text-primary">Criar uma aula</h1>
      <p className="mt-2 text-muted-foreground">Preencha as informações para publicar sua aula e ajudar outros alunos.</p>

      <form onSubmit={publicar} className="mt-6 space-y-6 rounded-[8px] border border-border bg-card p-5 sm:p-7" noValidate>
        <Campo rotulo="Matéria" obrigatorio erro={erros.materia}>
          <SeletorDeMateria selecionadas={materia} aoMudar={setMateria} multiplo={false} />
        </Campo>
        <Campo rotulo="Descrição" obrigatorio erro={erros.descricao} complemento={`${descricao.length} / 400`}>
          <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={400} className="min-h-32 resize-y rounded-[4px] bg-background" placeholder="Conte os tópicos que pretende cobrir e como a aula vai ajudar." />
        </Campo>

        <fieldset className="space-y-3">
          <legend className="font-medium">Horários <span className="text-destructive">*</span></legend>
          {horarios.map((h, i) => (
            <div key={i} className="grid gap-3 rounded-[4px] border border-border bg-background p-3 sm:grid-cols-[1fr_1fr_120px_44px]">
              <Input aria-label={`Data do horário ${i + 1}`} type="date" value={h.data} onChange={(e) => alterarHorario(i, "data", e.target.value)} />
              <Input aria-label={`Hora do horário ${i + 1}`} type="time" value={h.hora} onChange={(e) => alterarHorario(i, "hora", e.target.value)} />
              <select aria-label={`Duração do horário ${i + 1}`} value={h.duracao} onChange={(e) => alterarHorario(i, "duracao", e.target.value)} className="h-11 rounded-[4px] border border-input bg-card px-3 text-sm">
                <option value="60">60 min</option><option value="120">120 min</option>
              </select>
              <Button type="button" variant="ghost" size="icon" aria-label={`Remover horário ${i + 1}`} disabled={horarios.length === 1} onClick={() => setHorarios((atuais) => atuais.filter((_, n) => n !== i))}><Trash2 /></Button>
              {erros[`horario-${i}`] && <p className="text-sm text-destructive sm:col-span-4">{erros[`horario-${i}`]}</p>}
            </div>
          ))}
          <Button type="button" variant="secondary" onClick={() => setHorarios((h) => [...h, novoHorario()])}><Plus /> Adicionar outro horário</Button>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Preço em R$" erro={erros.preco}><Input inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="Ex.: 50,00" /></Campo>
          <Campo rotulo="Qtd. máxima de alunos" erro={erros.max}><Input type="number" min="1" value={maxAlunos} onChange={(e) => setMaxAlunos(e.target.value)} placeholder="Ex.: 5" /></Campo>
          <Campo rotulo="Modalidade"><select value={modo} onChange={(e) => setModo(e.target.value)} className="h-11 w-full rounded-[4px] border border-input bg-card px-3 text-sm"><option value="">Não informar</option><option value="presencial">Presencial</option><option value="online">Online</option></select></Campo>
          <Campo rotulo="Selo"><select value={selo} onChange={(e) => setSelo(e.target.value)} className="h-11 w-full rounded-[4px] border border-input bg-card px-3 text-sm"><option value="">Sem selo</option><option value="Monitoria">Monitoria</option><option value="Veterano">Veterano</option></select></Campo>
        </div>
        <Campo rotulo="Local"><Input value={local} onChange={(e) => setLocal(e.target.value)} placeholder={modo === "online" ? "Ex.: link enviado pelo chat" : "Ex.: Biblioteca Central"} /></Campo>
        {erros.geral && <p className="text-sm text-destructive">{erros.geral}</p>}
        <Button type="submit" className="w-full" disabled={salvando}>{salvando ? <Spinner /> : <><Send className="text-accent" /> Publicar aula</>}</Button>
        <Button asChild type="button" variant="ghost" className="w-full"><Link to="/feed">Cancelar e descartar</Link></Button>
      </form>
    </section>
  );
}

function Campo({ rotulo, obrigatorio, erro, complemento, children }: { rotulo: string; obrigatorio?: boolean; erro?: string; complemento?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><div className="flex justify-between gap-3"><span className="font-medium">{rotulo}{obrigatorio && <span className="text-destructive"> *</span>}</span>{complemento && <span className="text-sm text-muted-foreground">{complemento}</span>}</div>{children}{erro && <p className="text-sm text-destructive">{erro}</p>}</div>;
}
