// Cliente mínimo do GitHub Models, partilhado pelo gate de IA e pelas sugestões de testes.
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const config = JSON.parse(fs.readFileSync(path.join(root, "ai-gate/config.json"), "utf8"));

function montarPrompt(ficheiroPrompt, entradas) {
  const template = fs.readFileSync(path.join(root, ficheiroPrompt), "utf8");
  const codigo = entradas
    .map((f) => `// ===== ${f} =====\n` + fs.readFileSync(path.join(root, f), "utf8")
      .split("\n").map((l, i) => `${String(i + 1).padStart(4)} | ${l}`).join("\n"))
    .join("\n\n");
  return template.replace("{{CODIGO}}", codigo);
}

async function perguntar(prompt) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("Falta GITHUB_TOKEN (o job precisa de permissions: models: read)");
  }
  const resposta = await fetch(config.endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.modelo,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      ...config.parametros
    })
  });
  const corpo = await resposta.text();
  const tipo = resposta.headers.get("content-type") || "?";
  if (!resposta.ok || !tipo.includes("json")) {
    throw new Error(`GitHub Models respondeu ${resposta.status} (${tipo}): ${corpo.slice(0, 300)}`);
  }
  const dados = JSON.parse(corpo);
  const conteudo = dados.choices[0].message.content;
  return {
    json: extrairJson(conteudo),
    modeloUsado: dados.model,
    fingerprint: dados.system_fingerprint || null
  };
}

// O modelo às vezes embrulha o JSON em texto ou em ```json; fica só com o objeto.
function extrairJson(texto) {
  const inicio = texto.indexOf("{");
  const fim = texto.lastIndexOf("}");
  if (inicio === -1 || fim <= inicio) {
    throw new Error(`O modelo não devolveu JSON: ${texto.slice(0, 300)}`);
  }
  return JSON.parse(texto.slice(inicio, fim + 1));
}

module.exports = { config, montarPrompt, perguntar, root };
