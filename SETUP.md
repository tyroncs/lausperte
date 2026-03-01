# Setup Instructions for laŭsperte

## Prerequisites

You need to have **Node.js** installed on your computer. If you don't have it:
1. Go to https://nodejs.org/
2. Download the LTS (Long Term Support) version
3. Install it

## Installation Steps

### Step 1: Install Dependencies

Open a terminal/command prompt in the `lausperte` folder and run:

```bash
npm install
```

This will download and install all required packages. It may take a few minutes.

### Step 2: Start the Development Server

After installation completes, run:

```bash
npm run dev
```

You should see output like:
```
  ▲ Next.js 14.2.0
  - Local:        http://localhost:3000
  - Ready in 2.3s
```

### Step 3: Open the Website

Open your web browser and go to:
```
http://localhost:3000
```

You should see the laŭsperte homepage!

## What You Should See

1. **Homepage**: Empty leaderboard with "0 personoj kontribuis" and a button "Donu vian opinion"
2. Click the button to go to the contribution page
3. Select events you've attended
4. Rank them in categories
5. Submit and see the homepage update!

## Troubleshooting

### "npm: command not found"
You need to install Node.js first (see Prerequisites above)

### "Module not found" errors
Run `npm install` again to make sure all dependencies are installed

### Port 3000 already in use
If you see an error about port 3000, you can use a different port:
```bash
PORT=3001 npm run dev
```
Then open `http://localhost:3001`

### Database errors
If you see any database errors, make sure the `data/` folder exists in your project directory.

## Stopping the Server

Press `Ctrl+C` in the terminal where the server is running.

## Building for Production

When you're ready to deploy:

```bash
npm run build
npm start
```

This creates an optimized production build and starts the server on port 3000.

## File Structure Overview

```
lausperte/
├── app/                    # All pages and API routes
│   ├── page.tsx           # Homepage (leaderboard)
│   ├── donu/page.tsx      # Contribution flow
│   └── api/               # Backend API endpoints
├── data/
│   ├── events.ts          # Event definitions (edit here to add events)
│   └── database.json      # Database (auto-created on first run)
├── lib/
│   └── db.ts              # Database logic and scoring
├── package.json           # Dependencies
└── README.md              # Project overview
```

## Next Steps

1. Read `README.md` for feature overview
2. Read `ADMIN_GUIDE.md` to learn how to manage submissions
3. To add new events, edit `data/events.ts`

## Getting Help

If something doesn't work:
1. Check that you ran `npm install` successfully
2. Make sure Node.js version is 18 or higher: `node --version`
3. Try deleting `node_modules` folder and `.next` folder, then run `npm install` again
4. Check the terminal for error messages
