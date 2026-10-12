#!/usr/bin/env bash
# Runs every migration plus the database tests against a throwaway database.
# Needs a local Postgres; set PGHOST/PGPORT/PGUSER as usual.
set -euo pipefail
cd "$(dirname "$0")/.."
DB="lifepartner_test_$$"
createdb "$DB"
trap 'dropdb --if-exists "$DB"' EXIT
run() { psql -q -X -v ON_ERROR_STOP=1 -d "$DB" -o /dev/null -f "$1" 2>&1 | sed -E '/^$/d; s/^psql:[^ ]+ //; s/^NOTICE: +//'; }
run tests/db/supabase_stub.sql
for f in supabase/migrations/*.sql; do run "$f"; done
for f in tests/db/*_test.sql; do run "$f"; done
echo "Database tests passed."
