export interface Materia {
  id: string;
  nome: string;
  nome_normalizado: string;
}

/**
 * Remove acentos, converte para minúsculas, remove espaços das pontas
 * e reduz espaços repetidos a um só.
 */
export function normalizarMateria(texto: string): string {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** Procura uma matéria equivalente (mesmo nome normalizado) na lista. */
export function encontrarEquivalente(
  materias: Pick<Materia, "id" | "nome" | "nome_normalizado">[],
  texto: string,
): Materia | undefined {
  const alvo = normalizarMateria(texto);
  if (!alvo) return undefined;
  return materias.find((m) => m.nome_normalizado === alvo) as Materia | undefined;
}

export type ResultadoMateria =
  { acao: "usar_existente"; materia: Materia } | { acao: "criar"; nome: string; nome_normalizado: string };

/** Decide entre reaproveitar uma matéria existente ou criar uma nova. */
export function encontrarOuCriar(
  materias: Pick<Materia, "id" | "nome" | "nome_normalizado">[],
  texto: string,
): ResultadoMateria {
  const existente = encontrarEquivalente(materias, texto);
  if (existente) return { acao: "usar_existente", materia: existente };
  return { acao: "criar", nome: texto.trim().replace(/\s+/g, " "), nome_normalizado: normalizarMateria(texto) };
}

/** Sugestões por trecho digitado, comparando pelo nome normalizado. */
export function sugerirMaterias(
  materias: Pick<Materia, "id" | "nome" | "nome_normalizado">[],
  texto: string,
  limite = 50,
): Materia[] {
  const alvo = normalizarMateria(texto);
  if (!alvo) return materias.slice(0, limite) as Materia[];
  return materias.filter((m) => m.nome_normalizado.includes(alvo)).slice(0, limite) as Materia[];
}
