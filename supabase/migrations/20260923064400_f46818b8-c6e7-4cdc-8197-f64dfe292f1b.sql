DROP FUNCTION IF EXISTS public.ocupacao_horarios(uuid[]);

CREATE TABLE public.aula_horario_ocupacao (
  horario_id uuid PRIMARY KEY REFERENCES public.aula_horarios(id) ON DELETE CASCADE,
  quantidade integer NOT NULL DEFAULT 0 CHECK (quantidade >= 0)
);
GRANT SELECT ON public.aula_horario_ocupacao TO authenticated;
GRANT ALL ON public.aula_horario_ocupacao TO service_role;
ALTER TABLE public.aula_horario_ocupacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ocupacao_leitura_autenticada" ON public.aula_horario_ocupacao
FOR SELECT TO authenticated USING (true);

INSERT INTO public.aula_horario_ocupacao (horario_id, quantidade)
SELECT h.id, count(i.id)::integer
FROM public.aula_horarios h
LEFT JOIN public.inscricoes i ON i.horario_id = h.id AND i.cancelada_em IS NULL
GROUP BY h.id;

CREATE OR REPLACE FUNCTION public.sincronizar_ocupacao_horario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.cancelada_em IS NULL THEN
    INSERT INTO public.aula_horario_ocupacao (horario_id, quantidade)
    VALUES (NEW.horario_id, 1)
    ON CONFLICT (horario_id) DO UPDATE SET quantidade = aula_horario_ocupacao.quantidade + 1;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.cancelada_em IS NULL AND NEW.cancelada_em IS NOT NULL THEN
      UPDATE public.aula_horario_ocupacao SET quantidade = greatest(quantidade - 1, 0) WHERE horario_id = NEW.horario_id;
    ELSIF OLD.cancelada_em IS NOT NULL AND NEW.cancelada_em IS NULL THEN
      INSERT INTO public.aula_horario_ocupacao (horario_id, quantidade)
      VALUES (NEW.horario_id, 1)
      ON CONFLICT (horario_id) DO UPDATE SET quantidade = aula_horario_ocupacao.quantidade + 1;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.cancelada_em IS NULL THEN
    UPDATE public.aula_horario_ocupacao SET quantidade = greatest(quantidade - 1, 0) WHERE horario_id = OLD.horario_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE ALL ON FUNCTION public.sincronizar_ocupacao_horario() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sincronizar_ocupacao_horario_trigger ON public.inscricoes;
CREATE TRIGGER sincronizar_ocupacao_horario_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.inscricoes
FOR EACH ROW EXECUTE FUNCTION public.sincronizar_ocupacao_horario();