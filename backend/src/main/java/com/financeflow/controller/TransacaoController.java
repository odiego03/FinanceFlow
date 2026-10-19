package com.financeflow.controller;

import com.financeflow.dto.BancoExtrato;
import com.financeflow.dto.DespesaPorCategoriaResposta;
import com.financeflow.dto.EvolucaoMensalResposta;
import com.financeflow.dto.ImportacaoConfirmacaoRequisicao;
import com.financeflow.dto.ImportacaoResultadoResposta;
import com.financeflow.dto.LinhaImportacaoResposta;
import com.financeflow.dto.TransacaoRequisicao;
import com.financeflow.dto.TransacaoResposta;
import com.financeflow.service.ImportacaoExtratoService;
import com.financeflow.service.TransacaoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/transacoes")
public class TransacaoController {

    private final TransacaoService transacaoService;
    private final ImportacaoExtratoService importacaoExtratoService;

    public TransacaoController(TransacaoService transacaoService, ImportacaoExtratoService importacaoExtratoService) {
        this.transacaoService = transacaoService;
        this.importacaoExtratoService = importacaoExtratoService;
    }

    @PostMapping
    public ResponseEntity<TransacaoResposta> cadastrar(@Valid @RequestBody TransacaoRequisicao requisicao,
                                                         Authentication autenticacao) {
        TransacaoResposta resposta = transacaoService.cadastrar(requisicao, autenticacao.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(resposta);
    }

    @GetMapping
    public List<TransacaoResposta> listar(Authentication autenticacao) {
        return transacaoService.listar(autenticacao.getName());
    }

    @GetMapping("/evolucao-mensal")
    public List<EvolucaoMensalResposta> evolucaoMensal(Authentication autenticacao) {
        return transacaoService.evolucaoMensal(autenticacao.getName());
    }

    @GetMapping("/despesas-por-categoria")
    public List<DespesaPorCategoriaResposta> despesasPorCategoria(Authentication autenticacao) {
        return transacaoService.despesasPorCategoria(autenticacao.getName());
    }

    @GetMapping("/{id}")
    public TransacaoResposta buscarPorId(@PathVariable Long id, Authentication autenticacao) {
        return transacaoService.buscarPorId(id, autenticacao.getName());
    }

    @PutMapping("/{id}")
    public TransacaoResposta atualizar(@PathVariable Long id, @Valid @RequestBody TransacaoRequisicao requisicao,
                                        Authentication autenticacao) {
        return transacaoService.atualizar(id, requisicao, autenticacao.getName());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id, Authentication autenticacao) {
        transacaoService.deletar(id, autenticacao.getName());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/importar/preview")
    public List<LinhaImportacaoResposta> prever(@RequestPart("arquivo") MultipartFile arquivo,
                                                 @RequestParam("banco") BancoExtrato banco,
                                                 Authentication autenticacao) {
        return importacaoExtratoService.prever(arquivo, banco, autenticacao.getName());
    }

    @PostMapping("/importar/confirmar")
    public ImportacaoResultadoResposta confirmar(@Valid @RequestBody ImportacaoConfirmacaoRequisicao requisicao,
                                                  Authentication autenticacao) {
        return importacaoExtratoService.confirmar(requisicao.linhas(), autenticacao.getName());
    }
}
