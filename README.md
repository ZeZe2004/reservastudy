# ReservaStudy

Protótipo de reservas de salas de estudo — projeto de Plataformas e Serviços X-Ops (UBI, 2026/27).
Equipa: José Baptista e Rafael Vicente.

**Site:** https://zeze2004.github.io/reservastudy/

## Executar localmente

- Abrir `index.html` num navegador (ou servir a pasta com `npx serve .`).
- `npm ci` para instalar as ferramentas de desenvolvimento (Node.js 22).
- `npm test` corre os testes; `npm run lint` a análise estática; `npm run build` gera a pasta `dist/`.

## Pipeline

Cada push corre lint, testes com cobertura, SAST (Semgrep e npm audit), build, DAST (OWASP ZAP) e, na `main`, o deploy para o GitHub Pages. Detalhes, limiares e rollback em [docs/sprint-2.md](docs/sprint-2.md).

## Documentação

- [Sprint 1](docs/sprint-1.md) · [Sprint 2](docs/sprint-2.md)
- [Contrato de equipa](docs/contrato-equipa.md)
- [Backlog do Sprint 1](docs/sprint-1-backlog.csv)
