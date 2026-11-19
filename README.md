# Digital Showroom

A multi-seller WhatsApp-first showroom application on Hostinger PHP/MySQL.

## Pages
- `/` — public platform landing page
- `/login.html` — seller login and free registration
- `/admin-login.html` — separate admin-only login (no public admin registration)
- `/admin-setup.html` — protected one-time first Admin creation (requires Actions secret)
- `/dashboard.html` — seller dashboard or admin dashboard according to the authenticated role
- `/your-shop` — friendly public buyer-facing showroom URL; internally rewrites to `shop.html` and reads the shop from MySQL
- `/shop.html?slug=your-shop` — legacy public URL remains supported for existing shares
- `/demo.html` — preserved original Bliss Bites demo
- `/api/health.php` — database health check

## Friendly URL deployment notes

The repository includes a root `.htaccess` for Apache/LiteSpeed rewrite support.
The URL `/bca-momo-wala` serves the existing `shop.html`, which loads the correct shop from MySQL.
Existing files and folders are excluded from rewriting. If the live Hostinger root
already contains custom `.htaccess` directives, merge and retain those directives
before production deployment. Confirm both the new URL and the existing
`/shop.html?slug=bca-momo-wala` URL work.

## Phase 2 — Enquiry Inbox (initial implementation)

- Each public **Send Order on WhatsApp** or **Get Quotation** click first saves an enquiry in MySQL, then opens the prepared WhatsApp message with the enquiry reference.
- Each enquiry records its shop, type, product snapshots, quantities, units, price or On Request, estimated total and creation time. Statuses: New, Follow-up, Completed.
- Seller → Enquiry Inbox shows the most recent 200 enquiries for **that seller's shop only**, with expandable product details and editable status.
- **WhatsApp has no delivery confirmation**: records indicate that the buyer initiated the WhatsApp flow, not that they sent a message. Customer identity is not known automatically and is shown as not provided.
- Public posting requires a session CSRF token; selected products and prices are re-validated against active products for the requested shop. There is a lightweight per-session click limit. Production-grade IP/risk throttling and optional buyer-contact capture remain future improvements.
- Enquiry tables `ds_enquiries` and `ds_enquiry_items` are included in the backup script. Existing products and shops are not modified by this feature.

## Phase 2 — Showroom Analytics

- Seller → Analytics supports Today, Last 7 Days, Last 30 Days and Custom Range (up to 366 days).
- MySQL event table `ds_analytics_events` records showroom visits, on-screen product views and taps on WhatsApp enquiry buttons.
- Visits are counted once per shop and browser session; product views once per product and browser session. WhatsApp clicks count attempts to start a conversation, **not** sent/delivered WhatsApp messages.
- Seller analytics are restricted to their own shop. Shows event totals, total enquiries, top-viewed products, top-enquired products and daily event counts.
- Figures start from deployment of event tracking; historical showroom views cannot be reconstructed. Customer names, mobile numbers and IP addresses are not added to the analytics event table.
- `ds_analytics_events` is included in the existing CLI-only database backup process.

## Functional features
- Seller registration and login with hashed passwords, session authentication and CSRF checks
- One shop per registered seller; public link using a unique slug
- Seller shop profile, categories, products, catalogues and catalogue-product links
- Product images using authenticated JPG/PNG/WebP uploads (max 5 MB) or existing external HTTPS URLs
- Product photo gallery: select multiple images at once, up to 6 per product, automatically compress uploaded product photos, choose the main image and show thumbnails on public shop pages; original product image URLs are preserved
- Photo gallery entries live in `ds_product_images` and are included in `scripts/backup.php`
- Excel-compatible CSV bulk product import under Seller → Products → Import Products: download the template, enter up to 100 products and preview before saving. Save as **CSV UTF-8** from Excel. CSV can include product name, an existing category, price or 'On Request', unit, description, display order, visibility. The import is all-or-nothing, checks quota and duplicate names, and never overwrites existing products. Photos are added later via Edit Product.
- Mobile quick product entry shows photo, name and price first; optional fields appear under More Product Details. Seller → Products → From Gallery lets users select multiple photos and turn each photo into a separate product after reviewing name/category/price. Product allowance and duplicate-name checks apply; creation is transactional. Uploaded media files are retained even if a batch is rejected.
- Dynamic public showroom, quantity selection, WhatsApp order/quotation message
- WhatsApp Status Image Maker: select multiple visible products, choose Classic / Modern / Minimal branded designs, preview each status and download individual 1080 × 1920 PNGs. Images use shop name, colour, logo, WhatsApp contact and product photo when available; generation happens locally in the browser.
- Administrator dashboard: sellers/shops, enable/disable shops and global free product allowance
- PHP creates the initial `ds_*` tables automatically on first API access (database user needs CREATE TABLE permission)

## First administrator setup

New shop registrations create Seller accounts only. You can create a **separate new administrator account** without modifying any Seller account.

1. Generate a high-entropy setup token locally (minimum 32 characters). On Windows PowerShell:
   ```powershell
   $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
   $bytes = New-Object byte[] 32
   $rng.GetBytes($bytes)
   [System.BitConverter]::ToString($bytes).Replace('-', '')
   $rng.Dispose()
   ```
   Keep the token private and do not commit it.
2. GitHub repository → Settings → Secrets and variables → Actions → New repository secret. Name: `ADMIN_SETUP_TOKEN`. Value: generated token.
3. Trigger a **new deployment** after adding the secret (Actions → Deploy Digital Showroom to Hostinger → Run workflow), since old runs do not automatically gain the new secret.
4. Open `https://showroom.bizskilledu.com/admin-setup.html`. Enter the same token, a **new** Admin name/email, and password (minimum 4 characters; a longer password is strongly recommended).
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
- A full media library, native `.xlsx` parsing and bulk creation of separate product records directly from mobile gallery (CSV product import and multiple photos for one product are supported)
- Password reset/email verification, registration throttling and audit logs
- Advanced catalogue PDF/ZIP generation in the new dashboard (the original demo remains at `/demo.html`)
- Order management/payment collection (buyers currently send WhatsApp messages)
