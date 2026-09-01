package com.financeflow.service;

import com.financeflow.dto.CategoriaRequisicao;
import com.financeflow.dto.CategoriaResposta;
import com.financeflow.exception.CategoriaNaoEncontradaException;
import com.financeflow.model.Categoria;
import com.financeflow.model.Usuario;
import com.financeflow.repository.CategoriaRepository;
import com.financeflow.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CategoriaService {

    private final CategoriaRepository repositorioCategoria;
    private final UsuarioRepository repositorioUsuario;

    public CategoriaService(CategoriaRepository repositorioCategoria, UsuarioRepository repositorioUsuario) {
        this.repositorioCategoria = repositorioCategoria;
        this.repositorioUsuario = repositorioUsuario;
    }

    public CategoriaResposta cadastrar(CategoriaRequisicao requisicao, String emailUsuario) {
        Categoria categoria = new Categoria();
        categoria.setNome(requisicao.nome());
        categoria.setTipo(requisicao.tipo());
        categoria.setUsuario(buscarUsuarioPorEmail(emailUsuario));

        repositorioCategoria.save(categoria);

        return CategoriaResposta.de(categoria);
    }

    public List<CategoriaResposta> listar(String emailUsuario) {
        Long usuarioId = buscarUsuarioPorEmail(emailUsuario).getId();
        return repositorioCategoria.findByUsuarioId(usuarioId).stream()
                .map(CategoriaResposta::de)
                .toList();
    }

    public CategoriaResposta buscarPorId(Long id, String emailUsuario) {
        return CategoriaResposta.de(buscarEntidadePorId(id, emailUsuario));
    }

    public CategoriaResposta atualizar(Long id, CategoriaRequisicao requisicao, String emailUsuario) {
        Categoria categoria = buscarEntidadePorId(id, emailUsuario);
        categoria.setNome(requisicao.nome());
        categoria.setTipo(requisicao.tipo());

        repositorioCategoria.save(categoria);

        return CategoriaResposta.de(categoria);
    }

    public void deletar(Long id, String emailUsuario) {
        Categoria categoria = buscarEntidadePorId(id, emailUsuario);
        repositorioCategoria.delete(categoria);
    }

    private Categoria buscarEntidadePorId(Long id, String emailUsuario) {
        Long usuarioId = buscarUsuarioPorEmail(emailUsuario).getId();
        return repositorioCategoria.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new CategoriaNaoEncontradaException(id));
    }

    private Usuario buscarUsuarioPorEmail(String email) {
        return repositorioUsuario.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("usuário do token não existe mais: " + email));
    }
}
