package com.financeflow.service;

import com.financeflow.dto.PreferenciasRequisicao;
import com.financeflow.dto.PreferenciasResposta;
import com.financeflow.exception.PreferenciasInvalidasException;
import com.financeflow.model.PreferenciasUsuario;
import com.financeflow.model.Tema;
import com.financeflow.model.Usuario;
import com.financeflow.repository.PreferenciasUsuarioRepository;
import com.financeflow.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class PreferenciasService {

    static final boolean PADRAO_OCULTAR_VALORES = false;
    static final BigDecimal PADRAO_LIMITE_ESSENCIAL = CalculadoraComprometimento.LIMITE_ESSENCIAL;
    static final BigDecimal PADRAO_LIMITE_TOTAL = CalculadoraComprometimento.LIMITE_TOTAL;
    static final BigDecimal PADRAO_PERCENTUAL_CDI = SimulacaoService.PERCENTUAL_CDI_PADRAO;
    static final int PADRAO_PRAZO_MESES = 12;
    // Claro por padrão: quem já usava o app não vê a interface mudar sozinha
    static final Tema PADRAO_TEMA = Tema.CLARO;

    private final PreferenciasUsuarioRepository repositorioPreferencias;
    private final UsuarioRepository repositorioUsuario;

    public PreferenciasService(PreferenciasUsuarioRepository repositorioPreferencias, UsuarioRepository repositorioUsuario) {
        this.repositorioPreferencias = repositorioPreferencias;
        this.repositorioUsuario = repositorioUsuario;
    }

    public PreferenciasResposta buscar(String emailUsuario) {
        return buscarPorUsuarioId(repositorioUsuario.buscarDoToken(emailUsuario).getId());
    }

    // Sem registro salvo, devolve os padrões (que são os limites da regra 50/30/20). tutorialConcluido null ou
    // sem registro = false: o tutorial aparece uma vez pra todo mundo, inclusive quem já usava o app antes dele existir
    public PreferenciasResposta buscarPorUsuarioId(Long usuarioId) {
        return repositorioPreferencias.findByUsuarioId(usuarioId)
                .map(p -> new PreferenciasResposta(p.isOcultarValores(), p.getLimiteEssencial(), p.getLimiteTotal(),
                        p.getSimuladorPercentualCdi(), p.getSimuladorPrazoMeses(),
                        p.getTema() != null ? p.getTema() : PADRAO_TEMA, Boolean.TRUE.equals(p.getTutorialConcluido())))
                .orElse(new PreferenciasResposta(PADRAO_OCULTAR_VALORES, PADRAO_LIMITE_ESSENCIAL, PADRAO_LIMITE_TOTAL,
                        PADRAO_PERCENTUAL_CDI, PADRAO_PRAZO_MESES, PADRAO_TEMA, false));
    }

    // Não mexe no tutorialConcluido: ele tem endpoint próprio, pra salvar as preferências não reabrir o tutorial
    public PreferenciasResposta atualizar(PreferenciasRequisicao requisicao, String emailUsuario) {
        // Atenção dispara antes do risco: essenciais são só uma parte do total
        if (requisicao.limiteEssencial().compareTo(requisicao.limiteTotal()) >= 0) {
            throw new PreferenciasInvalidasException(
                    "o limite das despesas essenciais precisa ser menor que o limite do total de despesas");
        }

        Usuario usuario = repositorioUsuario.buscarDoToken(emailUsuario);
        PreferenciasUsuario preferencias = buscarOuCriar(usuario);
        preferencias.setOcultarValores(requisicao.ocultarValores());
        preferencias.setLimiteEssencial(requisicao.limiteEssencial());
        preferencias.setLimiteTotal(requisicao.limiteTotal());
        preferencias.setSimuladorPercentualCdi(requisicao.simuladorPercentualCdi());
        preferencias.setSimuladorPrazoMeses(requisicao.simuladorPrazoMeses());
        preferencias.setTema(requisicao.tema());
        repositorioPreferencias.save(preferencias);

        return buscarPorUsuarioId(usuario.getId());
    }

    public PreferenciasResposta marcarTutorial(boolean concluido, String emailUsuario) {
        Usuario usuario = repositorioUsuario.buscarDoToken(emailUsuario);
        PreferenciasUsuario preferencias = buscarOuCriar(usuario);
        preferencias.setTutorialConcluido(concluido);
        repositorioPreferencias.save(preferencias);

        return buscarPorUsuarioId(usuario.getId());
    }

    // O registro só nasce no primeiro salvamento; até lá, começa com os padrões
    private PreferenciasUsuario buscarOuCriar(Usuario usuario) {
        return repositorioPreferencias.findByUsuarioId(usuario.getId())
                .orElseGet(() -> {
                    PreferenciasUsuario novas = new PreferenciasUsuario();
                    novas.setUsuario(usuario);
                    novas.setOcultarValores(PADRAO_OCULTAR_VALORES);
                    novas.setLimiteEssencial(PADRAO_LIMITE_ESSENCIAL);
                    novas.setLimiteTotal(PADRAO_LIMITE_TOTAL);
                    novas.setSimuladorPercentualCdi(PADRAO_PERCENTUAL_CDI);
                    novas.setSimuladorPrazoMeses(PADRAO_PRAZO_MESES);
                    novas.setTema(PADRAO_TEMA);
                    return novas;
                });
    }
}
