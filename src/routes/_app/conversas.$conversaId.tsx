import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText, Image, Paperclip, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AvatarPerfil } from "@/components/AvatarPerfil";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/Spinner";

export const Route = createFileRoute("/_app/conversas/$conversaId")({
  head: () => ({ meta: [{ title: "Mensagem | Calouro+" }, { name: "description", content: "Converse sobre sua aula no Calouro+." }, { property: "og:title", content: "Mensagem | Calouro+" }, { property: "og:description", content: "Converse sobre sua aula no Calouro+." }] }),
  component: Chat,
});

type Mensagem = { id: string; autor_id: string; texto: string; anexo_url: string | null; anexo_nome: string | null; created_at: string; pendente?: boolean; falhou?: boolean };
type Contexto = { id: string; aluno_id: string; tutor_id: string; aulas: { materias: { nome: string } }; outro: { nome: string; foto_url: string | null } };

function Chat() {
  const { conversaId } = Route.useParams();
  const [uid, setUid] = useState("");
  const [contexto, setContexto] = useState<Contexto | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [online, setOnline] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  async function carregar() {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return;
    setUid(userId);
    const { data: conversa } = await supabase.from("conversas").select("id,aluno_id,tutor_id,aulas(materias(nome))").eq("id", conversaId).maybeSingle();
    if (!conversa) { setCarregando(false); return; }
    const outroId = conversa.aluno_id === userId ? conversa.tutor_id : conversa.aluno_id;
    const [{ data: perfil }, { data: lista }] = await Promise.all([
      supabase.from("perfis").select("nome,foto_url").eq("id", outroId).single(),
      supabase.from("mensagens").select("*").eq("conversa_id", conversaId).order("created_at"),
    ]);
    setContexto({ ...conversa, outro: perfil ?? { nome: "Pessoa", foto_url: null } } as unknown as Contexto);
    setMensagens((lista ?? []) as Mensagem[]);
    setCarregando(false);
  }

  useEffect(() => { void carregar(); }, [conversaId]);
  useEffect(() => {
    if (!uid) return;
    const canal = supabase.channel(`conversa:${conversaId}`, { config: { presence: { key: uid } } })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensagens", filter: `conversa_id=eq.${conversaId}` }, (evento) => {
        const nova = evento.new as Mensagem;
        setMensagens((atuais) => atuais.some((m) => m.id === nova.id) ? atuais : [...atuais.filter((m) => !m.pendente || m.texto !== nova.texto), nova]);
      })
      .on("presence", { event: "sync" }, () => {
        const presentes = canal.presenceState();
        setOnline(Object.keys(presentes).some((id) => id !== uid));
      }).subscribe(async (status) => { if (status === "SUBSCRIBED") await canal.track({ online_at: new Date().toISOString() }); });
    return () => { void supabase.removeChannel(canal); };
  }, [conversaId, uid]);
  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: "smooth" }); }, [mensagens]);

  async function inserir(textoMensagem: string, anexo?: { caminho: string; nome: string }) {
    if (!uid) return false;
    const { error } = await supabase.from("mensagens").insert({ conversa_id: conversaId, autor_id: uid, texto: textoMensagem, anexo_url: anexo?.caminho ?? null, anexo_nome: anexo?.nome ?? null });
    return !error;
  }

  async function enviar(e?: React.FormEvent) {
    e?.preventDefault();
    const conteudo = texto.trim();
    if (!conteudo || enviando) return;
    setTexto(""); setEnviando(true); setErro(null);
    const temporaria: Mensagem = { id: `local-${Date.now()}`, autor_id: uid, texto: conteudo, anexo_url: null, anexo_nome: null, created_at: new Date().toISOString(), pendente: true };
    setMensagens((atuais) => [...atuais, temporaria]);
    if (!navigator.onLine || !(await inserir(conteudo))) {
      localStorage.setItem(`calouro-pendente-${conversaId}`, JSON.stringify({ texto: conteudo }));
      setMensagens((atuais) => atuais.map((m) => m.id === temporaria.id ? { ...m, pendente: false, falhou: true } : m));
    }
    setEnviando(false);
  }

  useEffect(() => {
    async function reenviar() {
      const chave = `calouro-pendente-${conversaId}`;
      const salvo = localStorage.getItem(chave);
      if (!salvo) return;
      const pendente = JSON.parse(salvo) as { texto: string };
      if (await inserir(pendente.texto)) { localStorage.removeItem(chave); setMensagens((atuais) => atuais.filter((m) => !m.falhou)); }
    }
    window.addEventListener("online", reenviar);
    if (navigator.onLine) void reenviar();
    return () => window.removeEventListener("online", reenviar);
  }, [conversaId, uid]);

  async function anexar(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo || !uid) return;
    if (arquivo.size > 10 * 1024 * 1024 || (!arquivo.type.startsWith("image/") && arquivo.type !== "application/pdf")) { setErro("Escolha uma imagem ou PDF de até 10 MB."); return; }
    setEnviando(true); setErro(null);
    const seguro = arquivo.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const caminho = `${uid}/${conversaId}/${Date.now()}-${seguro}`;
    const { error: erroUpload } = await supabase.storage.from("anexos-chat").upload(caminho, arquivo, { contentType: arquivo.type });
    if (erroUpload || !(await inserir("", { caminho, nome: arquivo.name }))) setErro("Não foi possível enviar o anexo. Tente de novo.");
    setEnviando(false); e.target.value = "";
  }

  const grupos = useMemo(() => agrupar(mensagens), [mensagens]);
  if (carregando) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!contexto) return <div className="text-center"><h1 className="font-serif text-3xl">Conversa não encontrada</h1><Button asChild className="mt-5"><Link to="/conversas">Voltar às conversas</Link></Button></div>;
  const souAluno = contexto.aluno_id === uid;
  return <section className="mx-auto -my-8 flex min-h-[calc(100vh-8rem)] max-w-3xl flex-col bg-card md:my-0 md:min-h-[70vh] md:rounded-[8px] md:border md:border-border">
    {sessionStorage.getItem("calouro-inscricao-confirmada") === "1" && <p className="border-b border-border bg-background p-3 text-center font-medium text-success" ref={() => sessionStorage.removeItem("calouro-inscricao-confirmada")}>Inscrição confirmada!</p>}
    <header className="flex items-center gap-3 border-b border-border p-4"><Button asChild variant="ghost" size="icon"><Link to="/conversas" aria-label="Voltar"><ArrowLeft /></Link></Button><AvatarPerfil caminho={contexto.outro.foto_url} nome={contexto.outro.nome} /><div><h1 className="font-serif text-xl font-semibold">{contexto.outro.nome}</h1><p className="text-sm text-muted-foreground">{contexto.aulas.materias.nome} · <span className={online ? "text-success" : ""}>{online ? "● Online" : "Offline"}</span></p></div></header>
    <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">{mensagens.length === 0 && <p className="mx-auto mt-14 max-w-sm text-center text-muted-foreground">{souAluno ? "Diga oi e conte o que você quer estudar!" : "Dê as boas-vindas e combine os detalhes da aula!"}</p>}{grupos.map((g) => <div key={g.dia}><div className="my-4 text-center text-xs font-medium text-muted-foreground">{g.rotulo}</div><div className="space-y-2">{g.itens.map((m) => <Bolha key={m.id} mensagem={m} propria={m.autor_id === uid} />)}</div></div>)}<div ref={fimRef} /></div>
    {erro && <p className="px-4 text-sm text-destructive">{erro}</p>}
    <form onSubmit={enviar} className="flex items-center gap-2 border-t border-border p-3"><input ref={arquivoRef} className="sr-only" type="file" accept="image/*,application/pdf" onChange={anexar} /><Button type="button" variant="ghost" size="icon" aria-label="Anexar imagem ou PDF" onClick={() => arquivoRef.current?.click()}><Paperclip /></Button><Input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva uma mensagem" aria-label="Mensagem" className="flex-1" /><Button type="submit" size="icon" aria-label="Enviar mensagem" disabled={enviando || !texto.trim()}>{enviando ? <Spinner /> : <Send />}</Button></form>
  </section>;
}

