package com.financeflow.service;

import com.financeflow.dto.CategoriaPredefinidaResposta;
import com.financeflow.dto.CategoriaRequisicao;
import com.financeflow.dto.CategoriaResposta;
import com.financeflow.exception.CategoriaNaoEncontradaException;
import com.financeflow.model.Categoria;
import com.financeflow.model.Usuario;
import com.financeflow.repository.CategoriaRepository;
import com.financeflow.repository.UsuarioRepository;
import com.financeflow.service.CategoriasPredefinidas.CategoriaPredefinidaModelo;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

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
        categoria.setIcone(requisicao.icone());
        categoria.setCor(requisicao.cor());
        categoria.setUsuario(buscarUsuarioPorEmail(emailUsuario));

        repositorioCategoria.save(categoria);

        return CategoriaResposta.de(categoria);
    }

    public void semearPredefinidas(Usuario usuario) {
        List<Categoria> categorias = CategoriasPredefinidas.CATALOGO.stream()
                .map(modelo -> criarCategoriaDoModelo(modelo, usuario))
                .toList();
        repositorioCategoria.saveAll(categorias);
    }

    public List<CategoriaPredefinidaResposta> listarPredefinidas() {
        return CategoriasPredefinidas.CATALOGO.stream()
                .map(CategoriaPredefinidaResposta::de)
                .toList();
    }

    public List<CategoriaResposta> adicionarPredefinidasFaltantes(String emailUsuario) {
        Usuario usuario = buscarUsuarioPorEmail(emailUsuario);
        Set<String> existentes = repositorioCategoria.findByUsuarioId(usuario.getId()).stream()
                .map(categoria -> categoria.getNome() + "|" + categoria.getTipo())
                .collect(Collectors.toSet());

        List<Categoria> faltantes = CategoriasPredefinidas.CATALOGO.stream()
                .filter(modelo -> !existentes.contains(modelo.nome() + "|" + modelo.tipo()))
                .map(modelo -> criarCategoriaDoModelo(modelo, usuario))
                .toList();

        repositorioCategoria.saveAll(faltantes);

        return faltantes.stream().map(CategoriaResposta::de).toList();
    }

    private Categoria criarCategoriaDoModelo(CategoriaPredefinidaModelo modelo, Usuario usuario) {
        Categoria categoria = new Categoria();
        categoria.setNome(modelo.nome());
        categoria.setTipo(modelo.tipo());
        categoria.setIcone(modelo.icone());
        categoria.setCor(modelo.cor());
        categoria.setUsuario(usuario);
        return categoria;
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
        categoria.setIcone(requisicao.icone());
        categoria.setCor(requisicao.cor());

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
