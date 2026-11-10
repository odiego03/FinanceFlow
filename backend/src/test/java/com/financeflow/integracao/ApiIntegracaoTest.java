package com.financeflow.integracao;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.financeflow.service.EnvioEmailService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Sobe a aplicação inteira (segurança, controllers, services e banco H2 com as migrações do Flyway) e testa pelas
 * rotas HTTP. Cada teste cria os próprios usuários com email aleatório, então um não interfere no outro.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("teste")
class ApiIntegracaoTest {

    private static final String SENHA_VALIDA = "Senha1";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    // Sem SMTP nos testes: o mock guarda o código que seria mandado por e-mail
    @MockBean
    private EnvioEmailService envioEmail;

    @Test
    void emailNaoDiferenciaMaiusculasNoCadastroNemNoLogin() throws Exception {
        String email = emailAleatorio();
        cadastrar(email.toUpperCase(), SENHA_VALIDA);

        enviar(post("/usuarios"), null, corpoCadastro(email, "Outra2"))
                .andExpect(status().isConflict());

        String token = login("  " + email.toUpperCase() + " ", SENHA_VALIDA);
        enviar(get("/usuarios/me"), token, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email));
    }

    @Test
    void semTokenDa401ERotaInexistenteDa404() throws Exception {
        enviar(get("/transacoes"), null, null).andExpect(status().isUnauthorized());

        String token = novoUsuario();
        enviar(get("/rota-que-nao-existe"), token, null).andExpect(status().isNotFound());
    }

    @Test
    void usuarioNaoEnxergaNemAlteraDadosDeOutro() throws Exception {
        String tokenA = novoUsuario();
        String tokenB = novoUsuario();
        long transacaoDeA = criarTransacao(tokenA, categoriaId(tokenA, "DESPESA"), "DESPESA", "50.00");

        enviar(get("/transacoes/" + transacaoDeA), tokenB, null).andExpect(status().isNotFound());
        enviar(put("/transacoes/" + transacaoDeA), tokenB, corpoTransacao(categoriaId(tokenB, "DESPESA"), "DESPESA", "1.00"))
                .andExpect(status().isNotFound());
        enviar(delete("/transacoes/" + transacaoDeA), tokenB, null).andExpect(status().isNotFound());
        enviar(get("/transacoes"), tokenB, null).andExpect(jsonPath("$.length()").value(0));

        enviar(get("/transacoes/" + transacaoDeA), tokenA, null).andExpect(status().isOk());
    }

    @Test
    void categoriaEmUsoNaoMudaDeTipo() throws Exception {
        String token = novoUsuario();
        long categoria = categoriaId(token, "DESPESA");
        criarTransacao(token, categoria, "DESPESA", "10.00");

        enviar(put("/categorias/" + categoria), token, """
                {"nome": "Agora receita", "tipo": "RECEITA"}""")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensagem").value(containsString("mudar o tipo")));

        enviar(post("/categorias"), token, """
                {"nome": "Nova", "tipo": "DESPESA"}""").andExpect(status().isCreated());
        long semUso = categoriaPorNome(token, "Nova");
        enviar(put("/categorias/" + semUso), token, """
                {"nome": "Nova", "tipo": "RECEITA"}""")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipo").value("RECEITA"));
    }

    @Test
    void valoresForaDosLimitesDao400EmVezDe500() throws Exception {
        String token = novoUsuario();
        long categoria = categoriaId(token, "DESPESA");

        enviar(post("/transacoes"), token, corpoTransacao(categoria, "DESPESA", "100000000.00"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.valor").exists());

        enviar(post("/transacoes"), token, """
                {"categoriaId": %d, "tipo": "DESPESA", "valor": 1, "data": "2026-09-01", "descricao": "%s"}"""
                .formatted(categoria, "x".repeat(201)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.descricao").exists());
    }

    @Test
    void contribuicaoNaoPassaDoSaldoDaTransacao() throws Exception {
        String token = novoUsuario();
        long categoriaReceita = categoriaId(token, "RECEITA");
        long receita = criarTransacao(token, categoriaReceita, "RECEITA", "100.00");
        long meta = idDe(enviar(post("/metas"), token, """
                {"nome": "Viagem", "valorAlvo": 1000, "categoriaId": %d}""".formatted(categoriaReceita))
                .andExpect(status().isCreated()));

        enviar(post("/metas/" + meta + "/contribuicoes"), token, """
                {"transacaoId": %d, "valor": 60}""".formatted(receita)).andExpect(status().isCreated());
        enviar(post("/metas/" + meta + "/contribuicoes"), token, """
                {"transacaoId": %d, "valor": 50}""".formatted(receita)).andExpect(status().isBadRequest());

        enviar(get("/metas"), token, null).andExpect(jsonPath("$[0].valorAtual").value(60.0));
    }

    @Test
    void tutorialApareceProUsuarioNovoESalvarPreferenciasNaoReabre() throws Exception {
        String token = novoUsuario();
        enviar(get("/usuarios/me/preferencias"), token, null).andExpect(jsonPath("$.tutorialConcluido").value(false));

        enviar(put("/usuarios/me/preferencias/tutorial"), token, """
                {"concluido": true}""")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tutorialConcluido").value(true))
                .andExpect(jsonPath("$.limiteTotal").value(80));

        enviar(put("/usuarios/me/preferencias"), token, """
                {"ocultarValores": true, "limiteEssencial": 50, "limiteTotal": 80, "simuladorPercentualCdi": 100,
                 "simuladorPrazoMeses": 12, "tema": "ESCURO"}""")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tutorialConcluido").value(true));
    }

    @Test
    void bloqueiaLoginDepoisDeCincoSenhasErradas() throws Exception {
        String email = emailAleatorio();
        cadastrar(email, SENHA_VALIDA);

        for (int i = 0; i < 5; i++) {
            enviar(post("/login"), null, corpoLogin(email, "errada")).andExpect(status().isUnauthorized());
        }
        enviar(post("/login"), null, corpoLogin(email, SENHA_VALIDA))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.mensagem").exists());
    }

    @Test
    void cadastroExigeSenhaForteEEmailComDominio() throws Exception {
        // curta, sem maiúscula, sem número
        for (String senhaFraca : new String[]{"Ab1", "senha1", "Senhaaa"}) {
            enviar(post("/usuarios"), null, corpoCadastro(emailAleatorio(), senhaFraca))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.senha").value(containsString("maiúscula")));
        }
        for (String emailInvalido : new String[]{"fulano", "fulano@gmail", "fulano @gmail.com"}) {
            enviar(post("/usuarios"), null, corpoCadastro(emailInvalido, SENHA_VALIDA))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.email").exists());
        }
        enviar(post("/usuarios"), null, corpoCadastro(emailAleatorio(), "Ação2026")).andExpect(status().isCreated());
    }

    @Test
    void trocaDeSenhaTambemExigeSenhaForte() throws Exception {
        String token = novoUsuario();
        enviar(put("/usuarios/me/senha"), token, """
                {"senhaAtual": "%s", "novaSenha": "fraca1"}""".formatted(SENHA_VALIDA))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.novaSenha").exists());
        enviar(put("/usuarios/me/senha"), token, """
                {"senhaAtual": "%s", "novaSenha": "NovaSenha9"}""".formatted(SENHA_VALIDA))
                .andExpect(status().is2xxSuccessful());
    }

    @Test
    void redefineSenhaComOCodigoMandadoPorEmail() throws Exception {
        String email = emailAleatorio();
        cadastrar(email, SENHA_VALIDA);

        enviar(post("/senha/esqueci"), null, corpoEmail(email.toUpperCase())).andExpect(status().isNoContent());
        String codigo = codigoEnviadoPara(email);

        enviar(post("/senha/redefinir"), null, corpoRedefinir(email, codigo, "fraca")).andExpect(status().isBadRequest());
        enviar(post("/senha/redefinir"), null, corpoRedefinir(email, codigo, "Redefinida7")).andExpect(status().isNoContent());

        enviar(post("/login"), null, corpoLogin(email, SENHA_VALIDA)).andExpect(status().isUnauthorized());
        login(email, "Redefinida7");
        // O código só vale uma vez
        enviar(post("/senha/redefinir"), null, corpoRedefinir(email, codigo, "OutraSenha8"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void esqueciSenhaNaoRevelaSeOEmailTemContaNemReenviaNoMesmoMinuto() throws Exception {
        String semConta = emailAleatorio();
        enviar(post("/senha/esqueci"), null, corpoEmail(semConta)).andExpect(status().isNoContent());
        verify(envioEmail, never()).enviarCodigoRedefinicao(eq(semConta), any(), any(), anyLong());

        String email = emailAleatorio();
        cadastrar(email, SENHA_VALIDA);
        enviar(post("/senha/esqueci"), null, corpoEmail(email)).andExpect(status().isNoContent());
        enviar(post("/senha/esqueci"), null, corpoEmail(email)).andExpect(status().isNoContent());
        verify(envioEmail, times(1)).enviarCodigoRedefinicao(eq(email), any(), any(), anyLong());
    }

    @Test
    void codigoInvalidaDepoisDeCincoTentativasErradas() throws Exception {
        String email = emailAleatorio();
        cadastrar(email, SENHA_VALIDA);
        enviar(post("/senha/esqueci"), null, corpoEmail(email)).andExpect(status().isNoContent());
        String codigo = codigoEnviadoPara(email);
        String errado = codigo.equals("000000") ? "111111" : "000000";

        for (int i = 0; i < 5; i++) {
            enviar(post("/senha/redefinir"), null, corpoRedefinir(email, errado, "Redefinida7"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.mensagem").value(containsString("código inválido")));
        }
        enviar(post("/senha/redefinir"), null, corpoRedefinir(email, codigo, "Redefinida7"))
                .andExpect(status().isBadRequest());
        login(email, SENHA_VALIDA);
    }

    private String codigoEnviadoPara(String email) {
        ArgumentCaptor<String> codigo = ArgumentCaptor.forClass(String.class);
        verify(envioEmail).enviarCodigoRedefinicao(eq(email), any(), codigo.capture(), anyLong());
        assertThat(codigo.getValue()).matches("\\d{6}");
        return codigo.getValue();
    }

    private String corpoEmail(String email) {
        return """
                {"email": "%s"}""".formatted(email);
    }

    private String corpoRedefinir(String email, String codigo, String novaSenha) {
        return """
                {"email": "%s", "codigo": "%s", "novaSenha": "%s"}""".formatted(email, codigo, novaSenha);
    }

    private String novoUsuario() throws Exception {
        String email = emailAleatorio();
        cadastrar(email, SENHA_VALIDA);
        return login(email, SENHA_VALIDA);
    }

    private void cadastrar(String email, String senha) throws Exception {
        enviar(post("/usuarios"), null, corpoCadastro(email, senha)).andExpect(status().isCreated());
    }

    private String corpoCadastro(String email, String senha) {
        return """
                {"nome": "Teste", "email": "%s", "senha": "%s"}""".formatted(email, senha);
    }

    private String login(String email, String senha) throws Exception {
        String resposta = enviar(post("/login"), null, corpoLogin(email, senha))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(resposta).get("token").asText();
    }

    private long categoriaId(String token, String tipo) throws Exception {
        for (JsonNode categoria : listarCategorias(token)) {
            if (categoria.get("tipo").asText().equals(tipo)) {
                return categoria.get("id").asLong();
            }
        }
        throw new AssertionError("usuário sem categoria pré-definida do tipo " + tipo);
    }

    private long categoriaPorNome(String token, String nome) throws Exception {
        for (JsonNode categoria : listarCategorias(token)) {
            if (categoria.get("nome").asText().equals(nome)) {
                return categoria.get("id").asLong();
            }
        }
        throw new AssertionError("categoria não encontrada: " + nome);
    }

    private JsonNode listarCategorias(String token) throws Exception {
        String resposta = enviar(get("/categorias"), token, null).andReturn().getResponse().getContentAsString();
        JsonNode categorias = objectMapper.readTree(resposta);
        assertThat(categorias.isArray()).isTrue();
        return categorias;
    }

    private long criarTransacao(String token, long categoriaId, String tipo, String valor) throws Exception {
        return idDe(enviar(post("/transacoes"), token, corpoTransacao(categoriaId, tipo, valor))
                .andExpect(status().isCreated()));
    }

    private long idDe(ResultActions resultado) throws Exception {
        return objectMapper.readTree(resultado.andReturn().getResponse().getContentAsString()).get("id").asLong();
    }

    private String corpoTransacao(long categoriaId, String tipo, String valor) {
        return """
                {"categoriaId": %d, "tipo": "%s", "valor": %s, "data": "2026-09-01"}""".formatted(categoriaId, tipo, valor);
    }

    private String corpoLogin(String email, String senha) {
        return """
                {"email": "%s", "senha": "%s"}""".formatted(email, senha);
    }

    private ResultActions enviar(MockHttpServletRequestBuilder requisicao, String token, String corpo) throws Exception {
        if (token != null) {
            requisicao.header("Authorization", "Bearer " + token);
        }
        if (corpo != null) {
            requisicao.contentType(MediaType.APPLICATION_JSON).content(corpo);
        }
        return mockMvc.perform(requisicao);
    }

    private String emailAleatorio() {
        return "teste-" + UUID.randomUUID() + "@financeflow.com";
    }
}
