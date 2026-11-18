-- Uma meta pode ter 1 ou mais categorias de receita (antes era exatamente uma, em metas_financeiras.categoria_id).
-- O vínculo passa pra tabela de junção; cada meta existente fica com a categoria que já tinha.
create table metas_categorias (
    meta_id      bigint not null references metas_financeiras,
    categoria_id bigint not null references categorias,
    primary key (meta_id, categoria_id)
);

create index if not exists idx_metas_categorias_categoria on metas_categorias (categoria_id);

insert into metas_categorias (meta_id, categoria_id)
select id, categoria_id from metas_financeiras;

drop index if exists idx_metas_categoria;
alter table metas_financeiras drop column categoria_id;
