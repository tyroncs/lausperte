-- New events
INSERT INTO events (code, name) VALUES
  ('KS', 'KS'),
  ('KUŜEJO', 'KUŜEJO'),
  ('IJS', 'IJS'),
  ('SES', 'SES')
ON CONFLICT (code) DO NOTHING;

-- New editions
INSERT INTO editions (id, event_code, label, location, year, logo, flag) VALUES
  ('ks-2015', 'KS', '2015', 'Busano, Sud-Koreio', 2015, '/event-logos/ks-2015.jpg', '🇰🇷'),
  ('ks-2016', 'KS', '2016', 'Osako/Kioto, Japanio', 2016, '/event-logos/ks-2016.jfif', '🇯🇵'),
  ('ks-2025', 'KS', '2025', 'Saporo, Japanio', 2025, '/event-logos/ks-2025.png', '🇯🇵'),
  ('ks-2024', 'KS', '2024', 'Suwon, Sud-Koreio', 2024, '/event-logos/ks-2024.png', '🇰🇷'),
  ('ks-2023', 'KS', '2023', 'Hanojo kaj Ninh Binh, Vjetnamio', 2023, '/event-logos/ks2023.png', '🇻🇳'),
  ('ks-2019', 'KS', '2019', 'Danango, Vjetnamio', 2019, '/event-logos/ks2023.png', '🇻🇳'),
  ('ks-2018', 'KS', '2018', 'Ĉongĉingo, Ĉino', 2018, '/event-logos/ks-2018.png', '🇨🇳'),
  ('kuŝejo-2024', 'KUŜEJO', '2024', 'Yogyakarta, Indonezio', 2024, '/event-logos/ku-ejo-2024-logo.png', '🇮🇩'),
  ('kuŝejo-2018', 'KUŜEJO', '2018', 'Ayutthaya, Tajlando', 2018, '/event-logos/ku-ejo-2018.png', '🇹🇭'),
  ('ijs-2015', 'IJS', '2015', 'Szentgotthárd, Hungario', 2015, '/event-logos/ijs-logo.jpg', '🇭🇺'),
  ('ijs-2017', 'IJS', '2017', 'Gyenesdiás, Hungario', 2017, '/event-logos/ijs-2017.png', '🇭🇺'),
  ('ses-2015', 'SES', '2015', 'Martin, Slovakio', 2015, '/event-logos/ses.png', '🇸🇰'),
  ('ses-2017', 'SES', '2017', 'Banská Štiavnica, Slovakio', 2017, '/event-logos/ses.png', '🇸🇰'),
  ('ses-2018', 'SES', '2018', 'Liptovský Mikuláš, Slovakio', 2018, '/event-logos/ses.png', '🇸🇰'),
  ('ses-2019', 'SES', '2019', 'Nitra, Slovakio', 2019, '/event-logos/ses.png', '🇸🇰'),
  ('ijf-2025', 'IJF', '2025', 'Torricella di Magione, Italio', 2025, '/event-logos/ijf.png', '🇮🇹')
ON CONFLICT (id) DO NOTHING;

-- Pri page content
UPDATE settings SET pri_page_content = '**laŭsperte** estas retejo por rangigi eventojn en Esperantujo.
Partoprenantoj povas taksi la eventojn kiujn ili ĉeestis, kaj la komunumo vidas
la kolektajn rezultojn. 

## Kiu estas la celgrupo de laŭsperte?

La celgrupo estas la nuna generacio de junaj esperantistoj kiuj ĉeestas la grandskajaln internaciajn junularajn eventojn en Esperantujo.

## Kiel mi elektis la eventojn?

Mi strebis inkluzivi ĉiujn esperantajn eventojn en la mondo kiuj plenumis la kriteriojn de "grandskala", "internacia" kaj "junulara". Mi ankaŭ inkluzivis la Universalan Kongreson. Eĉ se ne estas junulara aranĝo, multaj junuloj ja ĉeestas ĝin.

Mi ankaŭ nur inkluzivis la eventojn de la pasintaj 10 jaroj. Devas ekzisti ian sojlon, kaj konsidere ke mi mem lernis Esperanton en 2015, sentis kiel taŭga komencpunkto.

## Kiel funkcias la poentaro?

Ĉiu kontribuanto rangigas eventojn en kvar kategoriojn -
**Elstara**, **Tre bona**, **Enorde**, kaj **Malbona** - kaj ankaŭ povas ordigi eventojn ene de specifa kategorio. Surbaze de tio, ĉiuj rangigitaj eventoj ricevas "poentojn" (kun pli da pezo por homoj kiuj ĉeestis pli da eventoj), kaj per kompari la finajn poentojn de ĉiuj eventoj, ni sukcese kreas kolektivan rangigon.

## Kiel ni evitas spamajn kontribuojn?

Ĉiuj respondantoj devas doni sian nomon. Aldone, la administranto povas vidi la krudajn datumojn, kaj laŭbezone forigi malbonkvalitajn kontribuojn aŭ ŝalti ke ĉiuj kontribuoj postulas permanan aprobon antaŭ ol influi la ĝeneralan rangigon. Kaj ĝenerale, mi kredas ke esperantistoj ĝenerale fideblas!

## Kiu kreis ĉi tion?

Kreita de Tyron Surmon Kun granda helpo de Claude Code. Kontaktu min telegrame ĉe @tyroncs aŭ retpoŝte ĉe tyrontoo@gmail.com. ' WHERE id = 1;
