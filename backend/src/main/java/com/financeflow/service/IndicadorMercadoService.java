package com.financeflow.service;

import com.financeflow.dto.IndicadorMercadoResposta;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class IndicadorMercadoService {

    private static final Logger log = LoggerFactory.getLogger(IndicadorMercadoService.class);
    private static final Duration DURACAO_CACHE = Duration.ofMinutes(5);
    private static final String URL_SGS_SELIC = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json";
    private static final String URL_SGS_DOLAR = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados/ultimos/1?formato=json";
    private static final String URL_IBOVESPA = "https://brapi.dev/api/quote/%5EBVSP";

    private final RestClient restClient;
    private final String tokenBrapi;

    private volatile IndicadorMercadoResposta cache;
    private volatile LocalDateTime cacheEm;

    public IndicadorMercadoService(RestClient restClient, @Value("${brapi.token:}") String tokenBrapi) {
        this.restClient = restClient;
        this.tokenBrapi = tokenBrapi;
    }

    public synchronized IndicadorMercadoResposta obterIndicadores() {
        if (cache != null && cacheEm != null && Duration.between(cacheEm, LocalDateTime.now()).compareTo(DURACAO_CACHE) < 0) {
            return cache;
        }

        IndicadorMercadoResposta resposta = new IndicadorMercadoResposta(
                buscarSerieSgs(URL_SGS_SELIC, "Selic"),
                buscarSerieSgs(URL_SGS_DOLAR, "Dólar"),
                buscarIbovespa(),
                LocalDateTime.now()
        );

        cache = resposta;
        cacheEm = LocalDateTime.now();
        return resposta;
    }

    private BigDecimal buscarSerieSgs(String url, String nomeIndicador) {
        try {
            ItemSgs[] itens = restClient.get().uri(url).retrieve().body(ItemSgs[].class);
            if (itens == null || itens.length == 0) {
                return null;
            }
            return new BigDecimal(itens[0].valor().replace(",", "."));
        } catch (Exception excecao) {
            log.warn("falha ao consultar indicador {} no BCB: {}", nomeIndicador, excecao.getMessage());
            return null;
        }
    }

    private BigDecimal buscarIbovespa() {
        if (tokenBrapi == null || tokenBrapi.isBlank()) {
            log.info("brapi.token não configurado — Ibovespa não será exibido");
            return null;
        }
        try {
            String url = URL_IBOVESPA + "?token=" + tokenBrapi;
            RespostaBrapi resposta = restClient.get().uri(url).retrieve().body(RespostaBrapi.class);
            if (resposta == null || resposta.results() == null || resposta.results().isEmpty()) {
                return null;
            }
            return resposta.results().get(0).regularMarketPrice();
        } catch (Exception excecao) {
            log.warn("falha ao consultar Ibovespa na brapi.dev: {}", excecao.getMessage());
            return null;
        }
    }

    private record ItemSgs(String data, String valor) {
    }

    private record RespostaBrapi(List<ResultadoBrapi> results) {
    }

    private record ResultadoBrapi(BigDecimal regularMarketPrice) {
    }
}
