# 🚀 Quick Start Guide

## Get the site running in 3 steps:

### Step 1: Install Node.js
If you don't have Node.js installed:
1. Go to https://nodejs.org/
2. Download the LTS version (left button)
3. Install it

### Step 2: Install Dependencies
Open a terminal in this folder and run:
```bash
npm install
```
Wait for it to finish (takes 1-2 minutes).

### Step 3: Start the Site
Run:
```bash
npm run dev
```

Then open your browser to: **http://localhost:3000**

---

## ✅ What You Should See

1. **Homepage**: Empty leaderboard (no data yet)
2. Click **"Donu vian opinion"** button
3. Select some events you "attended" (for testing)
4. Rank them into categories
5. Click **"Sendi"**
6. Back to homepage → your rankings appear!

---

## 📚 Next Steps

- **Add real data**: Edit `data/events.ts` to add new events
- **Manage submissions**: Read `ADMIN_GUIDE.md` to learn how to export/delete data
- **Full details**: Check `PROJECT_OVERVIEW.md` for everything about the project

---

## 🆘 Problems?

### "npm: command not found"
→ Install Node.js (see Step 1)

### "Port 3000 already in use"
→ Run `PORT=3001 npm run dev` and open `http://localhost:3001`

### Something else broken?
→ Read `SETUP.md` for detailed troubleshooting

---

## 🎉 That's It!

Your site is now running. Share it with friends, collect real rankings, and manage the data using the admin tools.

**Have fun!** 🌟
