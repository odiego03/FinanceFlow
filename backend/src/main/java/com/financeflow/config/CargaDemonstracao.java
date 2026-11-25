package com.financeflow.config;

import com.financeflow.dto.BancoExtrato;
import com.financeflow.dto.LinhaImportacaoConfirmacaoRequisicao;
import com.financeflow.dto.LinhaImportacaoResposta;
import com.financeflow.dto.MetaFinanceiraRequisicao;
import com.financeflow.model.Categoria;
import com.financeflow.model.TipoMovimentacao;
import com.financeflow.model.Usuario;
import com.financeflow.repository.CategoriaRepository;
import com.financeflow.repository.UsuarioRepository;
import com.financeflow.service.CategoriaService;
import com.financeflow.service.ImportacaoExtratoService;
import com.financeflow.service.MetaFinanceiraService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/*
 * Carga inicial (seed) da demonstração. Só roda com o profile "demo", que o docker-compose ativa: produção (Render)
 * e testes nunca a executam. Cria um usuário de teste já confirmado, com as categorias pré-definidas, três meses de
 * histórico (agosto a outubro de 2026, importados pelo mesmo fluxo de importação de extrato do sistema) e uma meta.
 * Se o usuário já existe, não faz nada: subir o compose de novo não duplica os dados.
 */
@Component
@Profile("demo")
public class CargaDemonstracao implements ApplicationRunner {

    public static final String EMAIL = "testefinanceflow@gmail.com";
    public static final String SENHA = "Teste1234";

    private static final Logger log = LoggerFactory.getLogger(CargaDemonstracao.class);
    private static final List<String> EXTRATOS = List.of(
            "demo/extrato-nubank-2026-08.csv",
            "demo/extrato-nubank-2026-09.csv",
            "demo/extrato-nubank-2026-10.csv");

    private final UsuarioRepository repositorioUsuario;
    private final CategoriaRepository repositorioCategoria;
    private final CategoriaService categoriaService;
    private final ImportacaoExtratoService importacaoService;
    private final MetaFinanceiraService metaService;
    private final PasswordEncoder codificadorSenha;

    public CargaDemonstracao(UsuarioRepository repositorioUsuario, CategoriaRepository repositorioCategoria,
                             CategoriaService categoriaService, ImportacaoExtratoService importacaoService,
                             MetaFinanceiraService metaService, PasswordEncoder codificadorSenha) {
        this.repositorioUsuario = repositorioUsuario;
        this.repositorioCategoria = repositorioCategoria;
        this.categoriaService = categoriaService;
        this.importacaoService = importacaoService;
        this.metaService = metaService;
        this.codificadorSenha = codificadorSenha;
    }

    @Override
    public void run(ApplicationArguments argumentos) throws IOException {
        if (repositorioUsuario.existsByEmailIgnoreCase(EMAIL)) {
            log.info("Carga de demonstração: usuário {} já existe, nada a fazer", EMAIL);
            return;
        }

        Usuario usuario = new Usuario();
        usuario.setNome("Teste");
        usuario.setEmail(EMAIL);
        usuario.setSenhaHash(codificadorSenha.encode(SENHA));
        usuario.setCriadoEm(LocalDateTime.now());
        // Já confirmado: no Docker não há e-mail de verdade pra clicar no link
        usuario.setEmailVerificado(true);
        repositorioUsuario.save(usuario);
        categoriaService.semearPredefinidas(usuario);

        int total = 0;
        for (String caminho : EXTRATOS) {
            byte[] conteudo = new ClassPathResource(caminho).getContentAsByteArray();
            List<LinhaImportacaoResposta> previa = importacaoService.prever(
                    new ArquivoEmMemoria(caminho, conteudo), BancoExtrato.NUBANK, EMAIL);
            List<LinhaImportacaoConfirmacaoRequisicao> linhas = previa.stream()
                    .filter(linha -> !linha.duplicada() && linha.categoriaIdSugerida() != null)
                    .map(linha -> new LinhaImportacaoConfirmacaoRequisicao(linha.data(), linha.descricao(),
                            linha.valor(), linha.tipo(), linha.categoriaIdSugerida(), linha.identificador()))
                    .toList();
            total += importacaoService.confirmar(linhas, EMAIL).transacoesCriadas();
        }

        Long salario = repositorioCategoria.findByUsuarioId(usuario.getId()).stream()
                .filter(categoria -> categoria.getTipo() == TipoMovimentacao.RECEITA)
                .filter(categoria -> categoria.getNome().equals("Salário"))
                .map(Categoria::getId)
                .findFirst()
                .orElseThrow();
        metaService.cadastrar(new MetaFinanceiraRequisicao("Reserva de emergência", new BigDecimal("6000.00"),
                List.of(salario), LocalDate.of(2027, 6, 30)), EMAIL);

        log.info("Carga de demonstração: usuário {} criado com {} transações e 1 meta", EMAIL, total);
    }

    // O fluxo de importação recebe o arquivo do upload; aqui o "upload" é o CSV que vem dentro do jar
    private record ArquivoEmMemoria(String nome, byte[] conteudo) implements MultipartFile {
        @Override public String getName() { return "arquivo"; }
        @Override public String getOriginalFilename() { return nome; }
        @Override public String getContentType() { return "text/csv"; }
        @Override public boolean isEmpty() { return conteudo.length == 0; }
        @Override public long getSize() { return conteudo.length; }
        @Override public byte[] getBytes() { return conteudo; }
        @Override public InputStream getInputStream() { return new ByteArrayInputStream(conteudo); }
        @Override public void transferTo(java.io.File destino) throws IOException { Files.write(destino.toPath(), conteudo); }
        @Override public void transferTo(Path destino) throws IOException { Files.write(destino, conteudo); }
    }
}
