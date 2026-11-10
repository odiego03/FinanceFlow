package com.financeflow;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

// @EnableAsync: o e-mail do código de redefinição de senha sai fora da requisição (EnvioEmailService)
@EnableAsync
@SpringBootApplication
public class FinanceflowApplication {

    public static void main(String[] args) {
        SpringApplication.run(FinanceflowApplication.class, args);
    }
}
