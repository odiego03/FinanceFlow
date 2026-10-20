package com.financeflow.service.extrato;

import com.financeflow.model.TipoMovimentacao;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Deriva a chave de uma descrição de extrato e sugere categoria por
 * palavra-chave. A chave é "operação + favorecido" sem os trechos de
 * documento/banco/conta (ex: "TRANSFERENCIA ENVIADA PELO PIX - JOAO DA
 * SILVA"), pra que lançamentos pro mesmo favorecido caiam na mesma regra
 * aprendida mesmo quando agência/conta mudam. A operação fica na chave de
 * propósito: separa "enviada" de "recebida" pro mesmo favorecido.
 */
@Component
public class SugestorCategoria {

    private static final String SEPARADOR_SEGMENTO = " - ";
    private static final int TAMANHO_MAXIMO_CHAVE = 255;

    // Segmento que marca o início dos dados de documento/banco: CPF mascarado, CNPJ, "Agência:" ou código do banco "(0260)"
    private static final Pattern SEGMENTO_DE_DOCUMENTO = Pattern.compile(
            ".*(•|\\d{2}\\.\\d{3}\\.\\d{3}/|\\d{3}\\.\\d{3}-|AGENCIA:|\\(\\d{3,4}\\)).*");

    // Data no fim da descrição (ex: Itaú "PIX TRANSF FULANO 12/09") deixaria cada lançamento com uma chave diferente
    private static final Pattern DATA_NO_FIM = Pattern.compile("\\s+\\d{2}/\\d{2}(/\\d{2,4})?$");

    private record PalavraChave(String termo, TipoMovimentacao tipo, String nomeCategoria) {
    }

    // Termos mais específicos antes dos genéricos (ex: "MERCADO LIVRE" antes de "MERCADO")
    private static final List<PalavraChave> DICIONARIO = criarDicionario();

    public String chaveDe(String descricao) {
        String normalizada = normalizar(descricao);
        String[] segmentos = normalizada.split(Pattern.quote(SEPARADOR_SEGMENTO));
        List<String> mantidos = new ArrayList<>();
        for (String segmento : segmentos) {
            if (!mantidos.isEmpty() && SEGMENTO_DE_DOCUMENTO.matcher(segmento).matches()) {
                break;
            }
            mantidos.add(segmento.trim());
        }
        String chave = DATA_NO_FIM.matcher(String.join(SEPARADOR_SEGMENTO, mantidos)).replaceAll("").trim();
        return chave.length() > TAMANHO_MAXIMO_CHAVE ? chave.substring(0, TAMANHO_MAXIMO_CHAVE) : chave;
    }

    public Optional<String> sugerirNomeCategoria(String chave, TipoMovimentacao tipo) {
        String palavras = " " + chave.replaceAll("[^A-Z0-9]+", " ").trim() + " ";
        return DICIONARIO.stream()
                .filter(palavraChave -> palavraChave.tipo() == tipo)
                .filter(palavraChave -> palavras.contains(" " + palavraChave.termo() + " "))
                .map(PalavraChave::nomeCategoria)
                .findFirst();
    }

    public static String normalizar(String texto) {
        String semAcento = Normalizer.normalize(texto, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return semAcento.trim().toUpperCase(Locale.ROOT).replaceAll("\\s+", " ");
    }

    private static List<PalavraChave> criarDicionario() {
        List<PalavraChave> dicionario = new ArrayList<>();
        TipoMovimentacao despesa = TipoMovimentacao.DESPESA;
        TipoMovimentacao receita = TipoMovimentacao.RECEITA;

        adicionar(dicionario, receita, "Reembolsos", "ESTORNO", "CASHBACK", "REEMBOLSO", "DEVOLUCAO");
        adicionar(dicionario, receita, "Salário", "SALARIO", "FOLHA DE PAGAMENTO", "PROVENTOS");
        adicionar(dicionario, receita, "Investimentos", "RENDIMENTO", "RENDIMENTOS", "RESGATE", "DIVIDENDOS", "JUROS SOBRE CAPITAL");

        adicionar(dicionario, despesa, "Compras", "MERCADO LIVRE", "MERCADOLIVRE", "AMAZON", "SHOPEE", "SHEIN",
                "ALIEXPRESS", "MAGAZINE LUIZA", "MAGALU", "AMERICANAS", "CASAS BAHIA", "RENNER", "RIACHUELO",
                "KABUM", "PERFUMES", "PERFUMARIA");
        adicionar(dicionario, despesa, "Assinaturas", "NETFLIX", "SPOTIFY", "PRIME VIDEO", "DISNEY", "HBO",
                "GLOBOPLAY", "YOUTUBE", "DEEZER", "APPLE COM", "GOOGLE ONE", "CHATGPT", "OPENAI", "CRUNCHYROLL");
        adicionar(dicionario, despesa, "Alimentação", "IFOOD", "RAPPI", "ZE DELIVERY", "RESTAURANTE", "LANCHONETE",
                "LANCHES", "PADARIA", "PANIFICADORA", "SUPERMERCADO", "MINI MERCADO", "MERCADO", "ATACADAO", "ASSAI",
                "CARREFOUR", "PAO DE ACUCAR", "HORTIFRUTI", "ACOUGUE", "PIZZARIA", "BURGER", "MCDONALDS",
                "MC DONALDS", "HABIBS", "CONVENIENCIA", "CAFETERIA");
        adicionar(dicionario, despesa, "Transporte", "UBER", "99", "99APP", "99 POP", "AUTOPASS", "POSTO",
                "COMBUSTIVEL", "AUTO POSTO", "SHELL", "IPIRANGA", "PETROBRAS", "ESTACIONAMENTO", "METRO", "CPTM",
                "SPTRANS", "BILHETE UNICO", "SEM PARAR", "CONECTCAR", "VELOE", "PEDAGIO");
        adicionar(dicionario, despesa, "Saúde", "FARMACIA", "DROGARIA", "DROGASIL", "DROGA RAIA", "RAIA",
                "PAGUE MENOS", "HOSPITAL", "CLINICA", "LABORATORIO", "ODONTO", "UNIMED", "AMIL", "HAPVIDA");
        adicionar(dicionario, despesa, "Contas e Serviços", "ENEL", "SABESP", "COMGAS", "CPFL", "CEMIG", "COPEL",
                "SANEPAR", "CLARO", "VIVO", "TIM", "OI", "NET SERVICOS", "SKY");
        adicionar(dicionario, despesa, "Moradia", "ALUGUEL", "CONDOMINIO", "IMOBILIARIA");
        adicionar(dicionario, despesa, "Educação", "ESCOLA", "FACULDADE", "UNIVERSIDADE", "COLEGIO", "UDEMY",
                "ALURA", "LIVRARIA");
        adicionar(dicionario, despesa, "Lazer", "CINEMA", "CINEMARK", "INGRESSO", "SYMPLA", "STEAM",
                "PLAYSTATION", "XBOX", "NINTENDO");
        adicionar(dicionario, despesa, "Pets", "PETZ", "COBASI", "PETSHOP", "PET SHOP", "VETERINARIA",
                "VETERINARIO");
        adicionar(dicionario, despesa, "Viagem", "LATAM", "AZUL LINHAS", "GOL LINHAS", "AIRBNB", "BOOKING",
                "HOTEL", "DECOLAR", "123MILHAS", "BUSER");
        adicionar(dicionario, despesa, "Impostos e Taxas", "IOF", "IPVA", "IPTU", "DARF", "DETRAN", "TARIFA",
                "ANUIDADE");
        return List.copyOf(dicionario);
    }

    private static void adicionar(List<PalavraChave> dicionario, TipoMovimentacao tipo, String nomeCategoria,
                                  String... termos) {
        for (String termo : termos) {
            dicionario.add(new PalavraChave(termo, tipo, nomeCategoria));
        }
    }
}
