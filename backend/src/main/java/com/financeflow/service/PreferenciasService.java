package com.financeflow.service;

import com.financeflow.dto.PreferenciasRequisicao;
import com.financeflow.dto.PreferenciasResposta;
import com.financeflow.exception.PreferenciasInvalidasException;
import com.financeflow.model.PreferenciasUsuario;
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

    private final PreferenciasUsuarioRepository repositorioPreferencias;
    private final UsuarioRepository repositorioUsuario;

    public PreferenciasService(PreferenciasUsuarioRepository repositorioPreferencias, UsuarioRepository repositorioUsuario) {
        this.repositorioPreferencias = repositorioPreferencias;
        this.repositorioUsuario = repositorioUsuario;
    }

    public PreferenciasResposta buscar(String emailUsuario) {
        return buscarPorUsuarioId(buscarUsuarioPorEmail(emailUsuario).getId());
    }

    // Sem registro salvo, devolve os padrões (que são os limites da regra 50/30/20)
    public PreferenciasResposta buscarPorUsuarioId(Long usuarioId) {
        return repositorioPreferencias.findByUsuarioId(usuarioId)
                .map(p -> new PreferenciasResposta(p.isOcultarValores(), p.getLimiteEssencial(), p.getLimiteTotal(),
                        p.getSimuladorPercentualCdi(), p.getSimuladorPrazoMeses()))
                .orElse(new PreferenciasResposta(PADRAO_OCULTAR_VALORES, PADRAO_LIMITE_ESSENCIAL, PADRAO_LIMITE_TOTAL,
                        PADRAO_PERCENTUAL_CDI, PADRAO_PRAZO_MESES));
    }

    public PreferenciasResposta atualizar(PreferenciasRequisicao requisicao, String emailUsuario) {
        // Atenção dispara antes do risco: essenciais são só uma parte do total
        if (requisicao.limiteEssencial().compareTo(requisicao.limiteTotal()) >= 0) {
            throw new PreferenciasInvalidasException(
                    "o limite das despesas essenciais precisa ser menor que o limite do total de despesas");
        }

        Usuario usuario = buscarUsuarioPorEmail(emailUsuario);
        PreferenciasUsuario preferencias = repositorioPreferencias.findByUsuarioId(usuario.getId())
                .orElseGet(() -> {
                    PreferenciasUsuario novas = new PreferenciasUsuario();
                    novas.setUsuario(usuario);
                    return novas;
                });
        preferencias.setOcultarValores(requisicao.ocultarValores());
        preferencias.setLimiteEssencial(requisicao.limiteEssencial());
        preferencias.setLimiteTotal(requisicao.limiteTotal());
        preferencias.setSimuladorPercentualCdi(requisicao.simuladorPercentualCdi());
        preferencias.setSimuladorPrazoMeses(requisicao.simuladorPrazoMeses());
        repositorioPreferencias.save(preferencias);

        return buscarPorUsuarioId(usuario.getId());
    }

    private Usuario buscarUsuarioPorEmail(String email) {
        return repositorioUsuario.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("usuário do token não existe mais: " + email));
    }
}
