# Patient Records (Vite + React on Vercel)

Records are stored in a database (Upstash Redis) so every device sees the same content.
The site is locked behind a passcode.

## One-time setup on Vercel
1. Project > Storage > Create Database > Upstash for Redis. Connect it to this project
   (this adds KV_REST_API_URL and KV_REST_API_TOKEN automatically).
2. Project > Settings > Environment Variables: add `APP_PASSWORD` (the passcode people type to open the site).
3. Deployments > latest deployment > Redeploy (so the new variables are picked up).

## Updating
    git add .
    git commit -m "Describe the change"
    git push

## Notes
- `npm run dev` only serves the page. The data routes live in `/api` and run on Vercel
  (or with `npx vercel dev` after `vercel link` and `vercel env pull`).
- Printed certificate defaults (physician name, license no., clinic) are in `src/utils.js`
  (`blankDoctor`) and can be edited in the app under "Doctor details"; edits are shared across devices.
