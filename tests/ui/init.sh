set -e
B=/usr/lib/postgresql/16/bin; D=/var/lib/pgut
pkill -u postgres postgres 2>/dev/null || true; sleep 1
rm -rf $D; mkdir -p $D; chown postgres $D
su postgres -c "$B/initdb -D $D/data -A trust >/dev/null && $B/pg_ctl -D $D/data -o '-p 54329 -k $D' -l $D/log start >/dev/null"
P="psql -h $D -p 54329 -U postgres -q -v ON_ERROR_STOP=1"
$P -c "create database ut" postgres
$P -d ut -f /tmp/claude-0/-home-user-uniterra-permisos/9681fff9-9c5b-57c1-8bcb-1f1b99f005ea/scratchpad/t/supa.sql
$P -d ut -c "create extension pgcrypto with schema extensions"
R=/home/user/uniterra-permisos/sql
for f in 001_fase0_base 003_fase1_catalogos 004_fase1_carga 005_guardar_horario 006_fase2_solicitudes 007_fase3_bandejas 008_fase4_banco 009_rechazo_regresa_horas; do $P -d ut -f $R/$f.sql >/dev/null; done
echo base-ok
