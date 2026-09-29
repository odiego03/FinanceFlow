package com.financeflow.service;

import com.financeflow.dto.UsuarioCadastroRequisicao;
import com.financeflow.dto.UsuarioResposta;
import com.financeflow.exception.EmailJaCadastradoException;
import com.financeflow.model.Usuario;
import com.financeflow.repository.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class UsuarioService {

    private final UsuarioRepository repositorioUsuario;
    private final PasswordEncoder codificadorSenha;
    private final CategoriaService categoriaService;

    public UsuarioService(UsuarioRepository repositorioUsuario, PasswordEncoder codificadorSenha,
                           CategoriaService categoriaService) {
        this.repositorioUsuario = repositorioUsuario;
        this.codificadorSenha = codificadorSenha;
        this.categoriaService = categoriaService;
    }

    public UsuarioResposta cadastrar(UsuarioCadastroRequisicao requisicao) {
        if (repositorioUsuario.existsByEmail(requisicao.email())) {
            throw new EmailJaCadastradoException(requisicao.email());
        }

        Usuario usuario = new Usuario();
        usuario.setNome(requisicao.nome());
        usuario.setEmail(requisicao.email());
        usuario.setSenhaHash(codificadorSenha.encode(requisicao.senha()));
        usuario.setCriadoEm(LocalDateTime.now());

        repositorioUsuario.save(usuario);
        categoriaService.semearPredefinidas(usuario);

        return UsuarioResposta.de(usuario);
    }

    public UsuarioResposta buscarPorEmail(String email) {
        Usuario usuario = repositorioUsuario.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("usuário do token não existe mais: " + email));
        return UsuarioResposta.de(usuario);
    }
}
