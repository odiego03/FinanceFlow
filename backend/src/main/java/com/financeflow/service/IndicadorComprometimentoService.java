package com.financeflow.service;

import com.financeflow.dto.IndicadorComprometimentoResposta;
import com.financeflow.dto.PreferenciasResposta;
import com.financeflow.model.TipoMovimentacao;
import com.financeflow.model.Transacao;
import com.financeflow.model.Usuario;
import com.financeflow.repository.TransacaoRepository;
import com.financeflow.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

@Service
public class IndicadorComprometimentoService {

    private final TransacaoRepository repositorioTransacao;
    private final UsuarioRepository repositorioUsuario;
    private final PreferenciasService preferenciasService;

    public IndicadorComprometimentoService(TransacaoRepository repositorioTransacao, UsuarioRepository repositorioUsuario,
                                           PreferenciasService preferenciasService) {
        this.repositorioTransacao = repositorioTransacao;
        this.repositorioUsuario = repositorioUsuario;
        this.preferenciasService = preferenciasService;
    }

    public IndicadorComprometimentoResposta calcular(String emailUsuario, YearMonth mes) {
        Usuario usuario = repositorioUsuario.findByEmail(emailUsuario)
                .orElseThrow(() -> new IllegalStateException("usuário do token não existe mais: " + emailUsuario));

        List<Transacao> doMes = repositorioTransacao.findByUsuarioId(usuario.getId()).stream()
                .filter(transacao -> YearMonth.from(transacao.getData()).equals(mes))
                .toList();

        BigDecimal renda = BigDecimal.ZERO;
        BigDecimal essenciais = BigDecimal.ZERO;
        BigDecimal naoEssenciais = BigDecimal.ZERO;
        for (Transacao transacao : doMes) {
            if (transacao.getTipo() == TipoMovimentacao.RECEITA) {
                renda = renda.add(transacao.getValor());
            } else if (CategoriasPredefinidas.ehEssencial(transacao.getCategoria())) {
                essenciais = essenciais.add(transacao.getValor());
            } else {
                naoEssenciais = naoEssenciais.add(transacao.getValor());
            }
        }

        PreferenciasResposta preferencias = preferenciasService.buscarPorUsuarioId(usuario.getId());
        return CalculadoraComprometimento.calcular(mes, renda, essenciais, naoEssenciais,
                preferencias.limiteEssencial(), preferencias.limiteTotal());
    }
}
