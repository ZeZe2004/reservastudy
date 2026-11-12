// Gera a pasta dist/ com o site pronto a publicar.
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");
const ficheiros = ["index.html", "src/styles.css", "src/booking-domain.js", "src/app.js"];

fs.rmSync(dist, { recursive: true, force: true });

for (const ficheiro of ficheiros) {
  const origem = path.join(root, ficheiro);
  if (!fs.existsSync(origem)) {
    console.error(`Build falhou: falta o ficheiro ${ficheiro}`);
    process.exit(1);
  }
  const destino = path.join(dist, ficheiro);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.copyFileSync(origem, destino);
}

// Todos os ficheiros locais referenciados no index.html têm de existir no dist.
const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const referencias = [...html.matchAll(/(?:src|href)="(src\/[^"]+)"/g)].map((m) => m[1]);
const emFalta = referencias.filter((ref) => !fs.existsSync(path.join(dist, ref)));
if (emFalta.length > 0) {
  console.error(`Build falhou: referências partidas no index.html: ${emFalta.join(", ")}`);
  process.exit(1);
}

const versao = {
  versao: require("../package.json").version,
  commit: process.env.GITHUB_SHA || "local",
  data: new Date().toISOString()
};
fs.writeFileSync(path.join(dist, "version.json"), JSON.stringify(versao, null, 2) + "\n");

console.log(`Build concluído: ${ficheiros.length} ficheiros em dist/ (commit ${versao.commit.slice(0, 7)})`);
