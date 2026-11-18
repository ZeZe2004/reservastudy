"use strict";

// Funções puras para validar a saída do modelo, aplicar limiares e comparar execuções.
// Separar do cliente HTTP permite testar os critérios sem chave de API.
const SEVERIDADES = new Set(["critica", "alta", "media", "baixa"]);

function validar(resultado, entradas) {
  if (!resultado || typeof resultado !== "object" || Array.isArray(resultado)
      || typeof resultado.resumo !== "string" || !Array.isArray(resultado.problemas)) {
    throw new Error("Resposta de IA inválida: esperado resumo e lista de problemas");
  }
  if (resultado.problemas.length > 100) {
    throw new Error("Resposta de IA inválida: demasiados problemas");
  }
  const vistos = new Set();
  for (const problema of resultado.problemas) {
    if (!problema || typeof problema !== "object" || Array.isArray(problema)
        || typeof problema.id !== "string" || !problema.id.trim()
        || typeof problema.ficheiro !== "string" || !entradas.includes(problema.ficheiro)
        || !Number.isInteger(problema.linha) || problema.linha < 0
        || !SEVERIDADES.has(problema.severidade)
        || typeof problema.confianca !== "number" || !Number.isFinite(problema.confianca)
        || problema.confianca < 0 || problema.confianca > 1
        || typeof problema.descricao !== "string" || !problema.descricao.trim()
        || typeof problema.sugestao !== "string" || !problema.sugestao.trim()) {
      throw new Error("Resposta de IA inválida: problema fora do esquema esperado");
    }
    const chave = `${problema.ficheiro}:${problema.id}`;
    if (vistos.has(chave)) {
      throw new Error("Resposta de IA inválida: problemas duplicados");
    }
    vistos.add(chave);
  }
  return resultado;
}

function decidir(resultado, limiares) {
  const { bloquear_severidades: graves, confianca_minima: minima, max_problemas_media: maxMedia } = limiares;
  const relevantes = resultado.problemas.filter((p) => p.confianca >= minima);
  const bloqueantes = relevantes.filter((p) => graves.includes(p.severidade));
  const medios = relevantes.filter((p) => p.severidade === "media");
  return {
    decisao: bloqueantes.length || medios.length > maxMedia ? "REPROVADO" : "APROVADO",
    bloqueantes: bloqueantes.map((p) => p.id),
    medios: medios.length
  };
}

function assinatura(problema) {
  // O mesmo ID não deve ser confundido com um alerta de severidade/local diferente.
  return `${problema.id}|${problema.ficheiro}|${problema.linha}|${problema.severidade}`;
}

function concordanciaConjuntos(conjuntos) {
  const uniao = new Set(conjuntos.flatMap((conjunto) => [...conjunto]));
  if (uniao.size === 0) return 1;
  const intersecao = [...conjuntos[0]].filter((item) => conjuntos.every((conjunto) => conjunto.has(item)));
  return intersecao.length / uniao.size;
}

function compararExecucoes(execucoes, confiancaMinima, limiares) {
  if (!Array.isArray(execucoes) || execucoes.length < 2) {
    throw new Error("São necessárias pelo menos duas execuções para medir reprodutibilidade");
  }
  if (typeof confiancaMinima !== "number" || confiancaMinima < 0 || confiancaMinima > 1) {
    throw new Error("Limiar de concordância inválido");
  }
  if (!limiares || !Array.isArray(limiares.bloquear_severidades)
      || typeof limiares.confianca_minima !== "number") {
    throw new Error("Limiares de segurança obrigatórios");
  }
  const decisoes = execucoes.map((e) => e.decisao);
  const modelos = [...new Set(execucoes.map((e) => e.modeloUsado))];
  const estavel = decisoes.every((d) => d === decisoes[0]);
  const mesmoModelo = modelos.length === 1;
  const todosConjuntos = execucoes.map((e) => new Set(e.resultado.problemas.map(assinatura)));
  const bloqueantesConjuntos = execucoes.map((e) => new Set(
    e.resultado.problemas
      .filter((p) => limiares.bloquear_severidades.includes(p.severidade)
        && p.confianca >= limiares.confianca_minima)
      .map(assinatura)
  ));
  const concordanciaTodos = concordanciaConjuntos(todosConjuntos);
  const concordanciaBloqueantes = concordanciaConjuntos(bloqueantesConjuntos);

  // Alertas não bloqueantes podem variar na redação e no ID entre execuções.
  // A discordância é reportada e revista, mas só o risco material impede aprovação.
  // Divergência de decisões, de modelos ou de alertas bloqueantes exige revisão humana.
  const requerRevisao = !estavel || !mesmoModelo || concordanciaBloqueantes < confiancaMinima;
  return {
    decisoes,
    estavel,
    concordancia_problemas: Number(concordanciaTodos.toFixed(4)),
    concordancia_bloqueantes: Number(concordanciaBloqueantes.toFixed(4)),
    avisos_nao_bloqueantes_divergentes: concordanciaTodos < confiancaMinima,
    modelos,
    mesmo_modelo: mesmoModelo,
    requer_revisao_humana: requerRevisao,
    decisao_final: requerRevisao ? "REVISAO_HUMANA" : decisoes[0]
  };
}

module.exports = { validar, decidir, assinatura, compararExecucoes };
