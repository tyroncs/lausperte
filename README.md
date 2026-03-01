# laŭsperte

**Ni taksu la plej bonajn eventojn en Esperantujo, laŭsperte**

A website for ranking Esperanto youth events based on attendee feedback.

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- **Homepage**: Live leaderboard showing ranked events from best to worst
- **Contribution Flow**: 
  1. Select which event editions you've attended
  2. Rank them into categories (Elstara, Sufiĉe bone, Averaĝa, Malbona)
- **Smart Weighting**: Users who attended more events have slightly more influence (logarithmic weighting)
- **Hover Details**: Hover over any event to see distribution breakdown
- **Admin Tools**: Export and manage submissions (see ADMIN_GUIDE.md)

## How It Works

### Weighting Formula
- Each user's vote weight = `log(editions_attended + 1)`
- This gives experienced attendees more influence with diminishing returns
- Example: 2 editions → weight 1.10, 5 editions → weight 1.79, 20 editions → weight 3.04

### Scoring
- Elstara = 4 points
- Sufiĉe bone = 3 points
- Averaĝa = 2 points
- Malbona = 1 point

### Final Rankings
- Each edition gets a weighted average score
- Rankings shown from highest to lowest score
- Hover to see distribution of votes across categories

## Project Structure

```
lausperte/
├── app/
│   ├── page.tsx              # Homepage with leaderboard
│   ├── donu/
│   │   └── page.tsx          # Contribution flow
│   ├── api/
│   │   ├── rankings/         # GET rankings
│   │   ├── submit/           # POST new submission
│   │   └── admin/            # Admin endpoints
│   └── layout.tsx
├── data/
│   ├── events.ts             # Single source of truth for all events
│   └── database.json         # JSON database (auto-created)
├── lib/
│   └── db.ts                 # Database functions and scoring logic
└── package.json
```

## Adding New Events or Editions

Edit **ONLY** the file `data/events.ts`:

```typescript
{
  code: 'NEW_EVENT',
  name: 'New Event Name',
  editions: [
    { 
      id: 'new-event-2025', 
      eventName: 'New Event Name', 
      label: '2025', 
      location: 'City, Country', 
      year: 2025 
    },
  ],
}
```

That's it! The entire app updates automatically.

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **JSON File Storage** (simple and reliable)
- **No authentication** (by design)

## Admin Features

See `ADMIN_GUIDE.md` for instructions on:
- Exporting all submissions
- Deleting bad quality submissions
- Viewing submission data

## Data Storage

All submissions are stored in `data/database.json` (JSON file). Each submission contains:
- Unique ID
- Timestamp
- List of attended editions
- Rankings for each edition

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## License

MIT
