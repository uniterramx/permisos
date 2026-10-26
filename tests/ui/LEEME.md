# Pruebas de navegador y SQL (Postgres local que imita Supabase)

- `supa.sql`: roles anon/authenticated/service_role, esquemas auth y storage (buckets/objects con RLS), auth.uid().
- `init.sh`: levanta Postgres 16 en /var/lib/pgut (puerto 54329) y corre 001, 003–009. Después correr 010 y 011 a mano
  y dar PINs: `select public._dar_pin(id,'135790') from empleados where iniciales in ('GTB','LZTM','VMM','LAMC','REMC','AEGF')`.
  OJO: las rutas internas apuntan al scratchpad de la sesión del 23–26 oct; ajusta `S=` y `R=` antes de usarlo.
- `sbfake.js`: "Supabase de mentira" para Playwright: traduce REST (select/eq/is/in/order/limit + embebidos decisiones(*)),
  RPC, Storage (upload/download/remove) y auth a SQL que corre con psql COMO el usuario (RLS real).
- `ui.js` (Fase 5 completa), `inicio.js` (Inicio y Ver como), `pin.js` (PIN temporal), `sesion.js` (Recordarme), `rueda.js`.
  Necesitan supabase-js 2.45.4 y pdf-lib 1.17.1 locales (npm pack) porque jsdelivr está bloqueado en la sesión.
- `prueba010*.sql`: pruebas SQL de bitácoras, Storage y documentos.
- `prueba012.sql`: pruebas SQL de vacaciones (días hábiles, ley, año laboral, préstamo, excepción, descuento al aprobar Laura, -R1, avisos, quién ve qué, pruebas). Corre en transacción y deja todo igual. Debe decir "TODAS LAS PRUEBAS 012 PASARON".
- `vacaciones.js`: navegador, flujo completo de vacaciones (Omar, Karla, Laura, Gaby) en 1366 y 390 px. Necesita la base recién armada + 010, 011, 012 y PINs (también a OPC y KYGS). sbfake.js ahora entiende gte/lte/gt/lt.
