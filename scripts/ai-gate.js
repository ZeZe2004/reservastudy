// Gate de IA: revisão de código pelo modelo configurado em ai-gate/config.json.
// Corre a mesma revisão N vezes com configuração idêntica e compara as decisões.
const fs = require("node:fs");
const path = require("node:path");
const { config, montarPrompt, perguntar, root } = require("./ai-client.js");

const SEVERIDADES = ["critica", "alta", "media", "baixa"];

function validar(resultado) {
  if (!resultado || !Array.isArray(resultado.problemas)) {
    throw new Error("Resposta sem a lista 'problemas'");
  }
  for (const p of resultado.problemas) {
    if (!SEVERIDADES.includes(p.severidade) || typeof p.confianca !== "number") {
      throw new Error(`Problema com formato inválido: ${JSON.stringify(p)}`);
    }
  }
  return resultado;
}

function decidir(resultado) {
  const { bloquear_severidades: graves, confianca_minima: minima, max_problemas_media: maxMedia } = config.limiares;
  const bloqueantes = resultado.problemas.filter((p) => graves.includes(p.severidade) && p.confianca >= minima);
  const medios = resultado.problemas.filter((p) => p.severidade === "media" && p.confianca >= minima);
  const bloqueia = bloqueantes.length > 0 || medios.length > maxMedia;
  return { decisao: bloqueia ? "REPROVADO" : "APROVADO", bloqueantes: bloqueantes.map((p) => p.id), medios: medios.length };
}

async function main() {
  const prompt = montarPrompt(config.prompt, config.entradas);
  const execucoes = [];

  for (let i = 1; i <= config.reprodutibilidade.execucoes; i += 1) {
    const { json, modeloUsado, alternativo, tentativas, fingerprint } = await perguntar(prompt);
    const resultado = validar(json);
    execucoes.push({ execucao: i, modeloUsado, alternativo, tentativas, fingerprint, ...decidir(resultado), resultado });
  }

  const decisoes = execucoes.map((e) => e.decisao);
  const estavel = decisoes.every((d) => d === decisoes[0]);
  const ids = execucoes.map((e) => new Set(e.resultado.problemas.map((p) => `${p.ficheiro}:${p.severidade}`)));
  const comuns = [...ids[0]].filter((x) => ids.every((s) => s.has(x)));
  const todos = new Set(ids.flatMap((s) => [...s]));
  const concordancia = todos.size === 0 ? 1 : comuns.length / todos.size;
  const final = decisoes.every((d) => d === "REPROVADO") ? "REPROVADO" : "APROVADO";
  const modelos = [...new Set(execucoes.map((e) => e.modeloUsado))];

  const relatorio = {
    data: new Date().toISOString(),
    commit: process.env.GITHUB_SHA || "local",
    configuracao: { versao: config.versao, modelo: config.modelo, parametros: config.parametros, limiares: config.limiares },
    execucoes,
    reprodutibilidade: { decisoes, estavel, concordancia_problemas: Number(concordancia.toFixed(2)), modelos },
    decisao_final: final
  };

  fs.mkdirSync(path.join(root, "reports"), { recursive: true });
  fs.writeFileSync(path.join(root, "reports/ai-gate.json"), JSON.stringify(relatorio, null, 2));

  const linhas = execucoes.flatMap((e) => e.resultado.problemas.map((p) =>
    `| ${e.execucao} | ${p.severidade} | ${p.confianca} | ${p.ficheiro}:${p.linha} | ${p.descricao.replace(/\|/g, "/")} |`));
  const resumo = [
    "### Gate de IA",
    `Modelo ${config.modelo} (config ${config.versao}, temperature ${config.parametros.temperature})`,
    "",
    `Modelos que responderam: ${modelos.join(", ")}`,
    `Decisões: ${decisoes.join(" / ")} · estável: ${estavel ? "sim" : "não"} · concordância dos problemas: ${Math.round(concordancia * 100)}%`,
    `**Decisão final: ${final}**`,
    estavel ? "" : "> As execuções discordaram: o gate não bloqueia e o resultado precisa de revisão humana.",
    "",
    "| Execução | Severidade | Confiança | Local | Problema |",
    "|---|---|---|---|---|",
    ...linhas
  ].join("\n");
  console.log(resumo);
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, resumo + "\n");
  }
  if (!estavel) {
    console.log("::warning::Gate de IA instável: as execuções deram decisões diferentes. Rever manualmente.");
  }
  process.exit(final === "REPROVADO" ? 1 : 0);
}

main().catch((erro) => {
  console.error(`::error::Gate de IA não conseguiu correr: ${erro.message}`);
  process.exit(1);
});
