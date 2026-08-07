# Supabase manual logical backup (Windows)

Project: `qujssmtdzmzsfrgtaitj`  
Environment: Production

Do not run `supabase/launch_bundle.sql` until the dump is created, verified,
and restored successfully into a separate test project.

## Why the automated backup was not created

The connected Supabase tool can execute SQL and inspect the catalog, but it
does not expose a database backup/export operation. The current execution
environment also has no `pg_dump` binary, no database connection URI, and no
database password. Application publishable/service keys are not a substitute
for the Postgres database password.

This does **not** prove that the project is on the Free plan or that Supabase
scheduled backups are unavailable. Check **Database > Backups** in the
Supabase dashboard for plan-managed backups. A logical dump still requires a
Postgres connection string and database password.

## 1. Install PostgreSQL client tools

Install PostgreSQL 17 for Windows from:

`https://www.postgresql.org/download/windows/`

Add this folder to `PATH` (adjust the version if needed):

```text
C:\Program Files\PostgreSQL\17\bin
```

Verify:

```powershell
pg_dump --version
pg_restore --version
```

## 2. Get the connection string safely

In Supabase:

1. Open project `qujssmtdzmzsfrgtaitj`.
2. Click **Connect**.
3. Select **Session pooler** (recommended for IPv4 networks) or **Direct
   connection** when IPv6/direct access is available.
4. Copy the URI and replace `[YOUR-PASSWORD]` locally with the database
   password.

Do not paste the password into GitHub, chat, screenshots, logs, or source
files. Prefer an environment variable so the password is not stored in shell
history:

```powershell
$env:PGPASSWORD = Read-Host "Supabase database password" -MaskInput
```

## 3. Create the full logical dump

Use the Session pooler host shown by the project's **Connect** dialog:

```powershell
pg_dump --host="[SESSION-POOLER-HOST]" --port=5432 --username="postgres.qujssmtdzmzsfrgtaitj" --dbname="postgres" --format=custom --blobs --verbose --file="souqly-production-before-pr12.dump"
```

`pg_dump` reads the password from `PGPASSWORD`. No secret appears in the
command. Clear it when finished:

```powershell
Remove-Item Env:PGPASSWORD
```

The custom-format dump includes schema and database data, including RLS
policies, functions, triggers, and Auth/Storage database metadata accessible
to the database role. Supabase Storage object bytes themselves are stored
outside Postgres and need a separate Storage export if disaster recovery must
also preserve every uploaded file.

## 4. Verify the dump file

Confirm the file exists and is not empty:

```powershell
Get-Item ".\souqly-production-before-pr12.dump" | Select-Object FullName,Length,LastWriteTime
```

Verify that `pg_restore` can read its catalog:

```powershell
pg_restore --list ".\souqly-production-before-pr12.dump" | Out-File ".\souqly-production-before-pr12.contents.txt"
if ($LASTEXITCODE -ne 0) { throw "Backup catalog verification failed" }
```

Create a checksum and store it beside the dump:

```powershell
Get-FileHash ".\souqly-production-before-pr12.dump" -Algorithm SHA256 | Format-List | Out-File ".\souqly-production-before-pr12.sha256.txt"
```

## 5. Restore only into a separate test project

Create a new, empty Supabase test project. Obtain its Session pooler values
from that project's **Connect** dialog. Never use the production host below.

```powershell
$env:PGPASSWORD = Read-Host "TEST project database password" -MaskInput
pg_restore --host="[TEST-SESSION-POOLER-HOST]" --port=5432 --username="postgres.[TEST-PROJECT-REF]" --dbname="postgres" --clean --if-exists --no-owner --no-privileges --exit-on-error --verbose ".\souqly-production-before-pr12.dump"
Remove-Item Env:PGPASSWORD
```

`--clean` is intentionally allowed only against the new disposable **test**
project. Never use that restore command against Production.

After restoration, run:

```powershell
psql --host="[TEST-SESSION-POOLER-HOST]" --port=5432 --username="postgres.[TEST-PROJECT-REF]" --dbname="postgres" --file="supabase\preflight_production.sql"
```

Keep the dump, catalog listing, and SHA-256 checksum in encrypted storage with
restricted access. Do not commit any of them to Git.
