-- Foto de treino agora aceita até 5 MB (era 1 MB, mesmo teto do avatar/progresso).

UPDATE storage.buckets
SET file_size_limit = 5242880
WHERE id = 'workout-photos';
