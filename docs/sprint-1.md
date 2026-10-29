# Sprint 1 — ReservaStudy

**Unidade curricular:** Plataformas e Serviços X-Ops, 2026/27  
**Equipa:** José Baptista e Rafael Vicente  
**Product Owner deste sprint:** José Baptista  
**Objetivo do sprint:** validar uma primeira experiência de consulta e reserva de salas e deixar uma base executável e testável para evoluir o produto nos próximos sprints.

**Referência:** [página oficial da unidade](https://www.di.ubi.pt/~ngpombo/units/psx.html) e enunciado do projeto fornecido pela equipa.

## Calendário

O enunciado indica início a **28/09/2026** e duração de duas semanas. Considerando períodos consecutivos de 14 dias, o Sprint 1 corresponderia a **28/09–11/10/2026** e o Sprint 2 começaria a **12/10/2026**. No entanto, a [página oficial da unidade](https://www.di.ubi.pt/~ngpombo/units/psx.html) lista a revisão/retrospetiva do Sprint 1 em 28/09 e a do Sprint 2 em 12/10; a primeira data coincide com o início indicado no enunciado. Por isso, estas datas finais são apenas uma extrapolação — confirmar com o docente e atualizar o Jira. Este pacote foi preparado em 14/10/2026 para apoiar a apresentação; não inventa reuniões ou decisões anteriores.

## Problema e âmbito

Estudantes precisam de encontrar um espaço adequado para estudar e de perceber se está disponível antes de o escolher. O incremento demonstra a seleção de uma sala, a marcação de um intervalo, a prevenção de conflitos e a consulta/cancelamento de reservas.

**Incluído:** quatro salas de exemplo; reservas locais; regras de horário e sobreposição; testes da lógica; workflow inicial de CI.  
**Excluído neste sprint:** contas e autenticação, backend e base de dados partilhada, integração com espaços reais, implantação, SAST/DAST, observabilidade e gates de IA.

## História principal e critérios de aceitação

**Como estudante, quero consultar salas e reservar uma sala num intervalo disponível, para garantir um espaço para estudar.**

1. Posso escolher uma das salas apresentadas e indicar o meu nome, uma data e as horas de início e fim.
2. Só é aceite uma data válida não passada e um intervalo dentro do horário 08:00–21:00, com fim posterior ao início.
3. Uma sala não aceita reservas com sobreposição na mesma data; uma sala diferente ou um intervalo adjacente continua disponível.
4. Após confirmação, a reserva aparece na lista do dia e mantém-se depois de atualizar a página no mesmo navegador.
5. Posso cancelar uma reserva; o intervalo libertado volta a poder ser reservado.
6. Dados de exemplo estão identificados como fictícios e não são apresentados como reservas reais.

## Critérios de sucesso do produto

Metas a verificar na revisão do sprint (são objetivos, não resultados já medidos):

| Critério | Meta | Como se verifica |
|---|---|---|
| Rapidez do fluxo | Uma reserva válida concluída em menos de 1 minuto, sem ajuda | Demonstração cronometrada na revisão |
| Integridade das reservas | 0 reservas sobrepostas aceites na mesma sala e data | Testes automatizados (`npm test`) e tentativa manual na demonstração |
| Qualidade da lógica | 100% dos testes de domínio a passar em cada push | Execução do workflow de CI no GitHub |
| Clareza | O estudante percebe qual o erro quando a reserva é recusada | Mensagem visível no formulário para cada regra violada |

## Backlog do Sprint

O ficheiro [`sprint-1-backlog.csv`](./sprint-1-backlog.csv) resume os itens para registo no Jira. Responsabilidades indicadas abaixo são uma proposta operacional para a equipa confirmar, não prova de autoria individual.

| Prioridade | Item | Critério de conclusão | Responsabilidade proposta |
|---|---|---|---|
| Alta | Definir problema, objetivo e história principal | Âmbito e critérios de aceitação documentados | José Baptista (PO), com validação de ambos |
| Alta | Criar protótipo navegável | Quatro salas e fluxo de reserva apresentados | Rafael Vicente (implementação), revisão conjunta |
| Alta | Implementar regras de reserva | Validação e prevenção de sobreposições cobertas por testes | Rafael Vicente (implementação), José Baptista (aceitação) |
| Média | Criar CI inicial | GitHub Actions executa `npm test` em push e pull request | Rafael Vicente (configuração), revisão conjunta |
| Média | Preparar revisão e evidências | Roteiro, contrato e registos reais prontos para atualizar | José Baptista (PO), contribuição de ambos |

## Incremento demonstrável

O protótipo abre em `index.html`; o fluxo de reserva e cancelamento funciona no navegador. `npm test` executa os testes da lógica de domínio. O workflow `.github/workflows/ci.yml` está preparado, mas a execução remota depende de o projeto ser colocado num repositório GitHub. O primeiro acesso cria três reservas de exemplo fictícias.

A apresentação da revisão está em [`apresentacao-sprint-1.pptx`](./apresentacao-sprint-1.pptx).

## Decisões de arquitetura

- **Estilo:** aplicação web estática, modular no cliente. É suficiente para validar o fluxo do estudante com um incremento pequeno e fácil de demonstrar.
- **Separação:** `src/booking-domain.js` contém validações puras e testáveis; `src/app.js` trata da interface e persistência local; `src/styles.css` contém a apresentação.
- **Persistência:** `localStorage` do navegador, sem transmitir dados. Adequado à prova de conceito, mas não à reserva real partilhada.
- **Qualidade inicial:** testes do Node.js sem bibliotecas de terceiros e workflow de CI com permissões de leitura.
- **Trade-off aceite:** simplicidade de execução para esta primeira revisão, em troca da falta de sincronização, autenticação e garantias de concorrência. A evolução para backend deverá reavaliar estes limites.

### Alternativas consideradas

| Alternativa | Vantagem | Porque não foi escolhida no Sprint 1 |
|---|---|---|
| Monólito com backend e base de dados (ex.: Node/Express + SQLite) | Reservas partilhadas e controlo de conflitos no servidor | Mais infraestrutura e deploy antes de validar o fluxo; fica como evolução no Sprint 2 |
| Microsserviços (salas, reservas, utilizadores) | Escala e implantação independentes | Complexidade desproporcional para uma equipa de 2 e um domínio ainda pequeno |
| Aplicação web estática modular (escolhida) | Corre sem servidor, demonstra-se em segundos e a lógica de domínio fica testável e reutilizável | — |

A separação entre `booking-domain.js` e `app.js` foi pensada para que a lógica de domínio possa passar para um backend sem ser reescrita.

## Scrum, papéis e evidências

- **Product Owner:** José Baptista no Sprint 1. A rotação proposta para o planeamento seguinte é Rafael Vicente no Sprint 2; confirmar os papéis futuros em cada Sprint Planning.
- **Responsabilidade de implementação:** ambos contribuem e revêm; a repartição da tabela é uma proposta e deve ser ajustada ao trabalho efetivamente realizado.
- **Cerimónias:** registar no Jira (ou ferramenta equivalente) planeamento, check-ins diários, revisão e retrospetiva com data, participantes, decisões e links para o incremento.
- **Evidência a completar pela equipa:** datas e presenças reais; o que foi efetivamente concluído durante o sprint; demonstração/feedback realmente recebido; impedimentos e ações acordadas. Não preencher por suposição.

## Revisão e retrospetiva — guião para a equipa preencher

**Demonstração:** selecionar uma sala, criar uma reserva válida, tentar um intervalo sobreposto, demonstrar cancelamento e correr `npm test`.  
**Confirmado como concluído no pacote:** protótipo, regras cobertas por testes e workflow de CI configurado localmente. A equipa deve confirmar cada ponto e o estado do workflow remoto antes de o declarar aceite.  
**Feedback do docente/equipa:** preencher apenas após a revisão real.  
**Retrospetiva:** registar uma prática a manter, uma a melhorar, um impedimento observado e uma ação com responsável e prazo. Não há observações de cerimónias inventadas neste documento.

## Riscos e limitações

1. Reservas locais não são partilhadas entre estudantes; não simular disponibilidade real.
2. Ainda não existem contas, controlo de acesso, persistência central ou verificação de concorrência no servidor.
3. A configuração do workflow só pode ser validada remotamente após publicação no GitHub.
4. A app não faz chamadas a um serviço externo; não usar dados pessoais reais.

## Próximas prioridades (não são trabalho concluído do Sprint 1)

1. Criar/atualizar o quadro Jira, importar o backlog, convidar o docente e registar evidências reais.
2. Validar com o docente a história, as salas e as regras do domínio.
3. Evoluir para persistência partilhada e controlo de conflitos no servidor.
4. Planear os próximos controlos de qualidade e segurança; introduzir o registo de feedback arquitetural a partir do Sprint 2 e reprodutibilidade dos gates de IA a partir do Sprint 3, conforme o enunciado.

## Utilização de IA neste incremento

O Copilot Chat em VS Code foi usado como apoio para gerar e rever código do protótipo e testes. A equipa deve rever o resultado, executar a suite e confirmar manualmente os fluxos antes da apresentação. Este uso como assistente de desenvolvimento não equivale a uma gate automática de IA. Ainda não há prompt de gate, versão de modelo ou resultados de estabilidade a reportar.
