-- O Postgres não cria índice em chave estrangeira sozinho. Quase toda consulta filtra por usuário
-- (e muitas por período), e as exclusões em cascata procuram pela transação ou pela meta.
create index if not exists idx_transacoes_usuario_data on transacoes (usuario_id, data);
create index if not exists idx_transacoes_categoria on transacoes (categoria_id);
create index if not exists idx_transacoes_parcelamento on transacoes (parcelamento_id);
create index if not exists idx_categorias_usuario on categorias (usuario_id);
create index if not exists idx_metas_usuario on metas_financeiras (usuario_id);
create index if not exists idx_metas_categoria on metas_financeiras (categoria_id);
create index if not exists idx_parcelamentos_usuario on parcelamentos (usuario_id);
create index if not exists idx_contribuicoes_meta on contribuicoes_meta (meta_id);
create index if not exists idx_contribuicoes_transacao on contribuicoes_meta (transacao_id);
