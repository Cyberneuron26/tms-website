# School public website — Next.js / Google Sheets / Vercel

A responsive public school website, with school information, teacher and opt-in student directories, announcements, and events. **The student directory is OFF by default.** The sample/demo contains fictional records.

## 1. Architecture and technology decisions

- Next.js 16 App Router + TypeScript + React 19, Tailwind CSS 4 and Lucide icons.
- Server-only Google Sheets API credentials, a single `batchGet` for all six worksheets, Zod record validation.
- Persistent Next.js cached data (`unstable_cache`) refreshed automatically at most 5 minutes after expiration on next access, or invalidated through a secret-protected webhook. This version uses the supported legacy caching interface for compatibility; a migration to cache components may be considered when moving to that mode.
- Editing Google Sheets changes **content**; updating application code or environment configuration requires Vercel **deployment**. Apps Script trigger initiates content cache invalidation, not a deployment.
- No backend database or school-user login is required for this initial public informational site. Google Sheets sharing controls editing.

### Data flow

School administrator → Google Sheets → Google Sheets API (service-account read-only) → Next.js server-side fetch / Zod validation → Vercel cache → public pages.

An Apps Script installable edit trigger → `POST /api/revalidate` with secret header → invalidates `school-content` cache tag → next requests refresh. Independently, Next.js cache expires after 300 seconds. Cached content may remain briefly visible during background refresh, so **do not use Sheets alone for emergency takedown of private information**; urgently disable publication at the application level and invalidate/purge cache.

## 2. Google Sheets workbook design

Create one Google spreadsheet with six tabs named exactly: `SchoolInfo`, `SiteSettings`, `Students`, `Teachers`, `Notifications`, `Events`. Import the respective CSV files under `sample-sheets/` (File → Import → Upload → Replace current sheet). Row 1 must contain headers exactly as in CSV. Row 2 is a fictional example.

- **SchoolInfo**: `field`, `value`: key/value metadata (name, tagline, address, phone, email, principal, about, academics, facilities, faq, logo_url).
- **SiteSettings**: `field`, `value`: `public_student_directory` is `FALSE` unless approved publication is intended; optional `social_url`.
- **Students**: `student_id` (unique, required), `display_name` (approved display only, required), `class`, `section`, `academic_year`, `photo_url` (HTTPS URL or blank), `is_public` (TRUE/FALSE), `updated_at`. Publication requires both directory setting `TRUE` and record `is_public=TRUE`.
- **Teachers**: `teacher_id` (unique), `name` (required), `designation`, `subjects`, `classes`, `biography`, `photo_url`, `official_contact`, `is_public`, `updated_at`.
- **Notifications**: `notification_id` (unique), `title` (required), `message`, `category`, `publish_date` (YYYY-MM-DD), `expiry_date` (YYYY-MM-DD or blank), `attachment_url` (HTTPS or blank), `is_pinned`, `status` (`published` for display), `updated_at`. Only current published notices appear.
- **Events**: `event_id` (unique), `title` (required), `description`, `start_date` (YYYY-MM-DD), `end_date` (YYYY-MM-DD), `location`, `status` (`published` for display). Upcoming events only.

Sheet values are read as formatted strings. To avoid ambiguous date formatting, set date columns to **Plain text** and type ISO dates. TRUE/FALSE can be data-validated dropdowns. IDs must remain unique. Delete a row to remove an item; set `is_public=FALSE` or `status=draft` to unpublish it. Invalid rows, including duplicate IDs, are skipped and warnings are logged server-side. Missing optional fields default to blank. URLs must be HTTPS when present.

The front end deliberately does **not** render student photo URLs, student internal IDs, or any private student data; keep sensitive attributes entirely out of public Sheets. Restrict spreadsheet access and obtain school authorization and appropriate parental consent as required by applicable laws before enabling student directory.

## 3. Google Cloud setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/), create/select a project, then enable **Google Sheets API** under APIs & Services → Library.
2. IAM & Admin → Service Accounts → Create Service Account; use a descriptive name, and do **not** grant it broad Google Cloud project roles.
3. Create a JSON key for the service account only if your project policy permits it; download it to a secure local location, never the repository. If your organization prohibits long-lived keys, use an approved workload identity solution instead (requires separate setup).
4. Create the workbook and tabs above. Share the workbook with the service-account `client_email` as **Viewer** (least privilege).
5. Copy spreadsheet ID from `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`.
6. Configure `GOOGLE_SPREADSHEET_ID`, `GOOGLE_CLIENT_EMAIL`, and `GOOGLE_PRIVATE_KEY` in `.env.local`. For `GOOGLE_PRIVATE_KEY`, replace real line breaks with the literal `\n` sequences when storing as a single-line environment value. Never use `NEXT_PUBLIC_` prefix for secrets.
7. Start the app and confirm that edits appear after cache refresh or the optional trigger.

## 4. Local development on Windows/WSL2 Ubuntu

```bash
# Open Ubuntu through WSL2, work in ~/projects (not /mnt/c for best file-watching performance)
mkdir -p ~/projects
cd ~/projects
unzip /path/to/school-site.zip -d school-site
cd school-site
# Install a supported current Node.js LTS via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install --lts
nvm use --lts
npm install
cp .env.example .env.local
# For preview, leave DEMO_MODE=true. For real Google Sheets, set DEMO_MODE=false and credentials.
npm run dev
# Open http://localhost:3000
npm run typecheck
npm run lint
npm test
npm run build
```

The source is contained in `src/app` (routes), `src/components` (UI), `src/lib` (Google API, parsing, demo), `scripts/on-edit.gs`, `sample-sheets/*.csv`, and `tests`.

## 5. GitHub

