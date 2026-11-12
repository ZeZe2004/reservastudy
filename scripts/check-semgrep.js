// Gate SAST: falha se o Semgrep encontrar resultados de severidade ERROR.
const fs = require("node:fs");

const relatorio = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const resultados = relatorio.results || [];
const porSeveridade = { ERROR: 0, WARNING: 0, INFO: 0 };

for (const r of resultados) {
  const severidade = r.extra.severity;
  porSeveridade[severidade] = (porSeveridade[severidade] || 0) + 1;
  console.log(`[${severidade}] ${r.path}:${r.start.line} ${r.check_id}`);
}

const resumo = `Semgrep: ${porSeveridade.ERROR} ERROR, ${porSeveridade.WARNING} WARNING, ${porSeveridade.INFO} INFO (limiar: 0 ERROR)`;
console.log(resumo);
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### SAST\n${resumo}\n`);
}
process.exit(porSeveridade.ERROR > 0 ? 1 : 0);
