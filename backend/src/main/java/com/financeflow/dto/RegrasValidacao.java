package com.financeflow.dto;

/**
 * Regras de formato compartilhadas pelos DTOs. O frontend repete as mesmas (utils/validacao.js); se mudar aqui, muda lá.
 */
public final class RegrasValidacao {

    // Pelo menos 6 caracteres, uma letra maiúscula (acentuada também vale) e um número
    public static final String SENHA_FORTE = "^(?=.*\\p{Lu})(?=.*\\d).{6,}$";
    public static final String MENSAGEM_SENHA =
            "a senha precisa ter pelo menos 6 caracteres, uma letra maiúscula e um número";
    // O BCrypt só considera os primeiros 72 bytes; acima disso, o resto da senha seria ignorado sem aviso
    public static final int SENHA_MAXIMO = 72;
    public static final String MENSAGEM_SENHA_MAXIMO = "a senha pode ter no máximo 72 caracteres";

    // Só o formato: nome@dominio.extensao. O @Email do Jakarta sozinho aceita "fulano@x", sem a extensão
    public static final String EMAIL_COM_DOMINIO = "^[^\\s@]+@[^\\s@]+\\.[A-Za-z]{2,}$";

    private RegrasValidacao() {
    }
}
