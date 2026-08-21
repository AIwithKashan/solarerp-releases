// Standalone offline mode — no authentication needed.
// Every user has their own local database.

export async function getTenantId(): Promise<string> {
  return 'local-user';
}
