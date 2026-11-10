package com.financeflow.security;

import com.financeflow.exception.MuitasTentativasLoginException;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Contra tentativa e erro de senha: depois de 5 erros seguidos no mesmo email, bloqueia o login dele por 15 minutos.
 * Fica em memória (zera ao reiniciar o backend), o que basta pra uma instância só.
 */
@Component
public class LimitadorTentativasLogin {

    static final int MAXIMO_TENTATIVAS = 5;
    static final Duration JANELA = Duration.ofMinutes(15);
    private static final int LIMPAR_ACIMA_DE = 10_000;

    private record Tentativas(int quantidade, Instant ultimaFalha) {
    }

    private final Map<String, Tentativas> falhasPorEmail = new ConcurrentHashMap<>();

    public void verificar(String email) {
        Tentativas tentativas = falhasPorEmail.get(email);
        if (tentativas == null || tentativas.quantidade() < MAXIMO_TENTATIVAS) {
            return;
        }
        Duration restante = Duration.between(Instant.now(), tentativas.ultimaFalha().plus(JANELA));
        if (restante.isNegative() || restante.isZero()) {
            falhasPorEmail.remove(email);
            return;
        }
        throw new MuitasTentativasLoginException(Math.max(1, (restante.toSeconds() + 59) / 60));
    }

    public void registrarFalha(String email) {
        Instant agora = Instant.now();
        if (falhasPorEmail.size() > LIMPAR_ACIMA_DE) {
            falhasPorEmail.values().removeIf(t -> t.ultimaFalha().plus(JANELA).isBefore(agora));
        }
        falhasPorEmail.merge(email, new Tentativas(1, agora), (anterior, nova) ->
                anterior.ultimaFalha().plus(JANELA).isBefore(agora)
                        ? nova : new Tentativas(anterior.quantidade() + 1, agora));
    }

    public void registrarSucesso(String email) {
        falhasPorEmail.remove(email);
    }
}
