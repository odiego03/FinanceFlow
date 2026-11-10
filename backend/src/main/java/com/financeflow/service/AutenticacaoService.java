package com.financeflow.service;

import com.financeflow.dto.LoginRequisicao;
import com.financeflow.dto.LoginResposta;
import com.financeflow.exception.CredenciaisInvalidasException;
import com.financeflow.model.Usuario;
import com.financeflow.repository.UsuarioRepository;
import com.financeflow.security.LimitadorTentativasLogin;
import com.financeflow.security.ProvedorTokenJwt;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AutenticacaoService {

    private final UsuarioRepository repositorioUsuario;
    private final PasswordEncoder codificadorSenha;
    private final ProvedorTokenJwt provedorTokenJwt;
    private final LimitadorTentativasLogin limitadorTentativas;

    public AutenticacaoService(UsuarioRepository repositorioUsuario, PasswordEncoder codificadorSenha,
                                ProvedorTokenJwt provedorTokenJwt, LimitadorTentativasLogin limitadorTentativas) {
        this.repositorioUsuario = repositorioUsuario;
        this.codificadorSenha = codificadorSenha;
        this.provedorTokenJwt = provedorTokenJwt;
        this.limitadorTentativas = limitadorTentativas;
    }

    public LoginResposta autenticar(LoginRequisicao requisicao) {
        String email = UsuarioService.normalizarEmail(requisicao.email());
        limitadorTentativas.verificar(email);

        // Normalmente vem um só; mais de um só em contas antigas que diferem na caixa, e aí vale a da senha certa
        Usuario usuario = repositorioUsuario.findAllByEmailIgnoreCase(email).stream()
                .filter(candidato -> codificadorSenha.matches(requisicao.senha(), candidato.getSenhaHash()))
                .findFirst()
                .orElse(null);
        if (usuario == null) {
            limitadorTentativas.registrarFalha(email);
            throw new CredenciaisInvalidasException();
        }

        limitadorTentativas.registrarSucesso(email);
        return new LoginResposta(provedorTokenJwt.gerarToken(usuario.getEmail()));
    }
}
