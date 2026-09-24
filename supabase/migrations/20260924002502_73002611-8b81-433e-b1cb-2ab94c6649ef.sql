CREATE POLICY "inscricoes_aluno_atualiza"
ON public.inscricoes
FOR UPDATE
TO authenticated
USING (aluno_id = auth.uid())
WITH CHECK (aluno_id = auth.uid());

CREATE OR REPLACE FUNCTION public.cancelar_inscricao(p_inscricao_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'nao_autenticado' USING ERRCODE = '42501';
  END IF;
  UPDATE public.inscricoes
  SET cancelada_em = now()
  WHERE id = p_inscricao_id AND aluno_id = auth.uid() AND cancelada_em IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'inscricao_indisponivel' USING ERRCODE = 'P0001'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.editar_aula(
  p_aula_id uuid, p_descricao text, p_preco numeric, p_max_alunos integer,
  p_local text, p_modo text, p_selo text, p_horarios jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  horario jsonb;
  ids_mantidos uuid[] := ARRAY[]::uuid[];
  horario_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'nao_autenticado' USING ERRCODE = '42501'; END IF;
  IF length(trim(p_descricao)) = 0 OR length(p_descricao) > 400 THEN RAISE EXCEPTION 'descricao_invalida' USING ERRCODE = '22001'; END IF;
  IF jsonb_array_length(p_horarios) = 0 THEN RAISE EXCEPTION 'horario_obrigatorio' USING ERRCODE = '23502'; END IF;

  UPDATE public.aulas
  SET descricao = trim(p_descricao), preco = p_preco, max_alunos = p_max_alunos,
      local = nullif(trim(p_local), ''), modo = p_modo, selo = p_selo
  WHERE id = p_aula_id AND tutor_id = auth.uid() AND apagada_em IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'aula_indisponivel' USING ERRCODE = 'P0001'; END IF;

  FOR horario IN SELECT * FROM jsonb_array_elements(p_horarios)
  LOOP
    horario_id := nullif(horario->>'id', '')::uuid;
    IF horario_id IS NULL THEN
      INSERT INTO public.aula_horarios (aula_id, inicio, duracao_minutos)
      VALUES (p_aula_id, (horario->>'inicio')::timestamptz, (horario->>'duracao_minutos')::integer)
      RETURNING id INTO horario_id;
    ELSE
      UPDATE public.aula_horarios
      SET inicio = (horario->>'inicio')::timestamptz, duracao_minutos = (horario->>'duracao_minutos')::integer
      WHERE id = horario_id AND aula_id = p_aula_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'horario_invalido' USING ERRCODE = 'P0001'; END IF;
    END IF;
    ids_mantidos := array_append(ids_mantidos, horario_id);
  END LOOP;

  DELETE FROM public.aula_horarios h
  WHERE h.aula_id = p_aula_id AND NOT (h.id = ANY(ids_mantidos))
    AND NOT EXISTS (SELECT 1 FROM public.inscricoes i WHERE i.horario_id = h.id AND i.cancelada_em IS NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.notificar_aula_apagada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE nome_materia text;
BEGIN
  IF OLD.apagada_em IS NULL AND NEW.apagada_em IS NOT NULL THEN
    SELECT nome INTO nome_materia FROM public.materias WHERE id = NEW.materia_id;
    INSERT INTO public.avisos (usuario_id, texto)
    SELECT DISTINCT i.aluno_id, 'A aula de ' || nome_materia || ' foi cancelada pelo tutor.'
    FROM public.inscricoes i
    WHERE i.aula_id = NEW.id AND i.cancelada_em IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notificar_aula_apagada_trigger ON public.aulas;
CREATE TRIGGER notificar_aula_apagada_trigger
AFTER UPDATE OF apagada_em ON public.aulas
FOR EACH ROW EXECUTE FUNCTION public.notificar_aula_apagada();

CREATE OR REPLACE FUNCTION public.apagar_aula(p_aula_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'nao_autenticado' USING ERRCODE = '42501'; END IF;
  UPDATE public.aulas SET apagada_em = now()
  WHERE id = p_aula_id AND tutor_id = auth.uid() AND apagada_em IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'aula_indisponivel' USING ERRCODE = 'P0001'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.notificar_aula_apagada() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notificar_aula_apagada() TO service_role;