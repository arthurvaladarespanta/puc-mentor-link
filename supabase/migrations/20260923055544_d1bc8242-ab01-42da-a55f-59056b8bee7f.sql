
-- CURSOS
CREATE TABLE public.cursos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE
);
GRANT SELECT ON public.cursos TO anon, authenticated;
GRANT ALL ON public.cursos TO service_role;
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cursos_leitura_publica" ON public.cursos FOR SELECT USING (true);

INSERT INTO public.cursos (nome) VALUES
 ('Ciência da Computação'),('Engenharia de Computação'),('Engenharia Civil'),
 ('Engenharia de Produção'),('Administração'),('Economia'),('Direito'),
 ('Design'),('Sistemas de Informação');

-- MATERIAS
CREATE TABLE public.materias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  nome_normalizado text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.materias TO anon;
GRANT SELECT, INSERT ON public.materias TO authenticated;
GRANT ALL ON public.materias TO service_role;
ALTER TABLE public.materias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "materias_leitura_publica" ON public.materias FOR SELECT USING (true);
CREATE POLICY "materias_insercao_autenticada" ON public.materias FOR INSERT TO authenticated WITH CHECK (true);

INSERT INTO public.materias (nome, nome_normalizado) VALUES
 ('Cálculo 1','calculo 1'),('Cálculo 2','calculo 2'),('Física 1','fisica 1'),
 ('Estrutura de Dados','estrutura de dados'),('Bioquímica','bioquimica'),
 ('Álgebra Linear','algebra linear'),('Programação 1','programacao 1');

-- PERFIS
CREATE TABLE public.perfis (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  foto_url text,
  curso_id uuid REFERENCES public.cursos(id) ON DELETE SET NULL,
  aviso_resumo_semanal boolean NOT NULL DEFAULT true,
  aviso_nova_mensagem boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.perfis TO authenticated;
GRANT ALL ON public.perfis TO service_role;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perfis_leitura_autenticada" ON public.perfis FOR SELECT TO authenticated USING (true);
CREATE POLICY "perfis_insere_proprio" ON public.perfis FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "perfis_atualiza_proprio" ON public.perfis FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.perfis (id, nome) VALUES (NEW.id, '')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- USUARIO_MATERIAS
CREATE TABLE public.usuario_materias (
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  materia_id uuid NOT NULL REFERENCES public.materias(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, materia_id)
);
GRANT SELECT, INSERT, DELETE ON public.usuario_materias TO authenticated;
GRANT ALL ON public.usuario_materias TO service_role;
ALTER TABLE public.usuario_materias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "um_leitura_autenticada" ON public.usuario_materias FOR SELECT TO authenticated USING (true);
CREATE POLICY "um_insere_proprio" ON public.usuario_materias FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "um_apaga_proprio" ON public.usuario_materias FOR DELETE TO authenticated USING (auth.uid() = usuario_id);

-- AULAS
CREATE TABLE public.aulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  materia_id uuid NOT NULL REFERENCES public.materias(id),
  descricao text NOT NULL CHECK (char_length(descricao) <= 400),
  preco numeric(10,2),
  max_alunos integer,
  local text,
  modo text CHECK (modo IN ('presencial','online')),
  selo text CHECK (selo IN ('Monitoria','Veterano')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  apagada_em timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aulas TO authenticated;
GRANT ALL ON public.aulas TO service_role;
ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aulas_leitura_autenticada" ON public.aulas FOR SELECT TO authenticated USING (true);
CREATE POLICY "aulas_tutor_insere" ON public.aulas FOR INSERT TO authenticated WITH CHECK (auth.uid() = tutor_id);
CREATE POLICY "aulas_tutor_atualiza" ON public.aulas FOR UPDATE TO authenticated USING (auth.uid() = tutor_id) WITH CHECK (auth.uid() = tutor_id);
CREATE POLICY "aulas_tutor_apaga" ON public.aulas FOR DELETE TO authenticated USING (auth.uid() = tutor_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER aulas_updated_at BEFORE UPDATE ON public.aulas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- AULA_HORARIOS
CREATE TABLE public.aula_horarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id uuid NOT NULL REFERENCES public.aulas(id) ON DELETE CASCADE,
  inicio timestamptz NOT NULL,
  duracao_minutos integer NOT NULL CHECK (duracao_minutos IN (60,120))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aula_horarios TO authenticated;
GRANT ALL ON public.aula_horarios TO service_role;
ALTER TABLE public.aula_horarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "horarios_leitura_autenticada" ON public.aula_horarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "horarios_tutor_gerencia" ON public.aula_horarios FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.aulas a WHERE a.id = aula_id AND a.tutor_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.aulas a WHERE a.id = aula_id AND a.tutor_id = auth.uid()));

-- INSCRICOES
CREATE TABLE public.inscricoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id uuid NOT NULL REFERENCES public.aulas(id) ON DELETE CASCADE,
  horario_id uuid NOT NULL REFERENCES public.aula_horarios(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  cancelada_em timestamptz,
  UNIQUE (horario_id, aluno_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inscricoes TO authenticated;
GRANT ALL ON public.inscricoes TO service_role;
ALTER TABLE public.inscricoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inscricoes_visiveis" ON public.inscricoes FOR SELECT TO authenticated
  USING (aluno_id = auth.uid() OR EXISTS (SELECT 1 FROM public.aulas a WHERE a.id = aula_id AND a.tutor_id = auth.uid()));
CREATE POLICY "inscricoes_aluno_insere" ON public.inscricoes FOR INSERT TO authenticated WITH CHECK (aluno_id = auth.uid());
CREATE POLICY "inscricoes_aluno_atualiza" ON public.inscricoes FOR UPDATE TO authenticated USING (aluno_id = auth.uid()) WITH CHECK (aluno_id = auth.uid());
CREATE POLICY "inscricoes_aluno_apaga" ON public.inscricoes FOR DELETE TO authenticated USING (aluno_id = auth.uid());

-- AVALIACOES
CREATE TABLE public.avaliacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inscricao_id uuid NOT NULL UNIQUE REFERENCES public.inscricoes(id) ON DELETE CASCADE,
  nota integer NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.avaliacoes TO authenticated;
GRANT ALL ON public.avaliacoes TO service_role;
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "avaliacoes_leitura_autenticada" ON public.avaliacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "avaliacoes_aluno_insere" ON public.avaliacoes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.inscricoes i WHERE i.id = inscricao_id AND i.aluno_id = auth.uid()));
CREATE POLICY "avaliacoes_aluno_atualiza" ON public.avaliacoes FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.inscricoes i WHERE i.id = inscricao_id AND i.aluno_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.inscricoes i WHERE i.id = inscricao_id AND i.aluno_id = auth.uid()));

