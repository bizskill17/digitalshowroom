# Digital Showroom

A multi-seller WhatsApp-first showroom application on Hostinger PHP/MySQL.

## Pages
- `/` — public platform landing page
- `/login.html` — seller login and free registration
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

## First administrator setup (manual and secure)
Registration creates **seller accounts only**. There is no publicly accessible admin signup.

1. Register your account at `/login.html?register=1`.
2. In Hostinger phpMyAdmin, select the dedicated Digital Showroom database.
3. Find your registered email in `ds_users` and confirm it belongs to you.
4. Run the SQL below, replacing the placeholder with **your own email address**:

```sql
UPDATE ds_users
SET role = 'admin'
WHERE email = 'YOUR_EMAIL@example.com' AND role = 'seller';
```

5. Sign out and log back in, then open `/dashboard.html` to view the admin dashboard.

For production, restrict database privileges, apply stronger registration abuse protection, add email verification/password reset, rate limiting, and audit records.

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
