-- lausperte database schema
-- Run this once in your Neon console before deploying.

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  require_moderation BOOLEAN NOT NULL DEFAULT false,
  require_comment_moderation BOOLEAN NOT NULL DEFAULT false,
  pri_page_content TEXT NOT NULL DEFAULT '',
  weighting_mode TEXT NOT NULL DEFAULT 'logarithmic'
);

CREATE TABLE IF NOT EXISTS events (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS editions (
  id TEXT PRIMARY KEY,
  event_code TEXT NOT NULL,
  label TEXT NOT NULL,
  location TEXT NOT NULL,
  year INTEGER NOT NULL,
  logo TEXT NOT NULL DEFAULT '',
  flag TEXT
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  timestamp BIGINT NOT NULL,
  name TEXT NOT NULL,
  attended_editions TEXT[] NOT NULL,
  rankings JSONB NOT NULL,
  intra_rankings JSONB,
  status TEXT NOT NULL DEFAULT 'approved',
  edit_token TEXT UNIQUE,
  comments JSONB,
  comment_status TEXT,
  flag_duplicate BOOLEAN DEFAULT false,
  flag_duplicate_ip BOOLEAN DEFAULT false,
  ip TEXT
);

-- Default settings row (single row, id always = 1)
INSERT INTO settings (id, require_moderation, require_comment_moderation, pri_page_content, weighting_mode)
VALUES (1, false, false, '**laŭsperte** estas platformo por rangigi junulajn Esperanto-eventojn.
Partoprenantoj povas taksi la eventojn kiujn ili ĉeestis, kaj la komunumo vidas
la kolektajn rezultojn. La celo estas helpi organizantojn plibonigi siajn eventojn
kaj helpi novulojn elekti kiujn eventojn ĉeesti.

## Kiel funkcias la poentaro?

Ĉiu kontribuanto klasifikas eventojn en kvar kategoriojn:
**Elstara**, **Sufiĉe bone**, **Averaĝa**, kaj **Malbona**. Tiuj respondas al poentoj 3.5, 2.5, 1.5, kaj 0.5 respektive.

Se kontribuanto ankaŭ ordonas eventojn ene de kategorio (la nedeviga "pli detala" paŝo), la poentoj distribuas frakcie ene de la intervalo de la kategorio, sed kun la sama meznombro.

La fina poentaro estas **pezita meznombro**. Kontribuantoj kiuj ĉeestis pli da eventoj ricevas pli da pezo, sed kun malkreskanta reveno (logaritma skalo). Tiel, spertuloj pli influas, sed ne superregas la rangigon.

## Kiu kreis ĉi tion?

Kreita de Tyron.', 'logarithmic')
ON CONFLICT (id) DO NOTHING;

-- Seed events
INSERT INTO events (code, name) VALUES
  ('IJK', 'IJK'),
  ('JES', 'JES'),
  ('IJF', 'IJF'),
  ('RENKEJ', 'RenKEJtiĝo'),
  ('UK', 'UK'),
  ('FESTO', 'FESTO')
ON CONFLICT (code) DO NOTHING;

-- Seed editions
INSERT INTO editions (id, event_code, label, location, year, logo) VALUES
  ('ijk-2015', 'IJK', '2015', 'Wiesbaden, Germanio', 2015, '/event-logos/ijk-2015.png'),
  ('ijk-2016', 'IJK', '2016', 'Vroclavo, Pollando', 2016, '/event-logos/ijk-2016.png'),
  ('ijk-2017', 'IJK', '2017', 'Aného, Togolando', 2017, '/event-logos/ijk-2017.png'),
  ('ijk-2018', 'IJK', '2018', 'Badajoz, Hispanio', 2018, '/event-logos/ijk-2018.jpg'),
  ('ijk-2019', 'IJK', '2019', 'Liptovský Hrádok, Slovakio', 2019, '/event-logos/ijk-2019.png'),
  ('ijk-2022', 'IJK', '2022', 'Westelbeers, Nederlando', 2022, '/event-logos/ijk-2022.png'),
  ('ijk-2023', 'IJK', '2023', 'Lignano Sabbiadoro, Italio', 2023, '/event-logos/ijk-2023.png'),
  ('ijk-2024', 'IJK', '2024', 'Šventoji, Litovio', 2024, '/event-logos/ijk-2024.png'),
  ('ijk-2025', 'IJK', '2025', 'Cisarua, Indonezio', 2025, '/event-logos/ijk-2025.png'),
  ('jes-2015', 'JES', '2015/16', 'Eger, Hungario', 2015, '/event-logos/jes-hungario.png'),
  ('jes-2016', 'JES', '2016/17', 'Waldheim am Brahmsee, Germanio', 2016, '/event-logos/jes-germanio.png'),
  ('jes-2017', 'JES', '2017/18', 'Szczecin, Pollando', 2017, '/event-logos/jes-pollando.png'),
  ('jes-2018', 'JES', '2018/19', 'Storkow, Germanio', 2018, '/event-logos/jes-germanio.png'),
  ('jes-2019', 'JES', '2019/20', 'Karłów, Pollando', 2019, '/event-logos/jes-pollando.png'),
  ('jes-2022', 'JES', '2022/23', 'Oranienburg, Germanio', 2022, '/event-logos/jes-germanio.png'),
  ('jes-2023', 'JES', '2023/24', 'Storkow, Germanio', 2023, '/event-logos/jes-germanio.png'),
  ('jes-2024', 'JES', '2024/25', 'Ferrières, Belgio', 2024, '/event-logos/jes-belgio.jpg'),
  ('jes-2025', 'JES', '2025/26', 'Burg (Spreewald), Germanio', 2025, '/event-logos/jes-2025-2026.png'),
  ('ijf-2015', 'IJF', '2015', 'Brusson, Italio', 2015, '/event-logos/ijf.png'),
  ('ijf-2016', 'IJF', '2016', 'Pesaro, Italio', 2016, '/event-logos/ijf.png'),
  ('ijf-2017', 'IJF', '2017', 'Castione della Presolana, Italio', 2017, '/event-logos/ijf.png'),
  ('ijf-2018', 'IJF', '2018', 'Marina di Ascea, Italio', 2018, '/event-logos/ijf.png'),
  ('ijf-2019', 'IJF', '2019', 'Rimini, Italio', 2019, '/event-logos/ijf.png'),
  ('ijf-2022', 'IJF', '2022', 'Forni Avoltri, Italio', 2022, '/event-logos/ijf.png'),
  ('ijf-2023', 'IJF', '2023', 'Palmi, Italio', 2023, '/event-logos/ijf.png'),
  ('ijf-2024', 'IJF', '2024', 'Serrada di Folgaria, Italio', 2024, '/event-logos/ijf.png'),
  ('renkej-2023', 'RENKEJ', '2023', 'Manresa', 2023, '/event-logos/renkejtigo.png'),
  ('renkej-2024', 'RENKEJ', '2024', 'L''Espluga de Francolí', 2024, '/event-logos/renkejtigo.png'),
  ('renkej-2025', 'RENKEJ', '2025', 'Olot', 2025, '/event-logos/renkejtigo.png'),
  ('uk-2015', 'UK', '2015', 'Lillo, Francio', 2015, '/event-logos/uk-2015.png'),
  ('uk-2016', 'UK', '2016', 'Nitro, Slovakio', 2016, '/event-logos/uk-2016.png'),
  ('uk-2017', 'UK', '2017', 'Seulo, Sud-Koreio', 2017, '/event-logos/uk-2017.png'),
  ('uk-2018', 'UK', '2018', 'Lisbono, Portugalio', 2018, '/event-logos/uk-2018.png'),
  ('uk-2019', 'UK', '2019', 'Lahtio, Finnlando', 2019, '/event-logos/uk-2019.png'),
  ('uk-2022', 'UK', '2022', 'Montrealo, Kanado', 2022, '/event-logos/uk-2022.jpg'),
  ('uk-2023', 'UK', '2023', 'Torino, Italio', 2023, '/event-logos/uk-2023.jpg'),
  ('uk-2024', 'UK', '2024', 'Aruŝo, Tanzanio', 2024, '/event-logos/uk-2024.jpg'),
  ('uk-2025', 'UK', '2025', 'Brno, Ĉeĥio', 2025, '/event-logos/uk-2025.jpg'),
  ('festo-2025', 'FESTO', '2025', 'Moissac, Francio', 2025, '/event-logos/festo-2025.png')
ON CONFLICT (id) DO NOTHING;
