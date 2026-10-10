# Deploying TaskForge: Render (API) + Vercel (client) + MongoDB Atlas

Order matters: database -> API -> client -> point the API at the client.

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
