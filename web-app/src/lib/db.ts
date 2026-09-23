import { PrismaClient } from '@prisma/client';
import path from 'path';

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
