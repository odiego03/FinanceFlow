-- Nullable: linhas que já existem ficam null, que vale "ainda não viu o tutorial"
alter table preferencias_usuarios add column if not exists tutorial_concluido boolean;
