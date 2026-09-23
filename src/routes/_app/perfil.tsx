import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Bell, Camera, Check, IdCard, Mail, RotateCcw, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SeletorDeMateria } from "@/components/SeletorDeMateria";
import { CampoSenha } from "@/components/CampoSenha";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/Spinner";
import { urlDaFoto } from "@/lib/fotos";
import type { Materia } from "@/lib/materias";
import { traduzirErroAuth } from "@/lib/erros-auth";

export const Route = createFileRoute("/_app/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil | Calouro+" },
      { name: "description", content: "Gerencie suas informações e preferências de contato no Calouro+." },
      { property: "og:title", content: "Meu perfil | Calouro+" },
      {
        property: "og:description",
        content: "Gerencie suas informações e preferências de contato no Calouro+.",
      },
    ],
  }),
  component: Perfil,
});

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Perfil() {
  const arquivoRef = useRef<HTMLInputElement>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [uid, setUid] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [emailOriginal, setEmailOriginal] = useState("");
  const [cursos, setCursos] = useState<{ id: string; nome: string }[]>([]);
  const [cursoId, setCursoId] = useState("");
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [foto, setFoto] = useState<string | null>(null);
  const [resumoSemanal, setResumoSemanal] = useState(true);
  const [avisoMensagem, setAvisoMensagem] = useState(true);
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [erros, setErros] = useState<{ nome?: string; email?: string; senha?: string; geral?: string }>({});
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: sessao } = await supabase.auth.getUser();
      const user = sessao.user;
      if (!user) return;
      setUid(user.id);
      setEmail(user.email ?? "");
      setEmailOriginal(user.email ?? "");

      const [{ data: perfil }, { data: listaCursos }, { data: vinculos }] = await Promise.all([
        supabase.from("perfis").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("cursos").select("id, nome").order("nome"),
        supabase
          .from("usuario_materias")
          .select("materia_id, materias(id, nome, nome_normalizado)")
          .eq("usuario_id", user.id),
      ]);

      setCursos(listaCursos ?? []);
      if (perfil) {
        setNome(perfil.nome ?? "");
        setCursoId(perfil.curso_id ?? "");
        setResumoSemanal(perfil.aviso_resumo_semanal);
        setAvisoMensagem(perfil.aviso_nova_mensagem);
        setFoto(await urlDaFoto(perfil.foto_url));
      }
      setMaterias(
        ((vinculos ?? []).map((v) => v.materias).filter(Boolean) as unknown as Materia[]) ?? [],
      );
      setCarregando(false);
    })();
  }, []);

  async function enviarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setErros({});
    const caminho = `${uid}/${Date.now()}-${arquivo.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from("fotos-perfil").upload(caminho, arquivo, { upsert: true });
    if (error) {
      setErros({ geral: "Não deu para enviar a foto. Use JPG ou PNG de até 5 MB." });
      return;
    }
    const { data: perfilAnterior } = await supabase.from("perfis").select("foto_url").eq("id", uid).maybeSingle();
    const { error: erroPerfil } = await supabase.from("perfis").update({ foto_url: caminho }).eq("id", uid);
    if (erroPerfil) {
      await supabase.storage.from("fotos-perfil").remove([caminho]);
      setErros({ geral: "A foto foi enviada, mas não conseguimos atualizar o perfil. Tente de novo." });
      return;
    }
    if (perfilAnterior?.foto_url && perfilAnterior.foto_url !== caminho) {
      await supabase.storage.from("fotos-perfil").remove([perfilAnterior.foto_url]);
    }
    setFoto(await urlDaFoto(caminho));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSucesso(false);
    const novos: typeof erros = {};
    if (nome.trim().length < 2) novos.nome = "Escreva seu nome completo.";
    if (!FORMATO_EMAIL.test(email.trim())) novos.email = "E-mail inválido. Use o formato nome@exemplo.com.";
    if (trocandoSenha && novaSenha.length < 6) novos.senha = "A nova senha precisa ter pelo menos 6 caracteres.";
    setErros(novos);
    if (Object.keys(novos).length > 0) return;

    setSalvando(true);

    const { error: erroPerfil } = await supabase
      .from("perfis")
      .update({
        nome: nome.trim(),
        curso_id: cursoId || null,
        aviso_resumo_semanal: resumoSemanal,
        aviso_nova_mensagem: avisoMensagem,
      })
      .eq("id", uid);

    if (erroPerfil) {
      setSalvando(false);
      setErros({ geral: "Não foi possível salvar o perfil. Confira sua conexão e tente de novo." });
      return;
    }

    const { error: erroRemocaoMaterias } = await supabase.from("usuario_materias").delete().eq("usuario_id", uid);
    if (erroRemocaoMaterias) {
      setSalvando(false);
      setErros({ geral: "Não foi possível atualizar suas matérias. Tente de novo." });
      return;
    }
    if (materias.length > 0) {
      const { error: erroMaterias } = await supabase
        .from("usuario_materias")
        .insert(materias.map((m) => ({ usuario_id: uid, materia_id: m.id })));
      if (erroMaterias) {
        setSalvando(false);
        setErros({ geral: "Não foi possível atualizar suas matérias. Escolha novamente e tente de novo." });
        return;
      }
    }

    if (email.trim() !== emailOriginal) {
      const { error } = await supabase.auth.updateUser({ email: email.trim() });
      if (error) {
        setEmail(emailOriginal);
        setErros({ email: `${traduzirErroAuth(error, "email")} Mantivemos o e-mail anterior.` });
        setSalvando(false);
        return;
      }
      setEmailOriginal(email.trim());
    }

    if (trocandoSenha && novaSenha) {
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) {
        setErros({ senha: traduzirErroAuth(error, "senha") });
        setSalvando(false);
        return;
      }
      setTrocandoSenha(false);
      setSenhaAtual("");
      setNovaSenha("");
    }

    setSalvando(false);
    setSucesso(true);
  }

  if (carregando) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="font-serif text-3xl font-semibold text-primary">Meu perfil</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Gerencie suas informações e preferências de contato.
      </p>

      <form onSubmit={salvar} className="mt-6 space-y-6" noValidate>
        <div className="flex flex-col items-center gap-3 rounded-[8px] border border-border bg-card p-6">
          <div className="size-28 overflow-hidden rounded-full border-2 border-accent bg-muted">
            {foto ? (
              <img src={foto} alt="Sua foto de perfil" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-2xl font-semibold text-primary">
                {(nome || "?").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <input
            ref={arquivoRef}
            type="file"
            accept="image/jpeg,image/png"
            className="sr-only"
            onChange={enviarFoto}
          />
          <Button type="button" variant="secondary" onClick={() => arquivoRef.current?.click()}>
            <Camera className="size-4" /> Alterar foto
          </Button>
          <p className="text-xs text-muted-foreground">Formatos aceitos: JPG, PNG até 5 MB</p>
        </div>

        <div className="space-y-5 rounded-[8px] border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-primary">
            <IdCard className="size-5" /> Informações pessoais
          </h2>

          <div className="space-y-1.5">
            <label htmlFor="nome" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Nome completo
            </label>
            <div className="relative">
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} className="pr-10" />
              <User className="pointer-events-none absolute right-3 top-3.5 size-4 text-muted-foreground" />
            </div>
            {erros.nome && <p className="text-sm text-destructive">{erros.nome}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              E-mail
            </label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pr-10"
              />
              <Mail className="pointer-events-none absolute right-3 top-3.5 size-4 text-muted-foreground" />
            </div>
            {erros.email && <p className="text-sm text-destructive">{erros.email}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="curso" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Curso
            </label>
            <select
              id="curso"
              value={cursoId}
              onChange={(e) => setCursoId(e.target.value)}
              className="h-11 w-full rounded-[4px] border border-input bg-card px-3 text-sm"
            >
              <option value="">Selecione seu curso</option>
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Senha de acesso
            </span>
            {trocandoSenha ? (
              <div className="space-y-3">
                <CampoSenha
                  id="senha-atual"
                  value={senhaAtual}
                  onChange={setSenhaAtual}
                  autoComplete="current-password"
                  placeholder="Senha atual"
                />
                <CampoSenha
                  id="senha-nova"
                  value={novaSenha}
                  onChange={setNovaSenha}
                  autoComplete="new-password"
                  placeholder="Nova senha"
                />
                {erros.senha && <p className="text-sm text-destructive">{erros.senha}</p>}
                <Button type="button" variant="ghost" onClick={() => setTrocandoSenha(false)}>
                  Cancelar troca de senha
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-[4px] border border-input bg-muted px-3 py-2.5">
                <span className="tracking-[0.3em] text-muted-foreground">••••••••</span>
                <button
                  type="button"
                  onClick={() => setTrocandoSenha(true)}
                  className="flex items-center gap-2 text-sm font-medium text-primary"
                >
                  <RotateCcw className="size-4" /> Alterar senha
                </button>
              </div>
            )}
          </div>

          <SeletorDeMateria rotulo="Matérias de interesse" selecionadas={materias} aoMudar={setMaterias} />
        </div>

        <div className="space-y-4 rounded-[8px] border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-primary">
            <Bell className="size-5" /> Notificações
          </h2>
          <p className="text-sm text-muted-foreground">
            Escolha como deseja receber as atualizações sobre suas aulas e mensagens.
          </p>

          <div className="flex items-start justify-between gap-4 rounded-[4px] bg-muted p-4">
            <div>
              <p className="font-medium">Resumo semanal por e-mail</p>
               <p className="text-sm text-muted-foreground">Uma vez por semana, as aulas novas das suas matérias.</p>
            </div>
            <Switch
              checked={resumoSemanal}
              onCheckedChange={setResumoSemanal}
              aria-label="Resumo semanal por e-mail"
            />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-[4px] bg-muted p-4">
            <div>
              <p className="font-medium">Aviso de nova mensagem por e-mail</p>
               <p className="text-sm text-muted-foreground">Quando alguém te mandar mensagem e você não estiver no site.</p>
            </div>
            <Switch
              checked={avisoMensagem}
              onCheckedChange={setAvisoMensagem}
              aria-label="Aviso de nova mensagem por e-mail"
            />
          </div>
        </div>

        {erros.geral && <p className="text-sm text-destructive">{erros.geral}</p>}
        {sucesso && (
          <p className="flex items-center gap-2 rounded-[4px] border border-border bg-card p-3 text-sm font-medium text-success">
            <Check className="size-4" /> Alterações salvas.
          </p>
        )}

        <Button type="submit" className="w-full" disabled={salvando}>
          {salvando ? <Spinner className="size-4" /> : <>
            <Check className="size-4 text-accent" /> Salvar alterações
          </>}
        </Button>

        <Link to="/feed" className="flex items-center justify-center gap-2 text-sm font-medium text-primary">
          <ArrowLeft className="size-4" /> Voltar ao feed
        </Link>
      </form>
    </section>
  );
}
