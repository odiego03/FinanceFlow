package com.financeflow.service;

import com.financeflow.dto.LoginRequisicao;
import com.financeflow.dto.LoginResposta;
import com.financeflow.exception.CredenciaisInvalidasException;
import com.financeflow.model.Usuario;
import com.financeflow.repository.UsuarioRepository;
import com.financeflow.security.ProvedorTokenJwt;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AutenticacaoService {

    private final UsuarioRepository repositorioUsuario;
    private final PasswordEncoder codificadorSenha;
    private final ProvedorTokenJwt provedorTokenJwt;

    public AutenticacaoService(UsuarioRepository repositorioUsuario, PasswordEncoder codificadorSenha,
                                ProvedorTokenJwt provedorTokenJwt) {
        this.repositorioUsuario = repositorioUsuario;
        this.codificadorSenha = codificadorSenha;
        this.provedorTokenJwt = provedorTokenJwt;
    }

    public LoginResposta autenticar(LoginRequisicao requisicao) {
        Usuario usuario = repositorioUsuario.findByEmail(requisicao.email())
                .orElseThrow(CredenciaisInvalidasException::new);

        if (!codificadorSenha.matches(requisicao.senha(), usuario.getSenhaHash())) {
            throw new CredenciaisInvalidasException();
        }

        String token = provedorTokenJwt.gerarToken(usuario.getEmail());
        return new LoginResposta(token);
    }
}