-- CONVERSAS
CREATE TABLE public.conversas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id uuid NOT NULL REFERENCES public.aulas(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tutor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (aula_id, aluno_id)
);
GRANT SELECT, INSERT ON public.conversas TO authenticated;
GRANT ALL ON public.conversas TO service_role;
ALTER TABLE public.conversas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversas_participantes" ON public.conversas FOR SELECT TO authenticated
  USING (aluno_id = auth.uid() OR tutor_id = auth.uid());
CREATE POLICY "conversas_aluno_cria" ON public.conversas FOR INSERT TO authenticated WITH CHECK (aluno_id = auth.uid());

-- MENSAGENS
CREATE TABLE public.mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id uuid NOT NULL REFERENCES public.conversas(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  texto text NOT NULL DEFAULT '',
  anexo_url text,
  anexo_nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.mensagens TO authenticated;
GRANT ALL ON public.mensagens TO service_role;
ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mensagens_participantes" ON public.mensagens FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversas c WHERE c.id = conversa_id AND (c.aluno_id = auth.uid() OR c.tutor_id = auth.uid())));
CREATE POLICY "mensagens_autor_envia" ON public.mensagens FOR INSERT TO authenticated
  WITH CHECK (autor_id = auth.uid() AND EXISTS (SELECT 1 FROM public.conversas c WHERE c.id = conversa_id AND (c.aluno_id = auth.uid() OR c.tutor_id = auth.uid())));

-- AVISOS
CREATE TABLE public.avisos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  texto text NOT NULL,
  lido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.avisos TO authenticated;
GRANT ALL ON public.avisos TO service_role;
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "avisos_proprios" ON public.avisos FOR SELECT TO authenticated USING (usuario_id = auth.uid());
CREATE POLICY "avisos_insere" ON public.avisos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "avisos_atualiza_proprio" ON public.avisos FOR UPDATE TO authenticated USING (usuario_id = auth.uid()) WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "avisos_apaga_proprio" ON public.avisos FOR DELETE TO authenticated USING (usuario_id = auth.uid());
