/**
 * CLI Moderation Script for Niruvi Store Community Submissions (Cloudflare Worker + D1)
 *
 * Usage:
 *   ADMIN_TOKEN="<your-secret>" VITE_API_URL="https://niruvi-store-api.<subdomain>.workers.dev" \
 *     npx tsx scripts/admin-submissions.ts list
 *
 *   ADMIN_TOKEN="<your-secret>" VITE_API_URL="https://niruvi-store-api.<subdomain>.workers.dev" \
 *     npx tsx scripts/admin-submissions.ts hide <slug-or-id>
 *
 *   ADMIN_TOKEN="<your-secret>" VITE_API_URL="https://niruvi-store-api.<subdomain>.workers.dev" \
 *     npx tsx scripts/admin-submissions.ts unhide <slug-or-id>
 *
 *   ADMIN_TOKEN="<your-secret>" VITE_API_URL="https://niruvi-store-api.<subdomain>.workers.dev" \
 *     npx tsx scripts/admin-submissions.ts delete <slug-or-id>
 */

function printUsage(): void {
  console.log(`
Niruvi Store — Community Submissions Admin CLI

Environment Variables:
  ADMIN_TOKEN    Worker admin secret token (required; set via wrangler secret put ADMIN_TOKEN)
  VITE_API_URL   Base URL of the deployed Cloudflare Worker (or use API_URL)

Commands:
  list                  List all submissions (published & hidden) and visitor reports
  hide <id-or-slug>     Hide a submission from the public catalog (status = 'hidden')
  unhide <id-or-slug>   Re-publish a hidden submission (status = 'published')
  delete <id-or-slug>   Permanently delete a submission from D1
`);
}

async function run(): Promise<void> {
  const args = process.argv.slice(2);
  const command = (args[0] || '').toLowerCase();
  const target = (args[1] || '').trim();

  if (!command || command === '--help' || command === '-h') {
    printUsage();
    process.exit(0);
  }

  const adminToken = (process.env.ADMIN_TOKEN || '').trim();
  const apiUrl = (
    process.env.VITE_API_URL ||
    process.env.API_URL ||
    'http://127.0.0.1:8787'
  )
    .trim()
    .replace(/\/+$/, '');

  if (!adminToken) {
    console.error('Error: ADMIN_TOKEN environment variable is required.');
    process.exit(1);
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  };

  if (command === 'list') {
    const res = await fetch(`${apiUrl}/api/admin/submissions`, {
      method: 'GET',
      headers,
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, any>;
    if (!res.ok) {
      console.error(`HTTP ${res.status}:`, data.error || 'Failed to list submissions.');
      process.exit(1);
    }

    const submissions = Array.isArray(data.submissions) ? data.submissions : [];
    const reports = Array.isArray(data.reports) ? data.reports : [];

    console.log(`\n=== Community Submissions (${submissions.length}) ===`);
    for (const sub of submissions) {
      console.log(
        `- [${sub.status.toUpperCase()}] ${sub.name} (slug: ${sub.slug}, id: ${sub.id}) v${sub.version} [${sub.architecture}] -> ${sub.download_url}`
      );
    }

    console.log(`\n=== Visitor Reports (${reports.length}) ===`);
    for (const rep of reports) {
      console.log(`- [${rep.created_at}] slug=${rep.app_slug} | ${rep.reason}: ${rep.details}`);
    }
    return;
  }

  if (command === 'hide' || command === 'unhide' || command === 'publish') {
    if (!target) {
      console.error(`Error: Missing submission <id-or-slug> for '${command}'.`);
      process.exit(1);
    }
    const status = command === 'hide' ? 'hidden' : 'published';
    const res = await fetch(`${apiUrl}/api/admin/hide`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ id: target, status }),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, any>;
    if (!res.ok) {
      console.error(`HTTP ${res.status}:`, data.error || 'Failed to update status.');
      process.exit(1);
    }
    console.log(`Updated "${target}" -> status: ${status}`);
    return;
  }

  if (command === 'delete') {
    if (!target) {
      console.error("Error: Missing submission <id-or-slug> for 'delete'.");
      process.exit(1);
    }
    const res = await fetch(`${apiUrl}/api/admin/delete`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ id: target }),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, any>;
    if (!res.ok) {
      console.error(`HTTP ${res.status}:`, data.error || 'Failed to delete submission.');
      process.exit(1);
    }
    console.log(`Deleted submission "${target}".`);
    return;
  }

  console.error(`Unknown command: ${command}`);
  printUsage();
  process.exit(1);
}

run().catch((err) => {
  console.error('Fatal error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
