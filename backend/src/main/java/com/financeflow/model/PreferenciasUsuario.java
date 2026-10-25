package com.financeflow.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;

// Só existe depois que o usuário salva alguma preferência; antes disso valem os padrões de PreferenciasService
@Entity
@Table(name = "preferencias_usuarios")
public class PreferenciasUsuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "usuario_id", nullable = false, unique = true)
    private Usuario usuario;

    @Column(name = "ocultar_valores", nullable = false)
    private boolean ocultarValores;

    @Column(name = "limite_essencial", nullable = false, precision = 5, scale = 2)
    private BigDecimal limiteEssencial;

    @Column(name = "limite_total", nullable = false, precision = 5, scale = 2)
    private BigDecimal limiteTotal;

    @Column(name = "simulador_percentual_cdi", nullable = false, precision = 5, scale = 2)
    private BigDecimal simuladorPercentualCdi;

    @Column(name = "simulador_prazo_meses", nullable = false)
    private Integer simuladorPrazoMeses;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }

    public boolean isOcultarValores() {
        return ocultarValores;
    }

    public void setOcultarValores(boolean ocultarValores) {
        this.ocultarValores = ocultarValores;
    }

    public BigDecimal getLimiteEssencial() {
        return limiteEssencial;
    }

    public void setLimiteEssencial(BigDecimal limiteEssencial) {
        this.limiteEssencial = limiteEssencial;
    }

    public BigDecimal getLimiteTotal() {
        return limiteTotal;
    }

    public void setLimiteTotal(BigDecimal limiteTotal) {
        this.limiteTotal = limiteTotal;
    }

    public BigDecimal getSimuladorPercentualCdi() {
        return simuladorPercentualCdi;
    }

    public void setSimuladorPercentualCdi(BigDecimal simuladorPercentualCdi) {
        this.simuladorPercentualCdi = simuladorPercentualCdi;
    }

    public Integer getSimuladorPrazoMeses() {
        return simuladorPrazoMeses;
    }

    public void setSimuladorPrazoMeses(Integer simuladorPrazoMeses) {
        this.simuladorPrazoMeses = simuladorPrazoMeses;
    }
}
