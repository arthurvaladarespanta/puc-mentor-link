CREATE OR REPLACE FUNCTION public.ocupacao_horarios(p_horarios uuid[])
RETURNS TABLE (horario_id uuid, quantidade bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.horario_id, count(*)
  FROM public.inscricoes i
  WHERE i.horario_id = ANY(p_horarios)
    AND i.cancelada_em IS NULL
  GROUP BY i.horario_id;
$$;
REVOKE ALL ON FUNCTION public.ocupacao_horarios(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ocupacao_horarios(uuid[]) TO authenticated;