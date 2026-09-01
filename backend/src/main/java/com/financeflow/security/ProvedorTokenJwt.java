package com.financeflow.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class ProvedorTokenJwt {

    @Value("${jwt.chave-secreta}")
    private String chaveSecreta;

    @Value("${jwt.expiracao-ms}")
    private long expiracaoMs;

    public String gerarToken(String email) {
        Date agora = new Date();
        Date expiracao = new Date(agora.getTime() + expiracaoMs);
        return Jwts.builder()
                .subject(email)
                .issuedAt(agora)
                .expiration(expiracao)
                .signWith(chaveAssinatura())
                .compact();
    }

    public String extrairEmail(String token) {
        return parseClaims(token).getSubject();
    }

    public boolean tokenValido(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException excecao) {
            return false;
        }
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(chaveAssinatura())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey chaveAssinatura() {
        return Keys.hmacShaKeyFor(chaveSecreta.getBytes(StandardCharsets.UTF_8));
    }
}
