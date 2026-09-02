-- Jobs do pg_cron do FitRank. Não vêm no dump (o schema `cron` fica de fora),
-- então são recriados aqui a partir do que estava no Cloud.
--
-- Duas mudanças em relação ao Cloud, ambas deliberadas:
--
-- 1. A URL é interna (http://caddy/functions/v1/...). O pg_net roda dentro da
--    rede do compose, então a chamada não precisa sair para a internet, subir
--    TLS e voltar pelo Cloudflare só para falar com o container ao lado.
--
-- 2. O segredo sai de public.app_secrets, não do Vault. É a MESMA fonte que a
--    função usa para comparar o header, então some a chance de as duas cópias
--    divergirem — no Cloud o valor vivia duplicado (vault + app_secrets) e
--    nada garantia que fossem iguais.

select cron.schedule(
  'weekly-summary',
  '0 3 * * 1',   -- segunda 03:00 UTC = meia-noite em São Paulo
  $job$
  select net.http_post(
    url := 'http://caddy/functions/v1/weekly-summary',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select value from public.app_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $job$
);

select cron.schedule(
  'streak-reminder',
  '0 23 * * *',  -- 23:00 UTC = 20h BRT
  $job$
  select net.http_post(
    url := 'http://caddy/functions/v1/daily-nudge',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select value from public.app_secrets where name = 'cron_secret')
    ),
    body := '{"kind":"streak_reminder"}'::jsonb
  );
  $job$
);

select cron.schedule(
  'challenge-results',
  '0 12 * * *',  -- 12:00 UTC = 9h BRT
  $job$
  select net.http_post(
    url := 'http://caddy/functions/v1/daily-nudge',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select value from public.app_secrets where name = 'cron_secret')
    ),
    body := '{"kind":"challenge_results"}'::jsonb
  );
  $job$
);
