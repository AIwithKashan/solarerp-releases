import { PrismaClient } from '@prisma/client';
import path from 'path';
import sqlite3 from 'sqlite3';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  migrated?: boolean;
};

// Build an absolute path to the SQLite DB file.
// path.join produces backslashes on Windows (E:\foo\bar) which SQLite rejects,
// so we convert to forward-slashes (E:/foo/bar).
const dbFile = path.resolve(process.cwd(), 'server', 'prisma', 'dev.db')
  .split(path.sep)
  .join('/');

const dbUrl = process.env.DATABASE_URL || `file:${dbFile}`;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

if (!globalForPrisma.migrated) {
  globalForPrisma.migrated = true;
  try {
    const rawPath = dbUrl.replace(/^file:/, '').replace(/\?.*$/, '');
    const cleanPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
    const db = new sqlite3.Database(cleanPath);
    db.serialize(() => {
      db.all("PRAGMA table_info(Purchase)", (err, rows: any[]) => {
        if (!err && rows && rows.length > 0 && !rows.some(r => r.name === 'bilti_no')) {
          db.run("ALTER TABLE Purchase ADD COLUMN bilti_no TEXT");
        }
      });
      db.all("PRAGMA table_info(SaleItem)", (err, rows: any[]) => {
        if (!err && rows && rows.length > 0 && !rows.some(r => r.name === 'bilti_no')) {
          db.run("ALTER TABLE SaleItem ADD COLUMN bilti_no TEXT");
        }
      });
    });
    db.close();
  } catch (e) {
    // Non-blocking fallback
  }
}
