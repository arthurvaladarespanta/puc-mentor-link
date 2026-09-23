CREATE OR REPLACE FUNCTION public.validar_horario_aula()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.inicio <= now() THEN
    RAISE EXCEPTION 'horario_no_passado' USING ERRCODE = '22007';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validar_horario_aula_trigger ON public.aula_horarios;
CREATE TRIGGER validar_horario_aula_trigger
BEFORE INSERT OR UPDATE OF inicio ON public.aula_horarios
FOR EACH ROW EXECUTE FUNCTION public.validar_horario_aula();

CREATE OR REPLACE FUNCTION public.validar_inscricao()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  limite integer;
  ocupadas integer;
  inicio_horario timestamptz;
  aula_do_horario uuid;
  tutor_da_aula uuid;
BEGIN
  SELECT h.aula_id, h.inicio, a.max_alunos, a.tutor_id
    INTO aula_do_horario, inicio_horario, limite, tutor_da_aula
  FROM public.aula_horarios h
  JOIN public.aulas a ON a.id = h.aula_id
  WHERE h.id = NEW.horario_id AND a.id = NEW.aula_id AND a.apagada_em IS NULL
  FOR UPDATE OF h;

  IF aula_do_horario IS NULL THEN
    RAISE EXCEPTION 'aula_indisponivel' USING ERRCODE = 'P0001';
  END IF;
  IF inicio_horario <= now() THEN
    RAISE EXCEPTION 'horario_no_passado' USING ERRCODE = '22007';
  END IF;
  IF tutor_da_aula = NEW.aluno_id THEN
    RAISE EXCEPTION 'tutor_nao_pode_se_inscrever' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.inscricoes i
    WHERE i.aula_id = NEW.aula_id AND i.aluno_id = NEW.aluno_id AND i.cancelada_em IS NULL
  ) THEN
    RAISE EXCEPTION 'inscricao_duplicada' USING ERRCODE = '23505';
  END IF;
  IF limite IS NOT NULL THEN
    SELECT count(*) INTO ocupadas
    FROM public.inscricoes i
    WHERE i.horario_id = NEW.horario_id AND i.cancelada_em IS NULL;
    IF ocupadas >= limite THEN
      RAISE EXCEPTION 'horario_lotado' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validar_inscricao_trigger ON public.inscricoes;
CREATE TRIGGER validar_inscricao_trigger
BEFORE INSERT ON public.inscricoes
FOR EACH ROW EXECUTE FUNCTION public.validar_inscricao();

DROP POLICY IF EXISTS conversas_aluno_cria ON public.conversas;
CREATE POLICY "conversas_aluno_cria" ON public.conversas
FOR INSERT TO authenticated
WITH CHECK (
  aluno_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.aulas a
    WHERE a.id = aula_id AND a.tutor_id = tutor_id AND a.apagada_em IS NULL
  )
);

DROP POLICY IF EXISTS anexos_chat_envia ON storage.objects;
CREATE POLICY "anexos_chat_envia" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'anexos-chat'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.conversas c
    WHERE c.id::text = (storage.foldername(name))[2]
      AND (c.aluno_id = auth.uid() OR c.tutor_id = auth.uid())
  )
);

DROP POLICY IF EXISTS anexos_chat_leitura ON storage.objects;
CREATE POLICY "anexos_chat_leitura" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'anexos-chat'
  AND EXISTS (
    SELECT 1 FROM public.conversas c
    WHERE c.id::text = (storage.foldername(name))[2]
      AND (c.aluno_id = auth.uid() OR c.tutor_id = auth.uid())
  )
);

CREATE OR REPLACE FUNCTION public.publicar_aula(
  p_materia_id uuid,
  p_descricao text,
  p_preco numeric,
  p_max_alunos integer,
  p_local text,
  p_modo text,
  p_selo text,
  p_horarios jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  nova_aula_id uuid;
  horario jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'nao_autenticado' USING ERRCODE = '42501'; END IF;
  IF p_materia_id IS NULL THEN RAISE EXCEPTION 'materia_obrigatoria' USING ERRCODE = '23502'; END IF;
  IF length(trim(p_descricao)) = 0 OR length(p_descricao) > 400 THEN RAISE EXCEPTION 'descricao_invalida' USING ERRCODE = '22001'; END IF;
  IF jsonb_array_length(p_horarios) = 0 THEN RAISE EXCEPTION 'horario_obrigatorio' USING ERRCODE = '23502'; END IF;

  INSERT INTO public.aulas (tutor_id, materia_id, descricao, preco, max_alunos, local, modo, selo)
  VALUES (auth.uid(), p_materia_id, trim(p_descricao), p_preco, p_max_alunos, nullif(trim(p_local), ''), p_modo, p_selo)
  RETURNING id INTO nova_aula_id;

  FOR horario IN SELECT * FROM jsonb_array_elements(p_horarios)
  LOOP
    INSERT INTO public.aula_horarios (aula_id, inicio, duracao_minutos)
    VALUES (nova_aula_id, (horario->>'inicio')::timestamptz, (horario->>'duracao_minutos')::integer);
  END LOOP;

  RETURN nova_aula_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.publicar_aula(uuid, text, numeric, integer, text, text, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.confirmar_inscricao(p_aula_id uuid, p_horario_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  tutor uuid;
  conversa_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'nao_autenticado' USING ERRCODE = '42501'; END IF;
  SELECT a.tutor_id INTO tutor FROM public.aulas a WHERE a.id = p_aula_id AND a.apagada_em IS NULL;
  IF tutor IS NULL THEN RAISE EXCEPTION 'aula_indisponivel' USING ERRCODE = 'P0001'; END IF;

  INSERT INTO public.inscricoes (aula_id, horario_id, aluno_id)
  VALUES (p_aula_id, p_horario_id, auth.uid());

  INSERT INTO public.conversas (aula_id, aluno_id, tutor_id)
  VALUES (p_aula_id, auth.uid(), tutor)
  ON CONFLICT (aula_id, aluno_id) DO UPDATE SET tutor_id = EXCLUDED.tutor_id
  RETURNING id INTO conversa_id;

  RETURN conversa_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.confirmar_inscricao(uuid, uuid) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'mensagens'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mensagens;
  END IF;
END $$;