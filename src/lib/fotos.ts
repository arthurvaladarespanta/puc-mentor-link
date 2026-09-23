import { supabase } from "@/integrations/supabase/client";

/** Gera uma URL temporária para uma foto de perfil guardada no armazenamento. */
export async function urlDaFoto(caminho: string | null | undefined): Promise<string | null> {
  if (!caminho) return null;
  if (caminho.startsWith("http")) return caminho;
  const { data } = await supabase.storage.from("fotos-perfil").createSignedUrl(caminho, 60 * 60);
  return data?.signedUrl ?? null;
}
