// Gate DAST: falha se o ZAP encontrar alertas de risco alto.
// As regras marcadas como FAIL em .zap/rules.tsv já fazem falhar o próprio ZAP.
const fs = require("node:fs");

const relatorio = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const nomes = ["Informativo", "Baixo", "Médio", "Alto"];
const contagem = [0, 0, 0, 0];
const linhas = [];

for (const site of relatorio.site || []) {
  for (const alerta of site.alerts || []) {
    const risco = Number(alerta.riskcode);
    contagem[risco] += 1;
    linhas.push(`| ${alerta.pluginid} | ${alerta.name} | ${nomes[risco]} |`);
  }
}

const resumo = `ZAP: ${contagem[3]} alto, ${contagem[2]} médio, ${contagem[1]} baixo, ${contagem[0]} informativo (limiar: 0 alto)`;
console.log(resumo);
console.log(linhas.join("\n"));
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `### DAST\n${resumo}\n\n| Regra | Alerta | Risco |\n|---|---|---|\n${linhas.join("\n")}\n`
  );
}
process.exit(contagem[3] > 0 ? 1 : 0);
