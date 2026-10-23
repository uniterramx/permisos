// Permisos UT · Fase 5 · PDF de la Solicitud de Permiso y de la Bitácora de horas adicionales.
// Dibuja encima de las plantillas aprobadas (plantillas/*.pdf, sin campos) con pdf-lib.
// Coordenadas sacadas de los campos de las plantillas RELLENABLES (ver docs/migracion/04_Formatos_PDF.md).
// Funciona en el navegador (window.PDFLib) y en Node (para pruebas): PDF_UT.solicitud(PDFLib, bytes, datos).
(function (raiz) {
  'use strict';

  const GRIS = 0.45;

  // Texto que cabe en un ancho: encoge hasta `min` y, si aun no cabe, recorta con "…".
  function ajustar(fuente, texto, tam, min, ancho) {
    texto = String(texto == null ? '' : texto);
    let t = tam;
    while (t > min && fuente.widthOfTextAtSize(texto, t) > ancho) t -= 0.25;
    if (fuente.widthOfTextAtSize(texto, t) <= ancho) return { texto, tam: t };
    let s = texto;
    while (s.length > 1 && fuente.widthOfTextAtSize(s + '…', t) > ancho) s = s.slice(0, -1);
    return { texto: s.trimEnd() + '…', tam: t };
  }

  // alin: 'izq' | 'centro' | 'der'. x1..x2 es la caja; y es la línea base.
  function escribir(pag, fuente, texto, x1, x2, y, tam, min, alin, gris) {
    if (texto == null || texto === '') return;
    const a = ajustar(fuente, texto, tam, min, x2 - x1);
    const w = fuente.widthOfTextAtSize(a.texto, a.tam);
    const x = alin === 'centro' ? x1 + (x2 - x1 - w) / 2 : alin === 'der' ? x2 - w : x1;
    pag.drawText(a.texto, { x, y, size: a.tam, font: fuente, color: raiz.__rgb(gris == null ? 0 : gris) });
  }

  // Reparte por palabras en renglones de `ancho`.
  function renglones(fuente, texto, tam, ancho) {
    const palabras = String(texto || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    const out = []; let r = '';
    for (const p of palabras) {
      const prueba = r ? r + ' ' + p : p;
      if (fuente.widthOfTextAtSize(prueba, tam) <= ancho) r = prueba;
      else { if (r) out.push(r); r = p; }
    }
    if (r) out.push(r);
    return out;
  }

  async function base(PDFLib, plantilla, logo) {
    raiz.__rgb = (g) => PDFLib.rgb(g, g, g);
    const doc = await PDFLib.PDFDocument.load(plantilla);
    const pag = doc.getPage(0);
    const f = {
      n: await doc.embedFont(PDFLib.StandardFonts.TimesRoman),
      b: await doc.embedFont(PDFLib.StandardFonts.TimesRomanBold),
    };
    if (logo) {
      const img = await doc.embedPng(logo);
      const alto = 26, ancho = alto * img.width / img.height;
      pag.drawImage(img, { x: 60, y: 718, width: ancho, height: alto });
    }
    return { doc, pag, f };
  }

  function punto(pag, PDFLib, x, y) {
    pag.drawCircle({ x, y, size: 3.4, color: PDFLib.rgb(0, 0, 0) });
  }

  // datos: { folio, departamento, trabajador, puesto, horario: 'ausentar'|'entrar'|'salir'|null,
  //   fecha_ausentar, fecha_regreso, hora, dia, concepto_permiso: 'vacaciones'|'comision'|'homeoffice'|
  //   'reposicion'|'omision'|'otro', concepto, firma_nombre, firma_puesto, generado, logo (bytes PNG o null) }
  async function solicitud(PDFLib, plantilla, d) {
    const { doc, pag, f } = await base(PDFLib, plantilla, d.logo);
    const M = (s) => String(s || '').toLocaleUpperCase('es-MX');

    escribir(pag, f.n, d.folio, 457, 552, 722, 8, 6, 'izq', GRIS);
    escribir(pag, f.n, M(d.departamento), 161, 552, 670, 10.5, 6, 'izq');
    escribir(pag, f.n, M(d.trabajador), 322, 552, 646, 10.5, 6, 'izq');

    if (d.horario === 'ausentar') {
      punto(pag, PDFLib, 60, 620);
      escribir(pag, f.n, d.fecha_ausentar, 303, 552, 616, 10.5, 6, 'izq');
      if (d.fecha_regreso && d.fecha_regreso !== d.fecha_ausentar) escribir(pag, f.n, d.fecha_regreso, 196, 552, 598, 10.5, 6, 'izq');
    } else if (d.horario === 'entrar') {
      punto(pag, PDFLib, 60, 578);
      escribir(pag, f.n, d.hora, 164, 240, 574, 10.5, 6, 'izq');
      escribir(pag, f.n, d.dia, 342, 552, 574, 10.5, 6, 'izq');
    } else if (d.horario === 'salir') {
      punto(pag, PDFLib, 60, 560);
      escribir(pag, f.n, d.hora, 183, 240, 556, 10.5, 6, 'izq');
      escribir(pag, f.n, d.dia, 342, 552, 556, 10.5, 6, 'izq');
    }

    const yc = { vacaciones: 511, comision: 492, homeoffice: 473, reposicion: 454, omision: 435, otro: 416 }[d.concepto_permiso];
    if (yc) punto(pag, PDFLib, 230, yc);

    // Concepto: 3 renglones; 4 solo si no cabe (P3c). Si ni en 4 cabe, se encoge la letra.
    let tam = 10.5, rs = renglones(f.n, d.concepto, tam, 488);
    while (rs.length > 4 && tam > 7) { tam -= 0.25; rs = renglones(f.n, d.concepto, tam, 488); }
    const n = Math.max(3, Math.min(4, rs.length));
    for (let i = 0; i < n; i++) {
      const y = 360 - 20 * i;
      pag.drawLine({ start: { x: 60, y: y - 4 }, end: { x: 552, y: y - 4 }, thickness: 0.6, color: PDFLib.rgb(0, 0, 0) });
      if (rs[i]) pag.drawText(rs[i], { x: 62, y, size: tam, font: f.n, color: PDFLib.rgb(0, 0, 0) });
    }

    escribir(pag, f.n, M(d.trabajador), 65, 245, 164, 9.5, 6, 'centro');
    escribir(pag, f.b, M(d.puesto), 65, 245, 152, 9.5, 5.5, 'centro');
    escribir(pag, f.n, M(d.firma_nombre), 342, 552, 164, 9.5, 6, 'centro');
    escribir(pag, f.b, M(d.firma_puesto), 342, 552, 152, 9.5, 5.5, 'centro');

    escribir(pag, f.n, d.generado, 402, 552, 60, 8, 6, 'izq', GRIS);
    doc.setTitle(d.folio || 'Solicitud de permiso');
    return doc.save();
  }

  // datos: { folio, empleado, departamento, anio, saldo_anterior, saldo_actual, estado,
  //   movimientos: [{ folio, fecha, tipo, horas, proyecto, saldo }] (máx. 15, ya con texto listo),
  //   puesto, firma_nombre, firma_puesto, logo }
  async function bitacora(PDFLib, plantilla, d) {
    const { doc, pag, f } = await base(PDFLib, plantilla, d.logo);
    const M = (s) => String(s || '').toLocaleUpperCase('es-MX');

    escribir(pag, f.n, d.folio, 446, 552, 671, 10.5, 6, 'izq');
    escribir(pag, f.n, M(d.empleado), 132, 552, 647, 10.5, 6, 'izq');
    escribir(pag, f.n, M(d.departamento), 161, 430, 623, 10.5, 6, 'izq');
    escribir(pag, f.n, d.anio, 498, 552, 623, 10.5, 6, 'izq');
    escribir(pag, f.n, d.saldo_anterior, 166, 250, 599, 10.5, 6, 'izq');
    escribir(pag, f.n, d.saldo_actual, 375, 430, 599, 10.5, 6, 'izq');
    escribir(pag, f.n, d.estado, 516, 552, 599, 10.5, 6, 'izq');

    (d.movimientos || []).slice(0, 15).forEach((m, i) => {
      const y = 524 - 21 * i;
      escribir(pag, f.n, m.folio, 84, 124, y, 8.5, 5.5, 'centro');
      escribir(pag, f.n, m.fecha, 128, 194, y, 8.5, 5.5, 'centro');
      escribir(pag, f.n, m.tipo, 198, 238, y, 8.5, 5.5, 'centro');
      escribir(pag, f.n, m.horas, 242, 278, y, 8.5, 5.5, 'centro');
      escribir(pag, f.n, m.proyecto, 284, 418, y, 8.5, 5.5, 'izq');
      escribir(pag, f.n, m.saldo, 422, 462, y, 8.5, 5.5, 'centro');
    });

    escribir(pag, f.n, M(d.empleado), 60, 250, 160, 9, 6, 'centro');
    escribir(pag, f.b, M(d.puesto), 60, 250, 150, 8, 5.5, 'centro');
    escribir(pag, f.n, M(d.firma_nombre), 362, 552, 160, 9, 6, 'centro');
    escribir(pag, f.b, M(d.firma_puesto), 362, 552, 150, 8, 5.5, 'centro');

    doc.setTitle(d.folio || 'Bitácora');
    return doc.save();
  }

  const api = { solicitud, bitacora, renglones };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.PDF_UT = api;
})(typeof window !== 'undefined' ? window : globalThis);
