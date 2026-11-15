import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import postgres from 'postgres';

const DEFAULT_BACKUP_ROOT = 'C:\\DealScapeBackups';
const CURSOR_BATCH_SIZE = 500;

/**
 * Load DATABASE_URL from process.env or the local .env file without extra dependencies.
 */
function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error('DATABASE_URL is not set and .env was not found.');
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    if (key === 'DATABASE_URL') {
      let value = trimmed.slice(eqIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      return value;
    }
  }

  throw new Error('DATABASE_URL not found in .env.');
}

function formatTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function dumpTable(sql, schema, table, outDir) {
  const fileName = `${schema}.${table}.jsonl.gz`;
  const filePath = path.join(outDir, fileName);
  let rowCount = 0;

  async function* generateJsonLines() {
    const cursor = sql`SELECT * FROM ${sql(schema)}.${sql(table)}`.cursor(CURSOR_BATCH_SIZE);
    for await (const rows of cursor) {
      for (const row of rows) {
        rowCount += 1;
        yield `${JSON.stringify(row)}\n`;
      }
    }
  }

  await pipeline(
    Readable.from(generateJsonLines()),
    zlib.createGzip({ level: 6 }),
    fs.createWriteStream(filePath)
  );

  const stats = fs.statSync(filePath);
  return { schema, table, file: fileName, rows: rowCount, bytes: stats.size };
}

async function main() {
  const databaseUrl = loadDatabaseUrl();
  const backupRoot = process.env.BACKUP_DIR || DEFAULT_BACKUP_ROOT;
  const stamp = formatTimestamp();
  const outDir = path.join(backupRoot, `dealscape_${stamp}`);
  fs.mkdirSync(outDir, { recursive: true });

  const sql = postgres(databaseUrl, {
    ssl: 'require',
    max: 1,
    connection: {
      default_transaction_read_only: 'on',
    },
  });

  console.log(`Starting read-only backup to ${outDir}...`);

  try {
    const tables = await sql`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_type = 'BASE TABLE'
        AND (
          table_schema = 'public'
          OR (table_schema = 'auth' AND table_name IN ('users', 'identities'))
        )
      ORDER BY table_schema, table_name
    `;

    const manifest = {
      created_at: new Date().toISOString(),
      backup_dir: outDir,
      tables: [],
    };

    let totalRows = 0;
    let totalBytes = 0;

    for (const { table_schema: schema, table_name: table } of tables) {
      const entry = await dumpTable(sql, schema, table, outDir);
      manifest.tables.push(entry);
      totalRows += entry.rows;
      totalBytes += entry.bytes;
      console.log(`  ✓ ${schema}.${table}: ${entry.rows} rows (${formatBytes(entry.bytes)})`);
    }

    manifest.total_rows = totalRows;
    manifest.total_bytes = totalBytes;

    fs.writeFileSync(
      path.join(outDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    );

    console.log('');
    console.log(`Backup complete: ${manifest.tables.length} tables, ${totalRows} total rows, ${formatBytes(totalBytes)} compressed.`);
    console.log(`Saved to: ${outDir}`);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error('Backup failed:', err.message || err);
  process.exit(1);
});