function agrupar(mensagens: Mensagem[]) {
  const hoje = new Date(); const ontem = new Date(); ontem.setDate(hoje.getDate() - 1);
  const mapa = new Map<string, Mensagem[]>();
  mensagens.forEach((m) => { const chave = new Date(m.created_at).toLocaleDateString("pt-BR"); mapa.set(chave, [...(mapa.get(chave) ?? []), m]); });
  return [...mapa].map(([dia, itens]) => ({ dia, itens, rotulo: dia === hoje.toLocaleDateString("pt-BR") ? "Hoje" : dia === ontem.toLocaleDateString("pt-BR") ? "Ontem" : dia }));
}

function Bolha({ mensagem, propria }: { mensagem: Mensagem; propria: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { if (mensagem.anexo_url) supabase.storage.from("anexos-chat").createSignedUrl(mensagem.anexo_url, 3600).then(({ data }) => setUrl(data?.signedUrl ?? null)); }, [mensagem.anexo_url]);
  const imagem = /\.(png|jpe?g|gif|webp)$/i.test(mensagem.anexo_nome ?? "");
  return <div className={`flex ${propria ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] rounded-[8px] px-3 py-2 text-sm ${propria ? "bg-primary text-primary-foreground" : "border border-border bg-background"}`}>{mensagem.texto && <p className="whitespace-pre-wrap">{mensagem.texto}</p>}{url && <a href={url} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-2 rounded-[4px] border border-current/20 p-2 underline underline-offset-2">{imagem ? <Image className="size-4" /> : <FileText className="size-4" />}{mensagem.anexo_nome}</a>}<div className={`mt-1 text-right text-[10px] ${propria ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{new Date(mensagem.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}{mensagem.falhou ? " · não enviada" : mensagem.pendente ? " · enviando" : ""}</div></div></div>;
}