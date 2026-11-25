package com.financeflow.integracao;

import com.financeflow.config.CargaDemonstracao;
import com.financeflow.model.Usuario;
import com.financeflow.repository.MetaFinanceiraRepository;
import com.financeflow.repository.TransacaoRepository;
import com.financeflow.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Carga inicial do Docker (profile "demo"): sobe a aplicação com ela ativa e confere o que ficou no banco.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles({"teste", "demo"})
class CargaDemonstracaoTest {

    // Linhas dos extratos de agosto (45), setembro (48) e outubro (55) em src/main/resources/demo
    private static final int TRANSACOES_DOS_EXTRATOS = 148;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CargaDemonstracao carga;

    @Autowired
    private UsuarioRepository repositorioUsuario;

    @Autowired
    private TransacaoRepository repositorioTransacao;

    @Autowired
    private MetaFinanceiraRepository repositorioMeta;

    @Test
    void criaUsuarioDeTesteComHistoricoEMetaSemDuplicarAoRodarDeNovo() throws Exception {
        Usuario usuario = repositorioUsuario.findByEmail(CargaDemonstracao.EMAIL).orElseThrow();
        assertThat(usuario.isEmailVerificado()).isTrue();
        // Toda linha dos extratos foi categorizada e importada
        assertThat(repositorioTransacao.findByUsuarioId(usuario.getId())).hasSize(TRANSACOES_DOS_EXTRATOS);
        assertThat(repositorioMeta.findByUsuarioId(usuario.getId())).hasSize(1);

        carga.run(null);
        assertThat(repositorioTransacao.findByUsuarioId(usuario.getId())).hasSize(TRANSACOES_DOS_EXTRATOS);

        mockMvc.perform(post("/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + CargaDemonstracao.EMAIL + "\",\"senha\":\"" + CargaDemonstracao.SENHA + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }
}
