# Scripts

## Gerar JWK VAPID para notificações push

Para as notificações push funcionarem, o secret `VAPID_KEYS_JWK` precisa estar configurado no Supabase.

1. **Instale o Deno** (se ainda não tiver):
   - macOS/Linux: `curl -fsSL https://deno.land/install.sh | sh`
   - Ou: https://deno.land

2. **Execute o script:**
   ```bash
   deno run scripts/generate-vapid-jwk.ts
   ```

3. **Copie o JSON** exibido (o bloco entre as linhas de comentário).

4. **No Supabase:**
   - Dashboard → Project Settings → Edge Functions → Secrets
   - Adicione: Nome = `VAPID_KEYS_JWK`, Valor = o JSON copiado
   - Salve

Não compartilhe o JWK nem faça commit dele no repositório (ele contém a chave privada).
