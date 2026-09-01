package com.financeflow.config;

import com.financeflow.security.FiltroAutenticacaoJwt;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class ConfiguracaoSeguranca {

    private final FiltroAutenticacaoJwt filtroAutenticacaoJwt;

    public ConfiguracaoSeguranca(FiltroAutenticacaoJwt filtroAutenticacaoJwt) {
        this.filtroAutenticacaoJwt = filtroAutenticacaoJwt;
    }

    @Bean
    public SecurityFilterChain cadeiaFiltros(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sessao -> sessao.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(requisicoes -> requisicoes
                        .requestMatchers(HttpMethod.POST, "/usuarios", "/login").permitAll()
                        .anyRequest().authenticated())
                .addFilterBefore(filtroAutenticacaoJwt, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder codificadorSenha() {
        return new BCryptPasswordEncoder();
    }
}
