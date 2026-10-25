package com.financeflow.service;

import com.financeflow.dto.TrocaSenhaRequisicao;
import com.financeflow.dto.UsuarioAtualizacaoRequisicao;
import com.financeflow.dto.UsuarioCadastroRequisicao;
import com.financeflow.dto.UsuarioResposta;
import com.financeflow.exception.EmailJaCadastradoException;
import com.financeflow.exception.SenhaAtualIncorretaException;
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
        return UsuarioResposta.de(buscarEntidadePorEmail(email));
    }

    public UsuarioResposta atualizar(UsuarioAtualizacaoRequisicao requisicao, String email) {
        Usuario usuario = buscarEntidadePorEmail(email);
        usuario.setNome(requisicao.nome().trim());
        repositorioUsuario.save(usuario);
        return UsuarioResposta.de(usuario);
    }

    public void trocarSenha(TrocaSenhaRequisicao requisicao, String email) {
        Usuario usuario = buscarEntidadePorEmail(email);
        if (!codificadorSenha.matches(requisicao.senhaAtual(), usuario.getSenhaHash())) {
            throw new SenhaAtualIncorretaException();
        }
        usuario.setSenhaHash(codificadorSenha.encode(requisicao.novaSenha()));
        repositorioUsuario.save(usuario);
    }

    private Usuario buscarEntidadePorEmail(String email) {
        return repositorioUsuario.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("usuário do token não existe mais: " + email));
    }
}
