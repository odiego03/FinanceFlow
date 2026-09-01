package com.financeflow.dto;

import com.financeflow.model.Usuario;

import java.time.LocalDateTime;

public record UsuarioResposta(Long id, String nome, String email, LocalDateTime criadoEm) {

    public static UsuarioResposta de(Usuario usuario) {
        return new UsuarioResposta(usuario.getId(), usuario.getNome(), usuario.getEmail(), usuario.getCriadoEm());
    }
}
