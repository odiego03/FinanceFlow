package com.financeflow.integracao;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
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

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void emailNaoDiferenciaMaiusculasNoCadastroNemNoLogin() throws Exception {
        String email = emailAleatorio();
        cadastrar(email.toUpperCase(), "1");

        enviar(post("/usuarios"), null, """
                {"nome": "Outra", "email": "%s", "senha": "2"}""".formatted(email))
                .andExpect(status().isConflict());

        String token = login("  " + email.toUpperCase() + " ", "1");
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
        cadastrar(email, "certa");

        for (int i = 0; i < 5; i++) {
            enviar(post("/login"), null, corpoLogin(email, "errada")).andExpect(status().isUnauthorized());
        }
        enviar(post("/login"), null, corpoLogin(email, "certa"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.mensagem").exists());
    }

    private String novoUsuario() throws Exception {
        String email = emailAleatorio();
        cadastrar(email, "1");
        return login(email, "1");
    }

    private void cadastrar(String email, String senha) throws Exception {
        enviar(post("/usuarios"), null, """
                {"nome": "Teste", "email": "%s", "senha": "%s"}""".formatted(email, senha))
                .andExpect(status().isCreated());
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
