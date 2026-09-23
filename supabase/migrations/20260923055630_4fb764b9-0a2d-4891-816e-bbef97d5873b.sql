
CREATE POLICY "fotos_perfil_leitura" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'fotos-perfil');
CREATE POLICY "fotos_perfil_envia" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fotos-perfil' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "fotos_perfil_atualiza" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'fotos-perfil' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "fotos_perfil_apaga" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'fotos-perfil' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "anexos_chat_envia" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'anexos-chat' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "anexos_chat_leitura" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'anexos-chat');
