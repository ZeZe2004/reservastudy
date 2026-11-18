// Gate de IA: revisão de código pelo modelo configurado em ai-gate/config.json.
// Corre a mesma revisão N vezes com configuração idêntica e compara as decisões.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { config, montarPrompt, perguntar, root } = require("./ai-client.js");

const { validar, decidir, compararExecucoes } = require("./ai-gate-core.js");

function hashFicheiro(nome) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(root, nome))).digest("hex");
}

function seguro(texto) {
  return String(texto).replace(/\|/g, "/").replace(/[\r\n]+/g, " ").slice(0, 400);
}

async function main() {
  if (!Number.isInteger(config.reprodutibilidade.execucoes) || config.reprodutibilidade.execucoes < 2) {
    throw new Error("Configuração inválida: definir pelo menos 2 execuções");
  }
  const prompt = montarPrompt(config.prompt, config.entradas);
  const execucoes = [];

  for (let i = 1; i <= config.reprodutibilidade.execucoes; i += 1) {
    const { json, modeloUsado, alternativo, tentativas, fingerprint } = await perguntar(prompt);
    const resultado = validar(json, config.entradas);
    execucoes.push({ execucao: i, modeloUsado, alternativo, tentativas, fingerprint, ...decidir(resultado, config.limiares), resultado });
  }

  const analise = compararExecucoes(execucoes, config.reprodutibilidade.concordancia_minima);
  const ficheiros = [...new Set(["ai-gate/config.json", config.prompt, ...config.entradas])];
  const hashes = Object.fromEntries(ficheiros.map((ficheiro) => [ficheiro, hashFicheiro(ficheiro)]));
  const relatorio = {
    data: new Date().toISOString(),
    commit: process.env.GITHUB_SHA || "local",
    configuracao: { versao: config.versao, ferramenta: config.ferramenta, modelo: config.modelo, parametros: config.parametros, limiares: config.limiares, reprodutibilidade: config.reprodutibilidade, hashes_sha256: hashes },
    execucoes,
    reprodutibilidade: analise,
    decisao_final: analise.decisao_final
  };

  fs.mkdirSync(path.join(root, "reports"), { recursive: true });
  fs.writeFileSync(path.join(root, "reports/ai-gate.json"), JSON.stringify(relatorio, null, 2));

  const linhas = execucoes.flatMap((e) => e.resultado.problemas.map((p) =>
    `| ${e.execucao} | ${p.severidade} | ${p.confianca} | ${seguro(`${p.ficheiro}:${p.linha}`)} | ${seguro(p.descricao)} |`));
  const resumo = [
    "### Gate de IA",
    `Modelo ${config.modelo} (config ${config.versao}, temperature ${config.parametros.temperature})`,
    "",
    `Modelos que responderam: ${analise.modelos.join(", ")}`,
    `Decisões: ${analise.decisoes.join(" / ")} · estável: ${analise.estavel ? "sim" : "não"} · concordância dos problemas: ${(analise.concordancia_problemas * 100).toFixed(1)}%`,
    `**Decisão final: ${analise.decisao_final}**`,
    analise.requer_revisao_humana ? "> As execuções discordaram (ou modelos diferentes/alertas abaixo do limiar de concordância). O gate bloqueia o deploy até revisão humana." : "",
    "",
    "| Execução | Severidade | Confiança | Local | Problema |",
    "|---|---|---|---|---|",
    ...linhas
  ].join("\n");
  console.log(resumo);
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, resumo + "\n");
  }
  if (analise.requer_revisao_humana) {
    console.log("::warning::Gate de IA exige revisão humana: deploy suspenso.");
  }
  process.exitCode = analise.decisao_final === "APROVADO" ? 0 : 1;
}

main().catch((erro) => {
  console.error(`::error::Gate de IA não conseguiu correr: ${erro.message}`);
  process.exit(1);
});
