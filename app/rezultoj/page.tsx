import { getAllEditions } from '@/data/events';
import RezultojClient from './RezultojClient';

export default async function RezultojPage() {
  const editions = (await getAllEditions()).map(ed => ({
    id: ed.id,
    eventName: ed.eventName,
    label: ed.label,
    location: ed.location,
    year: ed.year,
    logo: ed.logo,
    flag: ed.flag,
  }));

  return <RezultojClient editions={editions} />;
}
