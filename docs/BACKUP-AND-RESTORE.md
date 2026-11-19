# Digital Showroom — backup and restore runbook

## Status and prerequisites

This repository contains a **CLI-only backup script**, not a confirmed scheduled backup service. A backup is not considered operational until it has run on Hostinger, its ZIP has been copied to separate storage, and a **test restoration** has succeeded.

The existing Hostinger daily-backup facility may be available independently. Confirm its retention period and ability to restore both MySQL and files in hPanel.

### Security requirements

- Backups contain Seller email addresses, password hashes and customer/shop records. Treat them as confidential.
- Do not put archives in `public_html`, GitHub, publicly shared links, or email attachments.
- The script deliberately refuses to write into the website root.
- Backups must be downloaded/copy-stored outside the same hosting account using your preferred secure storage. A backup only on the web host is not disaster recovery.
- Use access-restricted storage, encryption and retention suitable for personal information.
- Never run the import over the live database during testing.

## First backup — manual

1. In hPanel, confirm **Files > Backups** can create/restore a backup. Record the latest successful backup and independently save a copy before altering hosting configuration.
2. Confirm PHP CLI and its **pdo_mysql** and **zip** extensions are available on the website's Hostinger plan. The script also needs a writable directory above `public_html`.
3. Find the absolute path to your actual site's `public_html/scripts/backup.php`. Use Hostinger's file manager to confirm it; do not assume a generic home directory.
4. Execute the CLI script as the site user, for example:
   ```sh
   /usr/bin/php /absolute/path/to/public_html/scripts/backup.php
   ```
   If Hostinger does not provide CLI execution or external write access, the script fails safely. In that case rely on a supported Hostinger backup mechanism rather than making archives web-accessible.
5. The script writes `digitalshowroom-YYYYMMDD-HHMMSS-XXXXXXXX.zip` into `showroom-backups` beside the actual website document root by default (or a private path specified by `SHOWROOM_BACKUP_DIR`). The archive contains `database/ds_*.sql`, `uploads/` and `manifest.json`.
6. Verify its manifest counts and that the archive can be opened and read. Then transfer an encrypted copy to independent storage.
7. Retain at least a recent daily series and periodic monthly snapshot according to your retention policy. Do not create automatic deletion until restoration is proven.

## Scheduling

After the **first manual backup and restoration test succeed**, set Hostinger Cron Jobs to run the same absolute PHP CLI command once daily during a low-activity window (for example 02:00 Asia/Kolkata; confirm the server's cron timezone). Validate that the scheduled job actually produced a fresh private archive.

The script does not install or enable a cron job by itself. Hostinger's built-in daily backups and any external backup mechanism should be verified separately.

## Restore rehearsal (staging only)

1. Provision an isolated staging site and **new staging database** with separate credentials; never reuse production credentials.
2. Download a backup ZIP privately and inspect `manifest.json` and the eight SQL exports.
3. Extract into a private workstation or staging-only folder. Import schema and rows into the **empty staging database** in this order:
   `ds_users`, `ds_shops`, `ds_categories`, `ds_products`, `ds_catalogues`, `ds_catalogue_products`, `ds_settings`, `ds_product_images`.
4. Copy `uploads/` into the staging site only; preserve directory structure and verify image files.
5. Check table counts against manifest and sample product images; sign in to **staging** with a dedicated test account. Avoid outbound customer notifications during testing.
6. Record restore date, backup name, row counts, missing images, errors, and time taken. Only declare the backup system **verified** after this succeeds.

### Known limitations

- Database tables are exported using a repeatable-read transaction; images are archived after the database snapshot. Newly changing images could therefore differ slightly from the SQL snapshot.
- Schema changes must be coordinated: this utility currently backs up the eight known `ds_*` tables. Update the table list before introducing new tables.
- It does not yet provide point-in-time recovery, encrypted backups by itself, automated off-host copying, retention cleanup, or an automated restore test.
- Strongly consider Hostinger's own full backups as an additional independent recovery option.
