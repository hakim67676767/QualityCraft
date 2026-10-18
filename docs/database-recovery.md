# Database backup and recovery

The administrator's **Export configuration** button downloads learning content and settings. It does not contain accounts or individual study records and cannot recover the system.

Use the full database backup command from `backend` before a study and regularly during collection:

```powershell
node scripts/database-backup.js backup C:\secure-backups\qualitycraft-study-2026-10-16.json
```

Choose an existing private backup directory. The command refuses to overwrite an existing file. The database credentials come from the existing backend environment. The backup reads a consistent database snapshot; do not run schema migrations while it is running.

Full backups contain account password hashes, participant identities and consent, assessment attempts, submissions, survey responses, classes, assignments, settings, and audit records. Store them privately outside source control and research exports, using restricted access and encrypted storage.

Restore only a trusted backup created by this installation. A backup contains SQL table definitions, so it must not come from an untrusted source.

```powershell
node scripts/database-backup.js restore C:\secure-backups\qualitycraft-study-2026-10-16.json qualitycraft_recovered
```

The restore command creates a new database and refuses an existing target, including the current configured database. It never deletes or overwrites the running database. If restore fails, leave the source backup intact and inspect the separate recovery database before retrying with another new target.

After restoration, compare row counts for users, research participants, assessment attempts, activity submissions, and suitability responses. Start a separate backend configured for the recovered database and verify account access and research results. Only after verification should an operator switch the running backend's `DB_NAME` and restart it.

The automated database smoke test backs up its temporary test database, restores into a second temporary database, verifies every table's row count and selected consent/feedback records, and confirms that an existing target cannot be overwritten. It does not restore into the real application database.
