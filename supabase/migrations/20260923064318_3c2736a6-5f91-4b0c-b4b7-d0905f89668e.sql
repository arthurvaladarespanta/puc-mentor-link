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
  WHERE h.id = NEW.horario_id AND a.id = NEW.aula_id AND a.apagada_em IS NULL;

  IF aula_do_horario IS NULL THEN
    RAISE EXCEPTION 'aula_indisponivel' USING ERRCODE = 'P0001';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.horario_id::text, 0));
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
    SELECT count(*) INTO ocupadas FROM public.inscricoes i
    WHERE i.horario_id = NEW.horario_id AND i.cancelada_em IS NULL;
    IF ocupadas >= limite THEN
      RAISE EXCEPTION 'horario_lotado' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS conversas_aluno_cria ON public.conversas;
CREATE POLICY "conversas_aluno_cria" ON public.conversas
FOR INSERT TO authenticated
WITH CHECK (
  aluno_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.aulas a
    WHERE a.id = conversas.aula_id
      AND a.tutor_id = conversas.tutor_id
      AND a.apagada_em IS NULL
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