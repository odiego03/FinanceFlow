package com.financeflow.service.extrato;

import java.io.InputStream;
import java.util.List;

public interface ExtratoParser {

    List<LinhaExtratoBruta> parsear(InputStream arquivo);
}
