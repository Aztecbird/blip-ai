# How to Add API Keys to Blip

Blip securely loads all of your API keys from a hidden file named `.env.local`. This file is ignored by Git, meaning your keys are safe even when you upload your code to GitHub.

## Where to find `.env.local`
1. Open up your Mac terminal.
2. Run this command:
   ```bash
   open -a TextEdit /Users/pabloarellano/Desktop/blip-ai/.env.local
   ```

## Adding Keys
When you get a new API Key (e.g. for Google Gmail, Calendar, Weather, or Telegram), paste the template variables directly into that file! 

### Example: Gmail & Calendar
```env
# Google Calendar
GOOGLE_CALENDAR_CLIENT_ID=your_id_here
GOOGLE_CALENDAR_CLIENT_SECRET=your_secret_here
GOOGLE_CALENDAR_REDIRECT_URI=http://127.0.0.1:8787/api/google-calendar/auth/callback

# Google Gmail
GOOGLE_GMAIL_CLIENT_ID=your_id_here
GOOGLE_GMAIL_CLIENT_SECRET=your_secret_here
GOOGLE_GMAIL_REDIRECT_URI=http://127.0.0.1:8788/api/gmail/auth/callback
```

### Restarting
Whenever you change `.env.local`, be sure to restart your running terminal by pressing `Ctrl + C` and then running `npm run dev` again!
