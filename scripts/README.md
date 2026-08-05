# Scripts

## Gerar os ícones da marca

```bash
node scripts/generate-brand-icons.mjs
```

A fonte da verdade é `public/brand/fitrank-mark.svg` (mais o `favicon.svg`, que é uma
versão simplificada do mark para tamanhos pequenos). O script deriva tudo a partir
dela — `app-icon.svg`, `maskable-icon.svg`, os PNG de 16 a 512, o apple-touch-icon e
o `public/favicon.ico` — então **não edite os arquivos gerados à mão**: troque o mark
e rode o script de novo.

A rasterização usa o Chrome headless instalado na máquina (nenhuma dependência npm
para isso). Se o Chrome não estiver no caminho padrão do macOS, ajuste a constante
`CHROME` no script.

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
