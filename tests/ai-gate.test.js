"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { validar, decidir, compararExecucoes } = require("../scripts/ai-gate-core.js");
const entradas = ["src/app.js"];
const limiares = { bloquear_severidades: ["critica", "alta"], confianca_minima: 0.7, max_problemas_media: 5 };
const alerta = (extra = {}) => ({ id: "XSS-1", ficheiro: "src/app.js", linha: 8, severidade: "alta",
  confianca: 0.95, descricao: "Risco encontrado", sugestao: "Corrigir", ...extra });
const resultado = (problemas = []) => ({ resumo: "Revisão", problemas });
const execucao = (decisao, problemas = [], modeloUsado = "gemini") => ({ decisao, resultado: resultado(problemas), modeloUsado });
test("aceita JSON válido", () => assert.deepEqual(validar(resultado([alerta()]), entradas), resultado([alerta()])));
test("rejeita dados inválidos", () => {
  assert.throws(() => validar({}, entradas));
  for (const p of [alerta({confianca:-1}),alerta({confianca:1.5}),alerta({confianca:NaN}),
    alerta({severidade:"urgente"}),alerta({ficheiro:"fora.js"}),alerta({linha:-1}),alerta({descricao:""})]) {
    assert.throws(() => validar(resultado([p]), entradas));
  }
});
test("rejeita problemas repetidos", () => assert.throws(() => validar(resultado([alerta(),alerta()]),entradas)));
test("bloqueia risco alto acima do limiar", () => assert.equal(decidir(resultado([alerta()]),limiares).decisao,"REPROVADO"));
test("não bloqueia risco abaixo da confiança mínima", () => assert.equal(decidir(resultado([alerta({confianca:0.69})]),limiares).decisao,"APROVADO"));
test("bloqueia mais de cinco problemas médios", () => {
  const problemas = Array.from({length:6},(_,i)=>alerta({id:String(i),severidade:"media"}));
  assert.equal(decidir(resultado(problemas),limiares).decisao,"REPROVADO");
});
test("duas aprovações estáveis aprovam", () => {
  const a=compararExecucoes([execucao("APROVADO"),execucao("APROVADO")],0.8,limiares);
  assert.equal(a.decisao_final,"APROVADO");
  assert.equal(a.concordancia_problemas,1);
});
test("duas reprovações iguais reprovam", () => assert.equal(
  compararExecucoes([execucao("REPROVADO",[alerta()]),execucao("REPROVADO",[alerta()])],0.8,limiares).decisao_final,"REPROVADO"));
test("decisões divergentes exigem revisão humana", () => assert.equal(
  compararExecucoes([execucao("REPROVADO"),execucao("APROVADO")],0.8,limiares).decisao_final,"REVISAO_HUMANA"));
test("alertas bloqueantes divergentes exigem revisão mesmo com decisões iguais", () => assert.equal(
  compararExecucoes([execucao("APROVADO",[alerta()]),execucao("APROVADO",[])],0.8,limiares).decisao_final,"REVISAO_HUMANA"));
test("fallback para outro modelo exige revisão", () => assert.equal(
  compararExecucoes([execucao("APROVADO"),execucao("APROVADO",[],"modelo-alternativo")],0.8,limiares).decisao_final,"REVISAO_HUMANA"));
test("rejeita uma única execução", () => assert.throws(() => compararExecucoes([execucao("APROVADO")],0.8,limiares)));
test("avisos médios não bloqueantes variam sem bloquear aprovação", () => {
  const a = compararExecucoes([
    execucao("APROVADO",[alerta({severidade:"media"})]),
    execucao("APROVADO",[])
  ],0.8,limiares);
  assert.equal(a.decisao_final,"APROVADO");
  assert.equal(a.avisos_nao_bloqueantes_divergentes,true);
  assert.equal(a.concordancia_bloqueantes,1);
});
test("alertas graves coincidentes reprovam", () => {
  const a = compararExecucoes([
    execucao("REPROVADO",[alerta()]),
    execucao("REPROVADO",[alerta()])
  ],0.8,limiares);
  assert.equal(a.decisao_final,"REPROVADO");
});
