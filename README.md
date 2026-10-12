# Patient Records (Vite + React)

Patient record app based on the clinic template: patient details, A. Medical history,
B. Laboratories/diagnostics, C. SOAP notes, D. Medical certificate (printable).

## Run locally
    npm install
    npm run dev

## Deploy to Vercel
1. Push this folder to a GitHub repo.
2. In Vercel: Add New > Project > import the repo. Vercel detects Vite automatically
   (build: `npm run build`, output: `dist`).
   Or from the terminal: `npx vercel --prod`.

## Data storage
Records are saved in the browser's localStorage (per device/browser). Use "Export backup"
regularly. Before storing real patient data, add authentication and a database
(e.g. Supabase) because a Vercel URL is public.
