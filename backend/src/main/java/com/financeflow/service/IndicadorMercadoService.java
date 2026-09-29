package com.financeflow.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.financeflow.dto.IndicadorMercadoResposta;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;

@Service
public class IndicadorMercadoService {

    private static final Logger log = LoggerFactory.getLogger(IndicadorMercadoService.class);
    private static final Duration DURACAO_CACHE = Duration.ofMinutes(5);
    private static final String URL_SGS_SELIC = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json";
    private static final String URL_SGS_DOLAR = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados/ultimos/1?formato=json";
    private static final String HOST_YAHOO = "query1.finance.yahoo.com";
    private static final String SIMBOLO_IBOVESPA = "^BVSP";

    private final RestClient restClient;

    private volatile IndicadorMercadoResposta cache;
    private volatile LocalDateTime cacheEm;

    public IndicadorMercadoService(RestClient restClient) {
        this.restClient = restClient;
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
        try {
            JsonNode resposta = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .scheme("https")
                            .host(HOST_YAHOO)
                            .path("/v8/finance/chart/{simbolo}")
                            .queryParam("range", "1d")
                            .queryParam("interval", "1d")
                            .build(SIMBOLO_IBOVESPA))
                    .header(HttpHeaders.USER_AGENT, "Mozilla/5.0")
                    .retrieve()
                    .body(JsonNode.class);

            JsonNode preco = resposta.path("chart").path("result").path(0).path("meta").path("regularMarketPrice");
            return preco.isMissingNode() ? null : preco.decimalValue();
        } catch (Exception excecao) {
            log.warn("falha ao consultar Ibovespa no Yahoo Finance: {}", excecao.getMessage());
            return null;
        }
    }

    private record ItemSgs(String data, String valor) {
    }
}
