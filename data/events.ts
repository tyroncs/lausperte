// Event and edition data — reads from Neon database via lib/db.ts
// This module is server-only (imported by server components and API routes)

import { getEvents, getEditions, type DbEdition } from '@/lib/db';

export interface Edition {
  id: string;
  eventName: string;
  label: string;
  location: string;
  year: number;
  logo: string;
  flag?: string;
}

export interface Event {
  code: string;
  name: string;
  editions: Edition[];
}

function dbEditionToEdition(dbEd: DbEdition, eventName: string): Edition {
  return {
    id: dbEd.id,
    eventName,
    label: dbEd.label,
    location: dbEd.location,
    year: dbEd.year,
    logo: dbEd.logo,
    flag: dbEd.flag,
  };
}

export async function getAllEditions(): Promise<Edition[]> {
  const dbEvents = await getEvents();
  const dbEditions = await getEditions();
  const eventNameMap = new Map(dbEvents.map(e => [e.code, e.name]));
  return dbEditions.map(ed => dbEditionToEdition(ed, eventNameMap.get(ed.eventCode) ?? ed.eventCode));
}

export async function getEditionById(id: string): Promise<Edition | undefined> {
  const all = await getAllEditions();
  return all.find(edition => edition.id === id);
}

export async function getEditionsForEvent(eventCode: string): Promise<Edition[]> {
  const dbEvents = await getEvents();
  const dbEditions = await getEditions();
  const event = dbEvents.find(e => e.code === eventCode);
  if (!event) return [];
  return dbEditions
    .filter(ed => ed.eventCode === eventCode)
    .map(ed => dbEditionToEdition(ed, event.name));
}
