import { PrismaClient } from '@prisma/client';

// Single shared Prisma client. `prisma[modelName]` gives us the same generic
// entity-store shape Base44's SDK exposed (base44.entities.<Name>.*), which is
// what the RLS engine and the generic entities router key off of.
export const prisma = new PrismaClient();

export type PrismaModelDelegate = {
  findMany: (args?: any) => Promise<any[]>;
  findUnique: (args: any) => Promise<any>;
  create: (args: any) => Promise<any>;
  update: (args: any) => Promise<any>;
  delete: (args: any) => Promise<any>;
  count: (args?: any) => Promise<number>;
};

/** Resolve `prisma.<entityName>` the same way Prisma lower-cases model accessors. */
export function getModelDelegate(entityName: string): PrismaModelDelegate | null {
  const accessor = entityName.charAt(0).toLowerCase() + entityName.slice(1);
  const delegate = (prisma as any)[accessor];
  return delegate ?? null;
}
