// Cliente mínimo para a API de chat (formato OpenAI) configurada em ai-gate/config.json,
// partilhado pelo gate de IA e pelas sugestões de testes.
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

const esperar = (segundos) => new Promise((resolve) => setTimeout(resolve, segundos * 1000));

// Um pedido com tempo limite. Falhas de rede e timeouts contam como estado 0, para serem repetidos.
async function pedido(modelo, prompt, token) {
  try {
    const resposta = await fetch(config.endpoint, {
      method: "POST",
      signal: AbortSignal.timeout(config.tentativas.timeout_segundos * 1000),
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelo,
        messages: [{ role: "user", content: prompt }],
        ...config.parametros
      })
    });
    return { estado: resposta.status, tipo: resposta.headers.get("content-type") || "?", corpo: await resposta.text() };
  } catch (erro) {
    return { estado: 0, tipo: "erro de rede", corpo: erro.name === "TimeoutError" ? "sem resposta dentro do tempo limite" : erro.message };
  }
}

// Tenta o modelo principal com esperas crescentes; se continuar indisponível,
// tenta o modelo alternativo. O modelo que respondeu fica registado no relatório.
async function perguntar(prompt) {
  const token = process.env.AI_API_KEY;
  if (!token) {
    throw new Error("Falta AI_API_KEY: criar o secret GEMINI_API_KEY no repositório (ver docs/sprint-3.md)");
  }
  const { maximo, espera_segundos: esperas, repetir_em: repetir } = config.tentativas;
  const modelos = [config.modelo, config.modelo_alternativo].filter(Boolean);
  let ultimoErro = "";

  for (const modelo of modelos) {
    for (let tentativa = 1; tentativa <= maximo; tentativa += 1) {
      const { estado, tipo, corpo } = await pedido(modelo, prompt, token);
      if (estado === 200 && tipo.includes("json")) {
        const dados = JSON.parse(corpo);
        return {
          json: extrairJson(dados.choices[0].message.content),
          modeloUsado: dados.model || modelo,
          alternativo: modelo !== config.modelo,
          tentativas: tentativa,
          fingerprint: dados.system_fingerprint || null
        };
      }
      ultimoErro = `${modelo} respondeu ${estado} (${tipo}): ${corpo.slice(0, 300)}`;
      if (!(repetir.includes(estado) || estado === 0) || tentativa === maximo) {
        break;
      }
      const espera = esperas[Math.min(tentativa - 1, esperas.length - 1)];
      console.log(`${modelo} indisponível (${estado}); nova tentativa daqui a ${espera}s`);
      await esperar(espera);
    }
  }
  throw new Error(`A API de IA não respondeu: ${ultimoErro}`);
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
