# Admin Guide for laŭsperte

This guide shows you how to manage submissions without needing to know how to code.

## Setup

Your admin secret is stored in the `.env.local` file. By default it's set to `change-me-in-production`.

**To change your admin secret:**
1. Open the file `.env.local` in a text editor
2. Change `change-me-in-production` to something secure (like a random password)
3. Save the file
4. Restart the server (`npm run dev`)

---

## How to Export All Submissions

**Step 1:** While the website is running (after `npm run dev`), open this URL in your browser:

```
http://localhost:3000/api/admin/export?secret=change-me-in-production
```

**Important:** Replace `change-me-in-production` with your actual admin secret if you changed it!

**Step 2:** Your browser will download a JSON file called `lausperte-export-[timestamp].json`

**Step 3:** Open this file in any text editor to view all submissions, or use a JSON-to-CSV converter online to open it in Excel/Google Sheets.

### What the exported data looks like:

```json
{
  "totalSubmissions": 5,
  "exportDate": "2025-01-15T10:30:00.000Z",
  "submissions": [
    {
      "id": "abc-123-def-456",
      "timestamp": 1705315800000,
      "date": "2025-01-15T10:30:00.000Z",
      "attendedCount": 3,
      "attendedEditions": [
        "IJK 2024",
        "JES 2023/24",
        "IJF 2023"
      ],
      "rankings": {
        "ijk-2024": {
          "edition": "IJK 2024",
          "score": 4,
          "category": "Elstara"
        },
        ...
      }
    },
    ...
  ]
}
```

### Key fields to look at:
- **id**: Unique identifier for this submission (you'll need this to delete it)
- **date**: When the submission was made
- **attendedCount**: How many events this person attended
- **attendedEditions**: List of events they attended
- **rankings**: Their ratings for each event

---

## How to Delete a Bad Submission

**Step 1:** Export the data (see above) and find the `id` of the submission you want to delete.

For example, let's say you want to delete submission with id `abc-123-def-456`

**Step 2:** Open this URL in your browser:

```
http://localhost:3000/api/admin/submission?id=abc-123-def-456&secret=change-me-in-production
```

**Important:** 
- Replace `abc-123-def-456` with the actual submission ID
- Replace `change-me-in-production` with your admin secret if you changed it

**Step 3:** You'll see a response like:

```json
{
  "success": true,
  "deletedId": "abc-123-def-456"
}
```

This means the submission was deleted successfully!

### To delete multiple submissions:

Just repeat Step 2 for each submission ID you want to delete. Change the `id=` part of the URL each time.

Example:
```
http://localhost:3000/api/admin/submission?id=SUBMISSION_1&secret=your-secret
http://localhost:3000/api/admin/submission?id=SUBMISSION_2&secret=your-secret
http://localhost:3000/api/admin/submission?id=SUBMISSION_3&secret=your-secret
```

---

## Tips for Identifying Bad Submissions

When reviewing the exported data, look for:

1. **Suspicious patterns**: Someone who rated 20+ events all as "Malbona" (likely spam)
2. **Impossible attendance**: Someone who claims to have attended events from 2015-2025 but gives very generic ratings
3. **Duplicate submissions**: Multiple submissions at nearly the same timestamp (might be someone submitting multiple times)
4. **Test submissions**: If you were testing the site yourself, you can identify and remove your test data

---

## What if I delete the wrong submission?

Unfortunately, deletions are permanent. The submission is removed from the database and cannot be recovered.

**Best practice:** Before deleting, save a copy of your export file as a backup!

---

## Security Note

Keep your admin secret private! Anyone with the secret can:
- View all submissions
- Delete any submission

If you think your secret has been compromised:
1. Change it in `.env.local`
2. Restart the server
3. Use the new secret in all your admin URLs

---

## Need Help?

If something isn't working:
1. Make sure the website is running (`npm run dev`)
2. Check that you're using `http://localhost:3000` in the URLs
3. Make sure you're using the correct admin secret
4. Check the terminal where you ran `npm run dev` for any error messages
