# FinanceFlow — Deploy (Render + Vercel + Neon)

| Parte | Onde | Plano |
|---|---|---|
| Banco PostgreSQL | Neon (`us-east-2`, Ohio), o mesmo usado no desenvolvimento | grátis |
| Backend (Spring Boot, Docker) | Render, Web Service na região Ohio | grátis |
| Frontend (React + Vite, estático) | Vercel | grátis (Hobby) |
| E-mail do "esqueci minha senha" | Brevo, pela API HTTP | grátis (300 e-mails/dia) |

Os arquivos de configuração já estão no repositório:
- `render.yaml`: o Blueprint do backend (Docker, região, healthcheck e variáveis);
- `frontend/vercel.json`: o build do Vite e o redirecionamento das rotas do React para o `index.html`. Sem ele, um
  F5 em `/dashboard` daria 404.

O deploy é sempre a partir da `main`. Cada merge na `main` publica de novo o backend e o frontend.

---

## Ordem

O backend precisa do endereço do frontend (CORS), e o frontend precisa do endereço do backend (`VITE_API_URL`).
Por isso a ordem é: Brevo → backend no Render → frontend na Vercel → voltar no Render e preencher o `CORS_ORIGENS`.

## 1. Brevo (e-mail)

O plano grátis do Render bloqueia as portas de SMTP (25, 465 e 587) desde setembro de 2025. Lá, o Gmail SMTP não
funciona. Por isso o backend manda o código pela API HTTP do Brevo quando a `BREVO_API_KEY` está preenchida.

1. Crie uma conta em brevo.com.
2. Em **Senders, Domains & Dedicated IPs → Senders**, adicione o e-mail que vai aparecer como remetente (pode ser um
   Gmail do grupo) e confirme pelo link que chega nele.
3. Em **SMTP & API → API Keys**, gere uma chave. Ela será a `BREVO_API_KEY`.

Sem domínio próprio, o e-mail pode cair no spam. A tela de redefinição já pede para a pessoa conferir lá.

## 2. Backend no Render

1. Em render.com, entre com o GitHub e clique em **New → Blueprint**.
2. Escolha o repositório `FinanceFlow`. O Render lê o `render.yaml` e mostra o serviço `financeflow-backend`.
3. Preencha as variáveis pedidas:

   | Variável | Valor |
   |---|---|
   | `PGHOST`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` | os mesmos do `.env` (connection string do Neon) |
   | `CORS_ORIGENS` | deixe `http://localhost:5173` por enquanto; troca no passo 4 |
   | `BREVO_API_KEY` | a chave do passo 1 |
   | `MAIL_REMETENTE` | o remetente verificado no Brevo |

   O `JWT_SECRET` é gerado pelo próprio Render.
4. Clique em **Apply**. O primeiro build demora alguns minutos (Maven + Docker).
5. Quando o status ficar **Live**, abra `https://<nome>.onrender.com/actuator/health`. Tem que responder
   `{"status":"UP"}`.

As migrações do Flyway rodam sozinhas na subida. No Neon, que já tem as tabelas, só as novas são aplicadas (a V4,
dos códigos de redefinição de senha, na primeira vez).

## 3. Frontend na Vercel

1. Em vercel.com, entre com o GitHub e clique em **Add New → Project**.
2. Importe o repositório `FinanceFlow` e, em **Root Directory**, escolha `frontend`.
3. Em **Environment Variables**, crie `VITE_API_URL` = `https://<nome>.onrender.com`, sem barra no final. Ela é
   lida no build: se mudar depois, faça um novo deploy.
4. Clique em **Deploy** e anote o endereço (ex: `https://financeflow.vercel.app`).

## 4. Liberar o frontend no backend (CORS)

1. No Render, abra `financeflow-backend` → **Environment**.
2. Troque `CORS_ORIGENS` pelo endereço da Vercel, sem barra no final. Para manter o desenvolvimento local
   funcionando com o mesmo backend, separe por vírgula: `https://financeflow.vercel.app,http://localhost:5173`.
3. Salve. O Render reinicia o serviço.

## 5. Conferir

1. Abra o endereço da Vercel e crie uma conta (senha com maiúscula e número).
2. Faça logout e use "Esqueci minha senha": o código tem que chegar no e-mail.
3. Atualize a página em `/dashboard` (F5): tem que continuar na tela, sem 404.

## Limitações do plano grátis (para a apresentação)

- **O backend "dorme"** depois de 15 minutos sem acesso. O primeiro acesso depois disso demora cerca de 1 minuto
  para responder. Antes de apresentar, abra o `/actuator/health` para acordá-lo.
- **512 MB de memória**: o `Dockerfile` limita a heap do Java a 75% disso.
- O Neon grátis também suspende o banco quando fica parado, e a primeira consulta demora alguns segundos.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Tela de login mostra erro de rede / CORS no console do navegador | `CORS_ORIGENS` sem o endereço exato da Vercel (com `https://`, sem barra no final) |
| Frontend chama `localhost:8080` | `VITE_API_URL` não estava definida no build; defina e faça Redeploy |
| Backend não sobe e o log fala em `JWT_SECRET` | variável apagada; gere de novo em Environment |
| Código de redefinição não chega | `BREVO_API_KEY` ou `MAIL_REMETENTE` errados (o remetente tem que estar verificado); o motivo aparece no log do Render como `falha ao enviar o código` |
