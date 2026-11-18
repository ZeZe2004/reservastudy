"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { isCalendarDate, minutesSinceMidnight, overlaps, validateBooking } = require("../src/booking-domain.js");
// Casos-limite escolhidos das categorias do prompt de testes, revistos manualmente.
const rooms = [{ id: "room-a" }, { id: "room-b" }];
const today = "2026-10-14";
const base = { roomId: "room-a", name: "Estudante", date: today, start: "09:00", end: "10:00" };
const booking = { ...base, id: "original", status: "booked" };
test("aceita limites 08:00 e 21:00", () => {
  assert.equal(validateBooking({ ...base, start:"08:00" }, [],rooms,today).valid,true);
  assert.equal(validateBooking({ ...base, start:"20:00",end:"21:00" },[],rooms,today).valid,true);
});
test("rejeita minutos fora do horário", () => {
  assert.ok(validateBooking({...base,start:"07:59"},[],rooms,today).errors.includes("outside-hours"));
  assert.ok(validateBooking({...base,end:"21:01"},[],rooms,today).errors.includes("outside-hours"));
});
test("rejeita formatos horários inválidos", () => {
  for (const h of ["9:00","24:00","12:60","12:0","noon"]) assert.equal(minutesSinceMidnight(h),null);
});
test("verifica anos bissextos", () => {
  assert.equal(isCalendarDate("2024-02-29"),true);
  assert.equal(isCalendarDate("2025-02-29"),false);
  assert.equal(isCalendarDate("2026-04-31"),false);
});
test("aceita nome de 80 caracteres mas não 81", () => {
  assert.equal(validateBooking({...base,name:"a".repeat(80)},[],rooms,today).valid,true);
  assert.ok(validateBooking({...base,name:"a".repeat(81)},[],rooms,today).errors.includes("invalid-name"));
});
test("intervalos contíguos não se sobrepõem", () => {
  assert.equal(overlaps({start:"08:00",end:"09:00"},{start:"09:00",end:"10:00"}),false);
});
test("reserva contida causa conflito", () => assert.ok(
  validateBooking({...base,start:"09:15",end:"09:45"},[booking],rooms,today).errors.includes("room-conflict")));
test("reservas canceladas não criam conflito", () => assert.equal(
  validateBooking(base,[{...booking,status:"cancelled"}],rooms,today).valid,true));
test("salas diferentes podem partilhar horário", () => assert.equal(
  validateBooking({...base,roomId:"room-b"},[booking],rooms,today).valid,true));
test("datas diferentes podem partilhar horário", () => assert.equal(
  validateBooking({...base,date:"2026-10-15"},[booking],rooms,today).valid,true));
