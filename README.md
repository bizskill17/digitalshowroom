# Digital Showroom

A multi-seller WhatsApp-first showroom application on Hostinger PHP/MySQL.

## Pages
- `/` — public platform landing page
- `/login.html` — seller login and free registration
- `/admin-login.html` — separate admin-only login (no public admin registration)
- `/admin-setup.html` — protected one-time first Admin creation (requires Actions secret)
- `/dashboard.html` — seller dashboard or admin dashboard according to the authenticated role
- `/shop.html?slug=your-shop` — dynamic public buyer-facing showroom
- `/demo.html` — preserved original Bliss Bites demo
- `/api/health.php` — database health check

## Functional features
- Seller registration and login with hashed passwords, session authentication and CSRF checks
- One shop per registered seller; public link using a unique slug
- Seller shop profile, categories, products, catalogues and catalogue-product links
- Product images using authenticated JPG/PNG/WebP uploads (max 5 MB) or external HTTPS URLs
- Dynamic public showroom, quantity selection, WhatsApp order/quotation message
- Basic canvas-based product status image generation
- Administrator dashboard: sellers/shops, enable/disable shops and global free product allowance
- PHP creates the initial `ds_*` tables automatically on first API access (database user needs CREATE TABLE permission)

## First administrator setup

New shop registrations create Seller accounts only. You can create a **separate new administrator account** without modifying any Seller account.

1. Generate a high-entropy setup token locally (minimum 32 characters). On Windows PowerShell:
   ```powershell
   -join ((1..64) | ForEach-Object { '0123456789abcdef'[(Get-Random -Maximum 16)] })
   ```
   Keep the token private and do not commit it.
2. GitHub repository → Settings → Secrets and variables → Actions → New repository secret. Name: `ADMIN_SETUP_TOKEN`. Value: generated token.
3. Trigger a **new deployment** after adding the secret (Actions → Deploy Digital Showroom to Hostinger → Run workflow), since old runs do not automatically gain the new secret.
4. Open `https://showroom.bizskilledu.com/admin-setup.html`. Enter the same token, a **new** Admin name/email, and strong password (at least 12 characters).
5. The application creates a separate `ds_users` row with role `admin`, without creating or modifying a shop. It checks for existing admins while holding a database lock, and **closes setup** once an Admin account exists.
6. Use `/admin-login.html` to sign in. Seller login stays separate.

The setup token is stored only in GitHub Secrets. The deployment hashes it and writes the hash to an access-restricted server-side PHP configuration file. The setup page cannot create an administrator until the token has been configured. The web form does not display or reveal the token.

If you already have an Admin account, the setup page cannot create another one. Additional administrators require a separate authenticated Admin management workflow.

## Hosting / deployment
- GitHub Actions deploys over FTPS to the site's actual `public_html` root.
- Database secrets are provided by GitHub Actions and written to `showroom-private/db-config.php`; the directory is protected with `.htaccess`.
- The public `api/db.php` helper reads that private config.
- Do not commit credentials or upload the private configuration into public assets.
- A proper certificate-matching FTPS hostname should replace the temporary relaxed hostname verification.
- Database contents and uploads should be backed up separately; deployment does not provide database backups.

## Not implemented yet
- Razorpay payments, paid subscription activation/renewals and per-shop plan limits
- Multiple images per product and a full media library (single-image uploads now supported)
- Password reset/email verification, registration throttling and audit logs
- Advanced catalogue PDF/ZIP generation in the new dashboard (the original demo remains at `/demo.html`)
- Order management/payment collection (buyers currently send WhatsApp messages)
