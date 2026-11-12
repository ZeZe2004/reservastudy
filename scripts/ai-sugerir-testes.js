// Pede ao modelo sugestões de testes. As sugestões NÃO entram sozinhas na suite:
// ficam em reports/testes-sugeridos.json para a equipa rever e copiar as úteis.
const fs = require("node:fs");
const path = require("node:path");
const { config, montarPrompt, perguntar, root } = require("./ai-client.js");

async function main() {
  const prompt = montarPrompt(config.testes.prompt, config.testes.entradas);
  const { json, modeloUsado } = await perguntar(prompt);
  fs.mkdirSync(path.join(root, "reports"), { recursive: true });
  fs.writeFileSync(path.join(root, "reports/testes-sugeridos.json"), JSON.stringify({ modeloUsado, ...json }, null, 2));
  const texto = (json.testes || []).map((t, i) =>
    `#### ${i + 1}. ${t.nome}\n${t.motivo}\n\n\`\`\`js\n${t.codigo}\n\`\`\``).join("\n\n");
  const resumo = `### Testes sugeridos pela IA (${modeloUsado})\n\n${texto}\n`;
  console.log(resumo);
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, resumo);
  }
}

main().catch((erro) => {
  console.error(`::error::${erro.message}`);
  process.exit(1);
});
