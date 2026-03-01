// Maps edition IDs to their logo image paths — reads from database

import { getEditions } from '@/lib/db';

export async function getEditionLogo(editionId: string): Promise<string | undefined> {
  const editions = await getEditions();
  const edition = editions.find(e => e.id === editionId);
  return edition?.logo || undefined;
}
