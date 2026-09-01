package com.financeflow.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class FiltroAutenticacaoJwt extends OncePerRequestFilter {

    private static final String PREFIXO_BEARER = "Bearer ";

    private final ProvedorTokenJwt provedorTokenJwt;

    public FiltroAutenticacaoJwt(ProvedorTokenJwt provedorTokenJwt) {
        this.provedorTokenJwt = provedorTokenJwt;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String cabecalhoAutorizacao = request.getHeader("Authorization");

        if (cabecalhoAutorizacao != null && cabecalhoAutorizacao.startsWith(PREFIXO_BEARER)) {
            String token = cabecalhoAutorizacao.substring(PREFIXO_BEARER.length());

            if (provedorTokenJwt.tokenValido(token)) {
                String email = provedorTokenJwt.extrairEmail(token);
                var autenticacao = new UsernamePasswordAuthenticationToken(email, null, List.of());
                SecurityContextHolder.getContext().setAuthentication(autenticacao);
            }
        }

        filterChain.doFilter(request, response);
    }
}
