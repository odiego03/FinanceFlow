package com.financeflow.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.financeflow.dto.IndicadorMercadoResposta;
import com.financeflow.dto.TaxasInvestimentoResposta;
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
    private static final Duration DURACAO_CACHE_TAXAS = Duration.ofHours(1);
    // CDI anualizado (base 252) e rentabilidade mensal da poupança nova (depósitos a partir de 04/05/2012)
    private static final String URL_SGS_CDI = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json";
    private static final String URL_SGS_POUPANCA = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.195/dados/ultimos/1?formato=json";
    // IPCA acumulado em 12 meses (% a.a.), usado pra mostrar os resultados em dinheiro de hoje
    private static final String URL_SGS_IPCA_12_MESES = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json";
    private static final String HOST_YAHOO = "query1.finance.yahoo.com";
    private static final String SIMBOLO_IBOVESPA = "^BVSP";

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    private volatile IndicadorMercadoResposta cache;
    private volatile LocalDateTime cacheEm;
    private volatile TaxasInvestimentoResposta cacheTaxas;

    public IndicadorMercadoService(RestClient restClient, ObjectMapper objectMapper) {
        this.restClient = restClient;
        this.objectMapper = objectMapper;
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

    /**
     * Taxas da Simulação de investimento (RN005). Cache de 1 hora (mudam no máximo uma vez por dia); se a consulta
     * falhar, mantém o último valor obtido daquela taxa, pra uma instabilidade do BCB não derrubar a simulação.
     */
    public synchronized TaxasInvestimentoResposta obterTaxasInvestimento() {
        // Com alguma taxa faltando, tenta de novo na próxima chamada em vez de esperar 1 hora
        boolean cacheCompleto = cacheTaxas != null && cacheTaxas.selic() != null && cacheTaxas.cdi() != null
                && cacheTaxas.poupancaMensal() != null && cacheTaxas.ipca12Meses() != null;
        if (cacheCompleto && Duration.between(cacheTaxas.atualizadoEm(), LocalDateTime.now()).compareTo(DURACAO_CACHE_TAXAS) < 0) {
            return cacheTaxas;
        }

        BigDecimal selic = buscarSerieSgs(URL_SGS_SELIC, "Selic");
        BigDecimal cdi = buscarSerieSgs(URL_SGS_CDI, "CDI");
        BigDecimal poupanca = buscarSerieSgs(URL_SGS_POUPANCA, "Poupança");
        BigDecimal ipca = buscarSerieSgs(URL_SGS_IPCA_12_MESES, "IPCA");

        TaxasInvestimentoResposta anterior = cacheTaxas;
        cacheTaxas = new TaxasInvestimentoResposta(
                selic != null || anterior == null ? selic : anterior.selic(),
                cdi != null || anterior == null ? cdi : anterior.cdi(),
                poupanca != null || anterior == null ? poupanca : anterior.poupancaMensal(),
                ipca != null || anterior == null ? ipca : anterior.ipca12Meses(),
                LocalDateTime.now()
        );
        return cacheTaxas;
    }

    private BigDecimal buscarSerieSgs(String url, String nomeIndicador) {
        try {
            // Lido como texto: o BCB às vezes manda o JSON com Content-Type text/html, e aí o conversor do Spring recusa
            String corpo = restClient.get().uri(url).retrieve().body(String.class);
            ItemSgs[] itens = corpo == null ? null : objectMapper.readValue(corpo, ItemSgs[].class);
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

    // A série da poupança traz também "dataFim", que não interessa
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record ItemSgs(String data, String valor) {
    }
}
