type ErroAuth = { message?: string; code?: string; status?: number } | null | undefined;

export function traduzirErroAuth(erro: ErroAuth, contexto: "cadastro" | "email" | "senha") {
  const texto = `${erro?.code ?? ""} ${erro?.message ?? ""}`.toLowerCase();
  const minimo = texto.match(/(?:at least|minimum of)\s+(\d+)/)?.[1] ?? "6";

  if (/weak_password|password.*(pwned|leaked|breach|common)|compromised/.test(texto)) {
    return "Essa senha é muito comum. Escolha outra mais difícil de adivinhar.";
  }
  if (/password.*(short|characters|length)|weak_password/.test(texto)) {
    return `A senha precisa ter pelo menos ${minimo} caracteres.`;
  }
  if (/already.*registered|user_already_exists|email.*(exists|registered)|already been registered/.test(texto)) {
    return "Esse e-mail já tem conta. Tente entrar ou recuperar a senha.";
  }
  if (/invalid.*email|email.*invalid/.test(texto)) {
    return "E-mail inválido. Confira o endereço e tente de novo.";
  }
  if (/same_password/.test(texto)) return "A nova senha precisa ser diferente da atual.";
  if (/reauthentication|current.*password|invalid.*password/.test(texto)) {
    return "A senha atual não confere. Digite novamente e tente de novo.";
  }
  if (/rate.?limit|too many/.test(texto)) return "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.";
  if (/network|fetch|connection/.test(texto)) return "Sem conexão. Confira sua internet e tente de novo.";
  if (contexto === "email") return "Não foi possível alterar o e-mail. Confira o endereço e tente de novo.";
  if (contexto === "senha") return "Não foi possível alterar a senha. Tente novamente em instantes.";
  return "Não deu para criar a conta agora. Tente de novo em instantes.";
}