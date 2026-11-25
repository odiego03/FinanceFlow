# Desenvolvimento sem Docker

Para a equipe: roda backend e frontend direto na máquina, ligados ao banco compartilhado (Neon). Para avaliar o sistema, use o Docker, como no README.

## Como rodar o backend

O banco é compartilhado (Neon) — não precisa instalar Postgres local.

1. Peça a connection string do banco compartilhado pra quem já tem acesso (não fica em nenhum arquivo versionado).
2. Crie `backend/src/main/resources/application-local.properties` (já está no `.gitignore`, nunca é commitado):
   ```properties
   spring.datasource.url=jdbc:postgresql://<host>:<porta>/<banco>?sslmode=require
   spring.datasource.username=<usuario>
   spring.datasource.password=<senha>
   # qualquer texto com 32+ caracteres; sem isso o backend não sobe (não há chave padrão no código)
   jwt.chave-secreta=<chave-secreta-local>
   ```
3. Empacote e rode o jar com o profile `local` (mais confiável que `mvnw spring-boot:run`, que se mostrou instável em alguns ambientes):
   ```bash
   cd backend
   ./mvnw clean package -DskipTests
   java -jar target/financeflow-backend-0.1.0.jar --spring.profiles.active=local
   ```
4. API disponível em `http://localhost:8080`. As tabelas são criadas e atualizadas pelas migrações do Flyway (`backend/src/main/resources/db/migration`, de `V1` a `V6`), que rodam sozinhas ao subir — não precisa rodar SQL manual. Mudança de esquema = um arquivo `V<n>__descricao.sql` novo; nunca editar uma migração que já rodou.

## Como rodar o frontend

```bash
cd frontend
npm install
npm run dev     # http://localhost:5173
```

O frontend chama a API no endereço da variável `VITE_API_URL` (padrão do `.env.example`: `http://localhost:8080`). Rodando com `npm run dev`, use `FRONTEND_URL=http://localhost:5173` no backend, pro botão do e-mail de confirmação abrir o endereço certo.
