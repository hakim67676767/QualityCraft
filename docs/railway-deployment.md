# Deploying QualityCraft to Railway

This repository builds one web service containing the React production build and the Express API. MySQL is a separate service in the same Railway project. Use a new hosted database; local accounts and student records are not uploaded with the code.

## 1. Create the project and database

Sign in to Railway with GitHub. Create an empty project named **QualityCraft**, then add a **MySQL** service through **New**. Wait for the database to become available. Keep its volume attached so data persists across restarts.

The application's production checks require a dedicated database account, rather than MySQL root. An operator must create that account before starting the web service. In a MySQL client connected to this new Railway database as its administrator, run the following after replacing the example database name with the service's `MYSQLDATABASE` and choosing a private, random password:

```sql
CREATE USER 'qualitycraft_app'@'%' IDENTIFIED BY 'YOUR_PRIVATE_RANDOM_DATABASE_PASSWORD';
GRANT ALL PRIVILEGES ON `railway`.* TO 'qualitycraft_app'@'%';
```

The grant is confined to that application database, with no global administrative privileges or grant option. It includes schema permissions needed by setup and migrations. Database names in backticks are SQL identifiers; use the exact database created by the service. Do not change or overwrite an existing user's password as part of this command. Keep the chosen password in Railway's private variables, not in source files or chat.

Railway's **Copy SSH Command** for the MySQL service can be used by an authorised operator to open its shell, then run `mysql --user=root --password` and enter the database administrator password at the prompt. This reaches the database internally without requiring a permanent public database endpoint. Refer to the current Railway CLI instructions if SSH is unavailable on your account.

## 2. Connect the GitHub repository

In the same Railway project, add a service from the GitHub repository `hakim67676767/QualityCraft`, branch `main`. Grant Railway access to that private repository when GitHub asks.

Keep the **Root Directory** at the repository root. Do not set it to `backend` or `frontend`: the Dockerfile needs both. Railway detects the root `Dockerfile`. It builds the frontend using Node 24, installs the production backend dependencies, and runs the app as the unprivileged Node container user. The image build context allows only application inputs and excludes local environment files, dependency folders, Git metadata, and QA/browser artifacts.

An automatic deployment before variables are configured may fail its production configuration checks. Complete the following settings, then redeploy.

## 3. Set private service variables

In the **QualityCraft web service**, add these variables. The references below assume the database service is named exactly **MySQL**; change the service name in references if necessary.

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` (also set in the image) |
| `DB_HOST` | `${{MySQL.MYSQLHOST}}` |
| `DB_PORT` | `${{MySQL.MYSQLPORT}}` |
| `DB_NAME` | `${{MySQL.MYSQLDATABASE}}` |
| `DB_USER` | `qualitycraft_app` |
| `DB_PASSWORD` | The private password for that dedicated account |
| `JWT_SECRET` | A newly generated random secret, at least 32 bytes |
| `CORS_ORIGIN` | The final HTTPS web-service URL, without a trailing slash |

Let Railway provide `PORT`. Leave `VITE_API_URL` unset because frontend and API use the same origin. Do not reference the MySQL template's default username/password for the runtime app when those credentials belong to root.

Generate a fresh session secret on your own machine with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Paste the result directly into the private `JWT_SECRET` variable. Keep it stable across redeploys; changing it signs out existing sessions.

## 4. Configure build and deployment

| Setting | First deployment | Later deployments |
| --- | --- | --- |
| Build | Root Dockerfile; no custom build command | Same |
| Start command | Use Dockerfile default (`node server.js`) | Same |
| Pre-deploy command | `npm run setup` | `npm run migrate` |
| Healthcheck path | `/api/ready` | Same |
| Healthcheck timeout | 120 seconds | Same |
| Replicas | 1 for the initial deployment | Increase only after reviewing migration and session/rate-limit behaviour |

Commands run in `/app/backend`, the image's working directory. Setup creates the tables, course, roles, and migrations in the already-created application database. The migration command applies updates without re-seeding a running study. Take a private full backup before future database changes.

The readiness endpoint returns 200 only when the database connection and a migrated settings table can be queried; otherwise it returns a generic 503. `/api/health` remains a separate process liveness endpoint. A healthcheck does not replace functional verification.

Under Networking, generate a Railway domain and set `CORS_ORIGIN` to its HTTPS URL. Production session cookies require HTTPS. Redeploy with the completed variables/settings.

## 5. Create the live administrator

In the web service, temporarily configure `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` (12 or more characters, unique to this deployment). Open its authorised Railway SSH shell using the dashboard's **Copy SSH Command**, then run:

```bash
npm run admin:create
```

The command refuses to overwrite an existing account. Remove the temporary `ADMIN_*` variables after creation. Sign in through the HTTPS website as Administrator, then create teacher accounts through **Manage users**. The new database contains no local demo administrator or student passwords.

## 6. Verify before inviting students

- Check `/api/ready` returns `{"status":"ready"}` and the sign-in page loads all assets.
- Check administrator sign-in, content preview, classes, research settings, and CSV exports.
- Create a trial teacher/student, assign an activity, and verify that the student sees the assignment and teacher feedback.
- Complete the pre-survey, a learning module and quiz, check progress/reload/logout, and verify the post-survey completion gate.
- Enable private database backups, confirm the restoration procedure, and set spending limits appropriate to the selected Railway plan.
- Switch the web service's pre-deploy command to `npm run migrate` after the first successful installation.

## Verification status

Local frontend build, backend tests, and the isolated MySQL setup/migration/readiness tests have been checked. The Docker image still needs its first actual Railway build: Docker is not installed in the local workspace. No Railway service, billing plan, public domain, or database has been created by the agent as part of preparing these files. Validate the hosted build, credentials, HTTPS sessions, backups, and workflows on the live project.

Official references: [Docker builds](https://docs.railway.com/builds/dockerfiles), [MySQL](https://docs.railway.com/databases/mysql), [pre-deploy commands](https://docs.railway.com/deployments/pre-deploy-command), [SSH](https://docs.railway.com/cli/ssh), and [Node release status](https://nodejs.org/en/about/previous-releases).