```bash
git init
git add .
git diff --cached --stat
git commit -m 'Initial school website'
git branch -M main
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPO.git
git push -u origin main
```

Create an empty private GitHub repository first, and authenticate with GitHub CLI or a credential manager. `.gitignore` excludes `.env*` and keys. Review every pull request and use a protected `main` branch.

## 6. Vercel deployment

1. Create Vercel account; connect GitHub and select **Add New → Project → Import repository**.
2. Framework should auto-detect Next.js; keep project root, `npm run build`, and default output settings.
3. In Vercel Project → Settings → Environment Variables add `GOOGLE_SPREADSHEET_ID`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `REVALIDATE_SECRET` (generate at least 32 random bytes), `DEMO_MODE=false`, and `NEXT_PUBLIC_SITE_URL=https://your-domain.example` for Production. Set separate Preview credentials or demo mode for preview builds.
4. Deploy. Check Vercel build/runtime logs, load homepage, teacher, student, notifications, events, and contact routes. Verify demo mode is disabled before production launch.
5. To attach custom domain, Project → Settings → Domains → Add; configure DNS records exactly as Vercel instructs, then verify TLS.
6. Observe function invocations, Google API quota, server-side validation warnings and deployment errors. Avoid logging spreadsheet data or credentials.

## 7. Automatic updates — recommended Apps Script

1. Open the workbook → Extensions → Apps Script. Copy `scripts/on-edit.gs`.
2. Project Settings → Script properties: `SITE_URL=https://your-production-domain` and `REVALIDATE_SECRET` exactly matching Vercel.
3. Triggers → Add Trigger → function `onSchoolSheetEdit` → Event source **From spreadsheet** → Event type **On edit**, then authorize it. **Installable** triggers are required for `UrlFetchApp`; do not rely on a simple trigger.
4. Edit a teacher biography or add an announcement. Verify the next page loads the revised records. Cache invalidation with `revalidateTag(..., 'max')` can briefly serve stale content while refreshing, and isn't an instantaneous hard purge.
5. Apps Script's on-edit triggers **do not run for all API/formula-driven changes**. For external integrations, use a time-driven Apps Script trigger as an additional periodic invalidation, or rely on the 5-minute cache TTL. The trigger can be rate-limited by Google quota; check Apps Script Executions.
6. Webhook example:

```bash
curl -X POST https://your-domain.example/api/revalidate -H 'x-revalidate-secret: YOUR_SECRET'
```

Do not expose secrets in client code, spreadsheets, logs, or Git. A Vercel deployment hook is not needed for content edits, and redeploying on each edit wastes build resources.

## 8. Testing & acceptance criteria

- Homepage, navigation, responsive layout, contact, information, teacher, student, events and notices pages render.
- Student directory stays closed until `public_student_directory=TRUE`; individual student rows also require `is_public=TRUE`.
- Search and filter work in public directories; pagination is 9 items/page.
- Published notifications respect start/expiry dates; pinned notices sort first.
- Invalid input rows and duplicate identifiers do not crash parsing; warnings logged. Invalid URL schemes are rejected.
- Update/add/remove Sheet rows; check pages on the next refresh; test with valid and invalid webhook secret.
- Confirm server-only service-account credentials do not appear in browser HTML, JS bundles or network calls.
- Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` before production deployment.

## 9. Security/privacy checklist

- Service-account **Viewer** sharing on a private workbook; API scope `spreadsheets.readonly`.
- No private student attributes in the worksheet. Obtain written school authorization/parental consent where required.
- Strong secret for webhook; comparisons performed using constant-time function and only POST allowed.
- Automatic JSX escaping, schema validation and HTTPS URL checks. No arbitrary HTML or spreadsheet-formula evaluation.
- No public editing endpoints or admin accounts; manage permissions in Google Workspace.
- Make a data retention policy, child-safety approval workflow, incident response plan and access review before go-live.
- This starter does not implement custom CSP, rate limiting, per-administrator audit logs, or a legally vetted privacy policy: add them for institutional production use.

## 10. Troubleshooting

| Symptom | Check |
| --- | --- |
| Site shows demo records | Set `DEMO_MODE=false` and redeploy/restart. |
| 403 from Sheets API | Enable API, check spreadsheet Viewer sharing, service-account email and project restrictions. |
| Invalid private key | Preserve BEGIN/END lines and `\n` escape sequences in env configuration. |
| 404 from Sheets | Confirm spreadsheet ID and six exact tab names. |
| Empty directory | Verify published/visible flags, header spellings, unique IDs and valid data. |
| Old content after edit | Trigger authorization, Apps Script logs, webhook secret and 300-second automatic refresh. |
| Build failure | Run `npm install`, check Node LTS, inspect TypeScript and Vercel logs. |
| API quota exceeded | Batch reads, keep caching, reduce unnecessary trigger invocations. |

## 11. Recurring costs (indicative, not binding)

For a small school with moderate traffic, Vercel Hobby may suffice **only if its permitted-use terms fit your institution**; otherwise use an eligible paid plan. Google Sheets API typically has no separate charge within standard quotas, but limits and pricing can change. A custom domain generally costs around USD 10–25/year, depending on TLD and registrar; hosting, images, email and paid observability may add cost. Confirm current Vercel pricing, usage quotas, and Google quotas before purchasing. Production ownership also requires budgeting for maintenance, accessibility testing, data protection compliance, backups and support.

## 12. Important limitations

The included sample is for demonstration and has **not** been deployed on your Vercel account (you must provide cloud accounts/credentials). The project uses demo content for the preview and only reads live Sheets after credentials are set. Image/photo URLs are validated but intentionally not rendered; implement consent-aware media handling and approved image domains before adding photographs. Calendar is shown as an events listing, not an interactive calendar. There is no authenticated parent/student portal; this is a public information website.
