import { describe, expect, it } from "vitest";
import { encontrarEquivalente, encontrarOuCriar, normalizarMateria, sugerirMaterias } from "./materias";

const lista = [
  { id: "1", nome: "Cálculo 1", nome_normalizado: "calculo 1" },
  { id: "2", nome: "Estrutura de Dados", nome_normalizado: "estrutura de dados" },
];

describe("normalizarMateria", () => {
  it("remove acentos e deixa em minúsculas", () => {
    expect(normalizarMateria("Cálculo 1")).toBe("calculo 1");
  });

  it("tira espaços das pontas e repetidos", () => {
    expect(normalizarMateria("  CÁLCULO   1 ")).toBe("calculo 1");
    expect(normalizarMateria("calculo 1")).toBe("calculo 1");
  });

  it("lida com texto vazio", () => {
    expect(normalizarMateria("   ")).toBe("");
  });
});

describe("encontrarEquivalente", () => {
  it("acha a matéria mesmo com grafia diferente", () => {
    expect(encontrarEquivalente(lista, " cálculo  1 ")?.id).toBe("1");
  });

  it("não acha quando não existe equivalente", () => {
    expect(encontrarEquivalente(lista, "Física 2")).toBeUndefined();
  });
});

describe("encontrarOuCriar", () => {
  it("usa a existente quando equivalente", () => {
    const r = encontrarOuCriar(lista, "CALCULO 1");
    expect(r.acao).toBe("usar_existente");
    if (r.acao === "usar_existente") expect(r.materia.nome).toBe("Cálculo 1");
  });

  it("cria quando não há equivalente", () => {
    const r = encontrarOuCriar(lista, "  Física   Teórica ");
    expect(r.acao).toBe("criar");
    if (r.acao === "criar") {
      expect(r.nome).toBe("Física Teórica");
      expect(r.nome_normalizado).toBe("fisica teorica");
    }
  });
});

describe("sugerirMaterias", () => {
  it("sugere por trecho normalizado", () => {
    expect(sugerirMaterias(lista, "dad").map((m) => m.id)).toEqual(["2"]);
  });
});
