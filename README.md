# Metronome Invoice Voider

A Node.js + React application to manage and void finalized invoices in your Metronome account. Designed to run locally for testing and deploy to Vercel for production.

![Screenshot](screenshot.png)

## Features

- 📋 **List invoices by status** - View finalized or voided invoices in your Metronome account
- 🗑️ **Void individual invoices** - Void specific non-zero invoices one at a time
- ⚡ **Bulk void** - Void all non-zero invoices with a single click
- 🔄 **Regenerate voided invoices** - Restore voided invoices individually or all at once
- 🔑 **Frontend API key input** - Enter your Metronome API key directly in the browser
- 📊 **Statistics dashboard** - See totals, non-zero counts, and action results at a glance
- 🌙 **Dark theme** - Beautiful, modern dark UI

## Prerequisites

- Node.js 18+
- A Metronome account with API access
- Metronome API key

## Local Development

### 1. Clone and install dependencies

```bash
cd metronome-invoice-voider
npm install
```

### 2. Configure environment variables

Copy the example environment file and add your Metronome API key:

```bash
cp .env.example .env
```

Edit `.env` and add your API key:

```
METRONOME_API_KEY=your_api_key_here
```

### 3. Run locally

Start both the API server and React frontend:

```bash
npm run dev
```

This will start:
- API server at `http://localhost:3001`
- React frontend at `http://localhost:5173`

Open `http://localhost:5173` in your browser.

## Deploy to Vercel

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Deploy

```bash
vercel
```

### 3. Add environment variable

In the Vercel dashboard or via CLI:

```bash
vercel env add METRONOME_API_KEY
```

Enter your Metronome API key when prompted.

### 4. Redeploy

```bash
vercel --prod
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/invoices` | GET | List invoices (use `?status=FINALIZED` or `?status=VOID`) |
| `/api/void` | POST | Void a specific invoice |
| `/api/void-all` | POST | Void all non-zero invoices |
| `/api/regenerate` | POST | Regenerate a voided invoice |
| `/api/regenerate-all` | POST | Regenerate all voided invoices |

### Example: Void a specific invoice

```bash
curl -X POST http://localhost:3001/api/void \
  -H "Content-Type: application/json" \
  -H "X-Metronome-Api-Key: your_api_key_here" \
  -d '{"invoiceId": "invoice-uuid-here"}'
```

### Example: Void all non-zero invoices

```bash
curl -X POST http://localhost:3001/api/void-all \
  -H "Content-Type: application/json" \
  -H "X-Metronome-Api-Key: your_api_key_here"
```

### Example: Regenerate a voided invoice

```bash
curl -X POST http://localhost:3001/api/regenerate \
  -H "Content-Type: application/json" \
  -H "X-Metronome-Api-Key: your_api_key_here" \
  -d '{"invoiceId": "invoice-uuid-here"}'
```

### Example: Regenerate all voided invoices

```bash
curl -X POST http://localhost:3001/api/regenerate-all \
  -H "Content-Type: application/json" \
  -H "X-Metronome-Api-Key: your_api_key_here"
```

### Example: List voided invoices

```bash
curl "http://localhost:3001/api/invoices?status=VOID" \
  -H "X-Metronome-Api-Key: your_api_key_here"
```

## Project Structure

```
metronome-invoice-voider/
├── api/                    # Vercel serverless functions
│   ├── invoices.js         # GET /api/invoices
│   ├── void.js             # POST /api/void
│   ├── void-all.js         # POST /api/void-all
│   ├── regenerate.js       # POST /api/regenerate
│   └── regenerate-all.js   # POST /api/regenerate-all
├── src/                    # React frontend
│   ├── App.jsx             # Main application component
│   ├── main.jsx            # React entry point
│   └── index.css           # Styles
├── index.html              # HTML entry point
├── package.json            # Dependencies and scripts
├── server.js               # Local development API server
├── vite.config.js          # Vite configuration
├── vercel.json             # Vercel deployment config
└── README.md               # This file
```

## How It Works

1. **Enter API Key**: Provide your Metronome API key in the frontend (stored in browser localStorage)
2. **Fetch Invoices**: The app calls the Metronome API to list invoices by status (FINALIZED or VOID)
3. **Filter Non-Zero**: Invoices with a total amount of $0.00 are excluded from void operations
4. **Void Invoices**: Selected invoices are voided via the Metronome API
5. **Regenerate Invoices**: Voided invoices can be regenerated to restore them

## Security Notes

- Never commit your `.env` file with real API keys
- The API key should be stored securely in Vercel's environment variables for production
- This app is designed for administrative use - consider adding authentication for production

## License

MIT
