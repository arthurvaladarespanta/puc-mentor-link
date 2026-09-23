export function formatarPreco(valor: number | null) {
  if (valor == null) return "Grátis";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

export function formatarDataHora(data: string, incluirData = true) {
  return new Intl.DateTimeFormat("pt-BR", {
    ...(incluirData ? { weekday: "short", day: "2-digit", month: "short" } : {}),
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(data));
}

export function inicioLocal(data: string, hora: string) {
  return new Date(`${data}T${hora}:00`).toISOString();
}