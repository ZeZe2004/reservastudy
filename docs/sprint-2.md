# Sprint 2 — CI/CD e feedback

**Objetivo do sprint:** entregar build, testes e deploy automáticos, com análise estática e verificações de segurança, e registar as falhas encontradas como Architectural Feedback.

**Product Owner deste sprint:** José Baptista

**Site publicado:** https://zeze2004.github.io/reservastudy/

## Issues do sprint

| Issue | O que foi feito | Evidência |
|---|---|---|
| XOG-9 Automatizar build e testes no CI | Pipeline corre lint, testes com cobertura e build em cada push e pull request. Os relatórios ficam guardados como artefactos de cada execução. | `.github/workflows/ci.yml`, `scripts/build.js` |
| XOG-12 Análise estática e gates SAST/DAST | ESLint, Semgrep e `npm audit` (SAST) e OWASP ZAP baseline contra o site a correr (DAST), cada um com um limiar que faz falhar o pipeline. | `eslint.config.js`, `scripts/check-semgrep.js`, `scripts/check-zap.js`, `.zap/rules.tsv` |
| XOG-6 Automatizar deploy do protótipo | Deploy para o GitHub Pages só depois de todos os gates passarem, com verificação de que a versão publicada é a do commit. Rollback manual para qualquer commit anterior. | `.github/workflows/ci.yml` (job Deploy), `.github/workflows/rollback.yml` |

## Pipeline

```
push / pull request
   ├── Análise estática (ESLint) ──┐
   ├── Testes e cobertura ─────────┼── Build do site ── DAST (ZAP) ──┐
   └── SAST (Semgrep + npm audit) ─┴─────────────────────────────────┴── Deploy (só na main)
```

### Critérios de sucesso e falha (limiares)

| Etapa | Falha o pipeline se… |
|---|---|
| ESLint | houver 1 erro ou 1 aviso |
| Testes | algum teste falhar, ou a cobertura ficar abaixo de 80% das linhas, 80% das funções ou 70% dos ramos |
| Build | faltar um ficheiro ou o `index.html` referir um ficheiro que não existe |
| npm audit | houver uma dependência com vulnerabilidade *high* ou *critical* |
| Semgrep | houver 1 resultado de severidade ERROR |
| ZAP | houver 1 alerta de risco alto, ou disparar uma regra marcada como FAIL em `.zap/rules.tsv` |
| Deploy | o `version.json` publicado não tiver o commit que foi testado |

### Ambiente e configuração

- **Alvo:** GitHub Pages, ambiente `github-pages` do repositório. Pré-requisito: em *Settings → Pages*, a fonte tem de ser **GitHub Actions**.
- **Configuração versionada:** toda a configuração do pipeline, dos gates e do deploy está no repositório (`.github/workflows/`, `eslint.config.js`, `.zap/rules.tsv`, `package.json`).
- **Rastreabilidade:** cada deploy publica `version.json` com a versão, o commit e a data.

### Rollback

1. No GitHub, abrir *Actions → Rollback → Run workflow*.
2. Indicar o commit ou a tag da última versão boa (ver o histórico de deploys em *Environments → github-pages*).
3. O workflow volta a publicar essa versão e o `version.json` passa a indicar `"rollback": true`.

Para recuperar de vez, corrige-se o problema num novo commit na `main`; o pipeline volta a testar e publicar.

## Resultados da primeira execução

Execução [#7](https://github.com/ZeZe2004/reservastudy/actions/runs/43196100105), commit `c178491`:

| Etapa | Resultado |
|---|---|
| ESLint | 0 erros, 0 avisos |
| Testes | 7/7; cobertura de 97% das linhas e 89% dos ramos |
| npm audit | 0 vulnerabilidades |
| Semgrep | 0 ERROR, 21 WARNING |
| ZAP | 0 alto, 2 médio, 6 baixo, 3 informativo |
| Deploy | falhou na 1.ª tentativa (ver AF-1); passou depois de corrigido |

## Architectural Feedback

Falhas e avisos encontrados pelo pipeline e o que dizem sobre a arquitetura.

| ID | Origem | O que aconteceu | Causa | Decisão |
|---|---|---|---|---|
| AF-1 | Deploy | O deploy falhou com erro 404 ao criar a publicação. | O GitHub Pages não estava ativado: há configuração do ambiente que vive fora do código versionado. | Ativado com fonte GitHub Actions. Fica documentado como pré-requisito do ambiente. |
| AF-2 | ZAP (médio) | Faltam os cabeçalhos *Content-Security-Policy* e anti-clickjacking (*X-Frame-Options*), e mais 6 cabeçalhos de risco baixo. | O GitHub Pages não deixa definir cabeçalhos HTTP: é um limite do alojamento estático escolhido no Sprint 1. | Aceite enquanto o protótipo for estático e sem dados reais. Entra como requisito quando houver backend; uma CSP por `<meta>` pode mitigar parte antes disso. |
| AF-3 | Semgrep (21 WARNING) | Todas as actions dos workflows estão referidas por tag (`@v4`) e não por SHA. | Uma tag pode ser movida, o que é um risco de cadeia de fornecimento no próprio pipeline. | Abaixo do limiar (WARNING). Fixar as actions por SHA no Sprint 3. |
| AF-4 | GitHub Actions (aviso) | As actions `@v4` usam Node 20, que o GitHub marcou como obsoleto. | Dependências do pipeline também envelhecem. | Atualizar as versões das actions junto com AF-3. |

## Revisão e retrospetiva

A preencher pela equipa depois da review do Sprint 2.
