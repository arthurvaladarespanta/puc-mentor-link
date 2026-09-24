DROP POLICY IF EXISTS "inscricoes_aluno_atualiza" ON public.inscricoes;
DROP POLICY IF EXISTS "avisos_insere" ON public.avisos;

CREATE OR REPLACE FUNCTION public.cancelar_inscricao(p_inscricao_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'nao_autenticado' USING ERRCODE = '42501';
  END IF;

  UPDATE public.inscricoes
  SET cancelada_em = now()
  WHERE id = p_inscricao_id
    AND aluno_id = auth.uid()
    AND cancelada_em IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'inscricao_indisponivel' USING ERRCODE = 'P0001';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.editar_aula(
  p_aula_id uuid,
  p_descricao text,
  p_preco numeric,
  p_max_alunos integer,
  p_local text,
  p_modo text,
  p_selo text,
  p_horarios jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  horario jsonb;
  ids_mantidos uuid[] := ARRAY[]::uuid[];
  horario_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'nao_autenticado' USING ERRCODE = '42501';
  END IF;
  IF length(trim(p_descricao)) = 0 OR length(p_descricao) > 400 THEN
    RAISE EXCEPTION 'descricao_invalida' USING ERRCODE = '22001';
  END IF;
  IF jsonb_array_length(p_horarios) = 0 THEN
    RAISE EXCEPTION 'horario_obrigatorio' USING ERRCODE = '23502';
  END IF;

  UPDATE public.aulas
  SET descricao = trim(p_descricao),
      preco = p_preco,
      max_alunos = p_max_alunos,
      local = nullif(trim(p_local), ''),
      modo = p_modo,
      selo = p_selo
  WHERE id = p_aula_id
    AND tutor_id = auth.uid()
    AND apagada_em IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'aula_indisponivel' USING ERRCODE = 'P0001';
  END IF;

  FOR horario IN SELECT * FROM jsonb_array_elements(p_horarios)
  LOOP
    horario_id := nullif(horario->>'id', '')::uuid;
    IF horario_id IS NULL THEN
      INSERT INTO public.aula_horarios (aula_id, inicio, duracao_minutos)
      VALUES (p_aula_id, (horario->>'inicio')::timestamptz, (horario->>'duracao_minutos')::integer)
      RETURNING id INTO horario_id;
    ELSE
      UPDATE public.aula_horarios
      SET inicio = (horario->>'inicio')::timestamptz,
          duracao_minutos = (horario->>'duracao_minutos')::integer
      WHERE id = horario_id AND aula_id = p_aula_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'horario_invalido' USING ERRCODE = 'P0001';
      END IF;
    END IF;
    ids_mantidos := array_append(ids_mantidos, horario_id);
  END LOOP;

  DELETE FROM public.aula_horarios h
  WHERE h.aula_id = p_aula_id
    AND NOT (h.id = ANY(ids_mantidos))
    AND NOT EXISTS (
      SELECT 1 FROM public.inscricoes i
      WHERE i.horario_id = h.id AND i.cancelada_em IS NULL
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.apagar_aula(p_aula_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nome_materia text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'nao_autenticado' USING ERRCODE = '42501';
  END IF;

  UPDATE public.aulas a
  SET apagada_em = now()
  FROM public.materias m
  WHERE a.id = p_aula_id
    AND a.tutor_id = auth.uid()
    AND a.apagada_em IS NULL
    AND m.id = a.materia_id
  RETURNING m.nome INTO nome_materia;

  IF nome_materia IS NULL THEN
    RAISE EXCEPTION 'aula_indisponivel' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.avisos (usuario_id, texto)
  SELECT DISTINCT i.aluno_id, 'A aula de ' || nome_materia || ' foi cancelada pelo tutor.'
  FROM public.inscricoes i
  WHERE i.aula_id = p_aula_id
    AND i.cancelada_em IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.cancelar_inscricao(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.editar_aula(uuid, text, numeric, integer, text, text, text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apagar_aula(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancelar_inscricao(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.editar_aula(uuid, text, numeric, integer, text, text, text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apagar_aula(uuid) TO authenticated, service_role;