package com.financeflow.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

@Configuration
public class ConfiguracaoHttp {

    // Sem timeout, um BCB/Yahoo travado prende a thread pra sempre — e o IndicadorMercadoService é synchronized,
    // então todo mundo que pedisse indicadores, simulação ou sugestões ficaria esperando na fila
    private static final Duration TIMEOUT_CONEXAO = Duration.ofSeconds(3);
    private static final Duration TIMEOUT_LEITURA = Duration.ofSeconds(5);

    @Bean
    public RestClient restClient() {
        SimpleClientHttpRequestFactory fabrica = new SimpleClientHttpRequestFactory();
        fabrica.setConnectTimeout(TIMEOUT_CONEXAO);
        fabrica.setReadTimeout(TIMEOUT_LEITURA);
        return RestClient.builder().requestFactory(fabrica).build();
    }
}
