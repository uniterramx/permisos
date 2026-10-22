// Permisos UT · calculos.js
// Reglas de calculo y redaccion (01_Especificacion §5 y §6). Sin dependencias.
// Lo usan la app (navegador) y los tests (node tests/calculos.test.js).
// Redondeo: al cuarto de hora mas cercano (decision de Valen, 22-oct-2026; antes era a la hora).
(function (raiz) {
  'use strict';

  // ---------- Horas ----------
  const aMin = t => { const [h, m] = String(t).slice(0, 5).split(':').map(Number); return h * 60 + m; };
  const dosD = n => String(n).padStart(2, '0');
  const HHMM = t => { const m = aMin(t); return dosD(Math.floor(m / 60)) + ':' + dosD(m % 60); };   // 08:30
  const HMM = t => { const m = aMin(t); return Math.floor(m / 60) + ':' + dosD(m % 60); };          // 8:30
  const duracion = (ini, fin) => { let d = aMin(fin) - aMin(ini); if (d <= 0) d += 24 * 60; return d; }; // cruza medianoche
  const redondear15 = min => Math.round(min / 15) * 15;
  const aHoras = min => min / 60;
  // 2 -> "2 h", 1.5 -> "1.5 h", 2.25 -> "2.25 h"
  const fmtH = h => { const v = Math.round(Math.abs(h) * 100) / 100; return String(v) + ' h'; };
  const fmtDuracion = min => { const h = Math.floor(min / 60), m = min % 60; return h && m ? h + ' h ' + m + ' min' : h ? h + ' h' : m + ' min'; };

  // ---------- Fechas ----------
  const diaSemana = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }; // 0=dom..6=sab
  const fechaMX = iso => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);
  function diasEntre(ini, fin) {
    const out = []; let [y, m, d] = ini.split('-').map(Number); let t = Date.UTC(y, m - 1, d);
    [y, m, d] = fin.split('-').map(Number); const tf = Date.UTC(y, m - 1, d);
    for (; t <= tf && out.length < 400; t += 864e5) out.push(new Date(t).toISOString().slice(0, 10));
    return out;
  }

  // ---------- Horario oficial de un dia ----------
  // emp: { jornada: 'TC'|'MT' } · horarios: [{ vigente_desde, horario_dias:[{dia,entrada,salida}] }] de esa persona
  // Devuelve { entrada, salida, jornadaMin, respaldo } o null si ese dia no labora.
  const TC = { entrada: '09:00', salida: '18:00' };
  function horarioDelDia(emp, horarios, iso) {
    const ds = diaSemana(iso);
    if (ds === 0 || ds === 6) return null;
    if (emp.jornada !== 'MT') return { ...TC, jornadaMin: 8 * 60, respaldo: false }; // TC: dia completo = 8 h (ya descuenta comida)
    const h = (horarios || []).filter(x => x.vigente_desde <= iso).sort((a, b) => b.vigente_desde.localeCompare(a.vigente_desde))[0];
    if (!h) return { entrada: '09:00', salida: '14:00', jornadaMin: 5 * 60, respaldo: true }; // sin dato: respaldo 9-14
    const d = (h.horario_dias || []).find(x => x.dia === ds);
    if (!d || !d.entrada) return null; // "-" = no labora ese dia
    return { entrada: HHMM(d.entrada), salida: HHMM(d.salida), jornadaMin: duracion(d.entrada, d.salida), respaldo: false };
  }

  // ---------- Que mueve (§5.1, en este orden) ----------
  function queMueve(tipo, justificacion) {
    if (justificacion === 'reposicion_horas') return 'deuda';
    if (tipo === 'reposicion') return 'reposicion';
    if (justificacion === 'uso_horas') return 'retiro';
    if (tipo === 'horas_extras') return 'deposito';
    return 'no';
  }

  // ---------- Clasificacion de llegada (§5.6) ----------
  function clasificarLlegada(hora, of) {
    if (!of) return 'llegada_destiempo';
    return aMin(hora) < aMin(of.entrada) ? 'llegada_temprana' : 'llegada_tarde';
  }

  // ---------- Deposito / reposicion: horas trabajadas fuera de jornada (§5.3) ----------
  function calcularDeposito(emp, horarios, iso, ini, fin) {
    const bruto = duracion(ini, fin);
    const of = horarioDelDia(emp, horarios, iso);
    let traslape = 0;
    if (of) { // L-V: se descuenta lo que cae dentro de su horario oficial de ese dia
      const a1 = aMin(ini), a2 = a1 + bruto, b1 = aMin(of.entrada), b2 = b1 + duracion(of.entrada, of.salida);
      traslape = Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
    }
    const netoMin = Math.max(0, bruto - traslape);
    const min = redondear15(netoMin);
    const calculo = traslape
      ? HHMM(fin) + ' - ' + HHMM(ini) + ' = ' + fmtH(aHoras(bruto)) + '; menos su jornada ' + HMM(of.entrada) + '-' + HMM(of.salida) + ' (' + fmtH(aHoras(traslape)) + ') = ' + fmtH(aHoras(min))
      : HHMM(fin) + ' - ' + HHMM(ini) + ' = ' + fmtH(aHoras(bruto)) + ' -> ' + fmtH(aHoras(min));
    return { horas: aHoras(min), minutosReales: netoMin, calculo, oficial: of };
  }

  // ---------- Retiro / deuda (§5.4) ----------
  function calcularRetiro(emp, horarios, tipo, iso, isoFin, hora) {
    if (tipo === 'ausencia') {
      const partes = []; let min = 0, primero = null;
      for (const dia of diasEntre(iso, isoFin || iso)) {
        const of = horarioDelDia(emp, horarios, dia);
        if (!of) continue;
        primero = primero || of; min += of.jornadaMin; partes.push(fmtH(aHoras(of.jornadaMin)).replace(' ', ''));
      }
      const calculo = '(' + (emp.jornada === 'MT' ? 'MT' : 'TC') + ') ' + (partes.length ? partes.join(' + ') : '0h') + ' = ' + fmtH(aHoras(min));
      return { horas: min ? -aHoras(redondear15(min)) : 0, minutosReales: min, calculo, oficial: primero };
    }
    const of = horarioDelDia(emp, horarios, iso);
    if (!of) return { horas: 0, minutosReales: 0, calculo: 'Sin horario oficial ese día', oficial: null };
    let real = 0, calculo = '';
    if (tipo === 'salida_anticipada') {
      real = Math.max(0, aMin(of.salida) - aMin(hora));
      calculo = HMM(of.salida) + ' - ' + HHMM(hora) + ' = ' + fmtDuracion(real);
    } else { // llegada tarde / destiempo / temprana
      real = Math.max(0, aMin(hora) - aMin(of.entrada));
      calculo = HHMM(hora) + ' - ' + HMM(of.entrada) + ' = ' + fmtDuracion(real);
    }
    const min = redondear15(real);
    return { horas: min ? -aHoras(min) : 0, minutosReales: real, calculo: calculo + ' -> ' + fmtH(aHoras(min)), oficial: of };
  }

  // ---------- Verificacion de cambio de horario (§5.7) ----------
  function verificarCambio(emp, horarios, iso, ini, fin) {
    const of = horarioDelDia(emp, horarios, iso);
    const trab = duracion(ini, fin);
    if (!of) return { cumple: true, texto: '[Verificación: ese día no tiene horario oficial; trabajó ' + fmtH(aHoras(redondear15(trab))) + '.]' };
    const prog = duracion(of.entrada, of.salida);
    const progTxt = 'programado ' + fmtH(aHoras(prog)) + ' (' + HMM(of.entrada) + '–' + HMM(of.salida) + '), trabajó ' + fmtH(aHoras(redondear15(trab)));
    if (trab >= prog) return { cumple: true, debe: 0, texto: '[Verificación: CUMPLE su jornada — ' + progTxt + '.]' };
    const debe = redondear15(prog - trab);
    return { cumple: false, debe: aHoras(debe), texto: '[Verificación: QUEDÓ A DEBER ' + fmtH(aHoras(debe)) + ' — ' + progTxt + '.]' };
  }

  // ---------- Redaccion oficial (§6, texto EXACTO) ----------
  function unirOraciones(partes) {
    return partes.map(p => String(p || '').trim()).filter(Boolean)
      .map(p => /[.!?…]$/.test(p) ? p : p + '.').join(' ');
  }
  const BASE_JUST = {
    home_office: 'Trabajo en modalidad home office autorizado por mi jefe directo.',
    vacaciones: 'Ausencia a cuenta de días de vacaciones.',
    uso_horas: 'Variación de horario con cargo al banco de horas acumuladas.',
    reposicion_horas: 'Variación de horario con compromiso de reposición de las horas correspondientes.'
  };
  // s: { tipo, justificacion, fecha_inicio, hora_ref, hora_fin, que_checar, proyecto, comision_ref, texto_oficial, notas, motivo_cambio }
  // calc: resultado de calcular() (para la parte enriquecida)
  function redactar(s, calc) {
    const partes = [];
    switch (s.tipo) {
      case 'horas_extras': partes.push('Trabajo fuera de horario oficial en proyecto ' + (s.proyecto || '') + '.'); break;
      case 'reposicion': partes.push('Reposición de horas trabajadas el día ' + fechaMX(s.fecha_inicio) + ', de ' + HHMM(s.hora_ref) + ' a ' + HHMM(s.hora_fin) + '.'); break;
      case 'omision_checado': partes.push('Omisión de checado de ' + ({ entrada: 'entrada', salida: 'salida', ambas: 'entrada y salida' }[s.que_checar]) + '.'); break;
      case 'cambio_horario': partes.push('Variación de horario: jornada recorrida de ' + HHMM(s.hora_ref) + ' a ' + HHMM(s.hora_fin) + '.', s.motivo_cambio); break;
      default:
        if (s.justificacion === 'comision') partes.push(s.comision_ref ? 'Atención a comisión / reunión externa — ' + s.comision_ref + '.' : 'Atención a comisión / reunión externa.');
        else if (s.justificacion === 'asunto_personal' || s.justificacion === 'otro') partes.push(s.texto_oficial);
        else partes.push(BASE_JUST[s.justificacion] || '');
    }
    // §6.3 enriquecida: solo si mueve banco (deposito o retiro) y hay horas
    if (calc && (calc.mueve === 'deposito' || calc.mueve === 'retiro') && calc.horas && calc.oficial) {
      const of = 'Mi horario oficial es de ' + HMM(calc.oficial.entrada) + ' a ' + HMM(calc.oficial.salida) + ' h';
      if (s.tipo === 'horas_extras') partes.push(of + '; este día trabajé de ' + HHMM(s.hora_ref) + ' a ' + HHMM(s.hora_fin) + ' h.');
      else if (s.tipo === 'salida_anticipada') partes.push(of + '; este día salí a las ' + HHMM(s.hora_ref) + ' h.');
      else if (s.tipo === 'ausencia') partes.push(of + '.');
      else partes.push(of + '; este día entré a las ' + HHMM(s.hora_ref) + ' h.');
      partes.push(calc.mueve === 'deposito' ? 'Generé ' + fmtH(calc.horas) + ' de tiempo adicional.' : 'Apliqué ' + fmtH(calc.horas) + ' de mi tiempo acumulado.');
    }
    partes.push(s.notas); // las notas van siempre al final
    return unirOraciones(partes);
  }

  // ---------- Todo junto ----------
  // Devuelve { tipo (reclasificado), mueve, horas (con signo), calculo, oficial, verificacion, redaccion }
  function calcular(emp, horarios, s) {
    let tipo = s.tipo;
    const ofDia = s.fecha_inicio ? horarioDelDia(emp, horarios, s.fecha_inicio) : null;
    if (tipo === 'llegada' || tipo === 'llegada_tarde' || tipo === 'llegada_temprana' || tipo === 'llegada_destiempo')
      tipo = clasificarLlegada(s.hora_ref, ofDia);
    const mueve = queMueve(tipo, s.justificacion);
    let r = { horas: 0, calculo: '', oficial: ofDia };
    if (mueve === 'deposito' || mueve === 'reposicion') r = calcularDeposito(emp, horarios, s.fecha_inicio, s.hora_ref, s.hora_fin);
    else if (mueve === 'retiro' || mueve === 'deuda') r = calcularRetiro(emp, horarios, tipo, s.fecha_inicio, s.fecha_fin, s.hora_ref);
    else if (tipo === 'ausencia' || tipo === 'salida_anticipada' || /^llegada/.test(tipo)) r = calcularRetiro(emp, horarios, tipo, s.fecha_inicio, s.fecha_fin, s.hora_ref); // informativo
    const verificacion = tipo === 'cambio_horario' ? verificarCambio(emp, horarios, s.fecha_inicio, s.hora_ref, s.hora_fin) : null;
    const horasMov = mueve === 'no' ? 0 : r.horas;
    const out = { tipo, mueve, horas: horasMov, horasInfo: r.horas, minutosReales: r.minutosReales || 0, calculo: r.calculo, oficial: r.oficial || ofDia, verificacion };
    out.redaccion = redactar({ ...s, tipo }, out);
    return out;
  }

  const API = { aMin, HHMM, HMM, duracion, redondear15, fmtH, fmtDuracion, diaSemana, fechaMX, diasEntre,
    horarioDelDia, queMueve, clasificarLlegada, calcularDeposito, calcularRetiro, verificarCambio, redactar, unirOraciones, calcular };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else raiz.Calc = API;
})(typeof window !== 'undefined' ? window : globalThis);
