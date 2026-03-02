const db = require('./data/database.json');

const seedEvents = ['IJK', 'JES', 'IJF', 'RENKEJ', 'UK', 'FESTO'];
const seedEditionIds = ['ijk-2015','ijk-2016','ijk-2017','ijk-2018','ijk-2019','ijk-2022','ijk-2023','ijk-2024','ijk-2025','jes-2015','jes-2016','jes-2017','jes-2018','jes-2019','jes-2022','jes-2023','jes-2024','jes-2025','ijf-2015','ijf-2016','ijf-2017','ijf-2018','ijf-2019','ijf-2022','ijf-2023','ijf-2024','renkej-2023','renkej-2024','renkej-2025','uk-2015','uk-2016','uk-2017','uk-2018','uk-2019','uk-2022','uk-2023','uk-2024','uk-2025','festo-2025'];

const q = s => s.replace(/'/g, "''");

const newEvents = db.events.filter(e => !seedEvents.includes(e.code));
const newEditions = db.editions.filter(e => !seedEditionIds.includes(e.id));
const pri = db.settings.priPageContent;

let sql = '';

sql += '-- New events\n';
sql += 'INSERT INTO events (code, name) VALUES\n';
sql += newEvents.map(e => `  ('${q(e.code)}', '${q(e.name)}')`).join(',\n');
sql += '\nON CONFLICT (code) DO NOTHING;\n\n';

sql += '-- New editions\n';
sql += 'INSERT INTO editions (id, event_code, label, location, year, logo, flag) VALUES\n';
sql += newEditions.map(e => `  ('${q(e.id)}', '${q(e.eventCode)}', '${q(e.label)}', '${q(e.location)}', ${e.year}, '${q(e.logo)}', '${q(e.flag || '')}')`).join(',\n');
sql += '\nON CONFLICT (id) DO NOTHING;\n\n';

sql += '-- Pri page content\n';
sql += `UPDATE settings SET pri_page_content = '${q(pri)}' WHERE id = 1;\n`;

const fs = require('fs');
fs.writeFileSync('./migration.sql', sql);
console.log('Written to migration.sql');
