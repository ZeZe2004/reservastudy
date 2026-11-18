# Sprint 3 — Gates de qualidade com IA

**Jira:** [XOG-11](https://ubi-team-jjr.atlassian.net/browse/XOG-11), [XOG-14](https://ubi-team-jjr.atlassian.net/browse/XOG-14), [XOG-15](https://ubi-team-jjr.atlassian.net/browse/XOG-15), [XOG-16](https://ubi-team-jjr.atlassian.net/browse/XOG-16), [XOG-17](https://ubi-team-jjr.atlassian.net/browse/XOG-17).

**Objetivo:** integrar gate de IA, sugerir e rever testes, medir estabilidade e versionar modelo, parâmetros, prompts e limiares.

## Entregas

| Tarefa | Evidência |
|---|---|
| XOG-11 — Seleção da IA | Gemini API, configuração e prompt de revisão em `ai-gate/` |
| XOG-14 — Gate | Job `ai-gate` de `.github/workflows/ci.yml`, `scripts/ai-client.js`, `scripts/ai-gate.js`, `scripts/ai-gate-core.js` |
| XOG-15 — Testes assistidos | Prompt `ai-gate/prompt-testes.md`, workflow manual `ai-testes.yml`, `tests/booking-ai-assisted.test.js` com seleção de casos-limite revistos manualmente |
| XOG-16 — Reprodutibilidade | Duas avaliações independentes por configuração, comparação de decisões, modelo e alertas; `tests/ai-gate.test.js` |
| XOG-17 — Versionamento | `ai-gate/config.json` (versão, modelos, temperatura, limiares), prompts e hashes SHA-256 no relatório |

## Como funciona

O CI faz lint, testes, SAST, build, DAST e revisão por IA antes de permitir deploy na `main`. O gate envia o código de `src/app.js` e `src/booking-domain.js` ao modelo configurado em `ai-gate/config.json`. Recebe JSON com resumo e lista estruturada de alertas. Valida os campos e as severidades, rejeitando ficheiros não analisados, confiança fora de 0–1, alertas duplicados ou dados malformados.

O gate reprova qualquer execução com alertas de severidade `critica` ou `alta` de confiança >= 0,7 ou mais de cinco alertas `media` acima do mesmo limiar. São feitas duas execuções com os mesmos inputs. A concordância dos alertas é `interseção / união` das assinaturas `id|ficheiro|linha|severidade`; se ambos os conjuntos estiverem vazios, vale 100%. Se decisões divergirem, os modelos efetivos forem diferentes (ex.: fallback) ou a concordância for inferior a 80%, o resultado é `REVISAO_HUMANA`. **Só `APROVADO` permite prosseguir automaticamente; `REPROVADO` e `REVISAO_HUMANA` falham o job.**

O relatório `reports/ai-gate.json` regista hash SHA-256 da configuração, prompt e código, SHA do commit, modelo efetivo por execução, respostas, decisões e métricas de estabilidade. O resumo é publicado no GitHub Actions e o relatório é guardado como artefacto de CI.

## Execução local

Requisitos: Node.js 22 e chave Gemini, configurada no repositório como secret `GEMINI_API_KEY` (injetada como `AI_API_KEY` no job).

```bash
npm ci
npm run lint
npm test
npm run build
# Com AI_API_KEY definida no ambiente:
node scripts/ai-gate.js
```

Para sugestões, executar **Actions → Sugerir testes com IA → Run workflow**; descarregar o artefacto `testes-sugeridos`. As sugestões **não são executadas automaticamente**. Rever e incorporar apenas testes relevantes na suite `node:test`. Os casos de `tests/booking-ai-assisted.test.js` foram selecionados a partir das categorias do prompt, não foram apresentados como saída verificada de uma execução real da API.

## Segurança, riscos e limitações

- Revisão por IA é auxiliar: falsos positivos/negativos são possíveis; não substitui revisão humana, ESLint, SAST, DAST ou testes unitários.
- A API recebe código-fonte: não enviar segredos, dados pessoais ou código de produção sem autorização.
- Temperatura 0 não garante resultado determinístico. Fallback de modelo pode alterar a avaliação e por isso exige revisão humana.
- Falta de chave, indisponibilidade da API ou JSON inválido fazem falhar o gate; **nunca se assume aprovação**.
- A falha histórica do workflow de sugestões em 12/11/2026 foi causada por HTTP 503 (alta procura). O cliente implementa novas tentativas e fallback; é necessário verificar uma execução recente para validar esta mitigação.

## Critérios de fecho

Antes de marcar o Sprint como concluído no Jira: guardar a ligação do PR aprovado e integrado, execução real do CI, artefacto de gate, evidência das duas execuções da IA, revisão dos testes sugeridos e commit/tag que contém os prompts e limiares. **Passar testes locais não demonstra, por si só, sucesso da API ou do CI remoto.**
