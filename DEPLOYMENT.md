# Deploying TaskForge: Render (API) + Vercel (client) + MongoDB Atlas

Order matters: database -> API -> client -> point the API at the client.

## 0. Push to GitHub
```bash
git remote add origin https://github.com/<you>/taskforge.git
git push -u origin main
```
Confirm `.env` files are not in the repo.

## 1. MongoDB Atlas (free M0)
1. Create a cluster, then **Database Access** -> add a user with a strong password.
2. **Network Access** -> add `0.0.0.0/0`. Render's free tier has no fixed IP, so this is required.
3. **Connect -> Drivers** -> copy the URI and put the database name in it:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/taskforge?retryWrites=true&w=majority`
   (URL-encode special characters in the password.)

## 2. Render: API
**Option A: Blueprint (uses `render.yaml`)**
1. Render dashboard -> **New -> Blueprint** -> pick your repo -> **Apply**.
2. Fill the prompted values: `MONGODB_URI` (from step 1) and `CLIENT_URL`
   (use `https://placeholder.vercel.app` for now; you fix it in step 4). `AI_API_KEY` is optional.

**Option B: manual Web Service**
| Field | Value |
| --- | --- |
| Root Directory | `server` |
| Build Command | `npm install --include=dev && (npm run build; test -f dist/server.js)` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |

Environment variables: `NODE_VERSION=20`, `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET` (long random string), `JWT_EXPIRES_IN=7d`, `CLIENT_URL`, optional `AI_API_KEY`.

When it is live, open `https://<your-service>.onrender.com/api/health`. You should see `{"success":true,...}`.

## 3. Vercel: client
1. **Add New -> Project** -> import the repo.
2. **Root Directory: `client`**. Framework preset: Vite (detected). `client/vercel.json` already handles the build and the SPA rewrite so page refreshes on `/tasks/...` work.
3. **Environment Variables**: `VITE_API_URL` = `https://<your-service>.onrender.com/api` (must include `/api`, no trailing slash).
4. Deploy, then copy the production URL, e.g. `https://taskforge.vercel.app`.

> `VITE_` variables are baked in at build time. If you change it, redeploy.

## 4. Connect them (CORS)
On Render -> your service -> **Environment** -> set `CLIENT_URL` to the exact Vercel origin (no trailing slash), then let it redeploy.

- Several origins: comma-separate them.
- Vercel preview deployments: add a wildcard, e.g. `https://taskforge.vercel.app,https://taskforge-*.vercel.app`.

## 5. Optional: demo data
The seed script **wipes the database it points at**. Run it once from your machine:
```bash
cd server && npm install
MONGODB_URI="mongodb+srv://..." npm run seed        # macOS/Linux
# Windows PowerShell: $env:MONGODB_URI="mongodb+srv://..."; npm run seed
```
Then log in with `admin@taskforge.dev` / `Password123` (change or delete these accounts on a real deployment).

## 6. Verify
- Register a new account on the Vercel URL, create a project and a task.
- Open the app in two browsers as two users: a comment or status change should appear live (WebSocket via Socket.IO).
- Browser DevTools -> Network: API calls go to `onrender.com` and return 200.

## Troubleshooting
| Symptom | Cause / fix |
| --- | --- |
| First request takes ~30-60 s, or login times out once | Render free services sleep after ~15 min idle. Wait and retry, or use a paid plan / uptime pinger. |
| `CORS` error in the browser console | `CLIENT_URL` on Render doesn't match the Vercel origin exactly (check `https`, no trailing slash) or the service hasn't redeployed yet. |
| Requests go to `vercel.app/api/...` and return 404 | `VITE_API_URL` is missing or was added after the build. Set it and redeploy. |
| `MongooseServerSelectionError` in Render logs | Atlas Network Access doesn't allow `0.0.0.0/0`, or the URI/password is wrong. |
| Page refresh shows a Vercel 404 | Root Directory isn't `client`, so `vercel.json` isn't applied. |
| Build fails: `tsc: not found` | Build command is missing `--include=dev`. |
| Live updates don't arrive | Check the browser console for blocked WebSocket / CORS errors; `CLIENT_URL` must be correct. |

## Production checklist
- Strong, unique `JWT_SECRET` (Render's generated one is fine); never commit it.
- Rotate or delete the seeded demo accounts.
- Atlas: enable backups on paid tiers; keep the DB user's password out of chat/logs.
- Optional: add a custom domain on Vercel, then update `CLIENT_URL` on Render.
