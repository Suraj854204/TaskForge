# TaskForge

**Smart Team Task & Productivity Platform** — a small SaaS-style MERN application where teams organise work in workspaces and projects, track tasks on a Kanban board, collaborate through comments, and monitor productivity with analytics computed from real MongoDB data.

## Features

- **Auth**: register, login, logout, JWT with expiry handling, bcrypt password hashing, protected routes
- **Roles**: `ADMIN` and `MEMBER`, enforced in backend middleware (not just hidden in the UI)
- **Workspaces**: create/update, add/remove members, change roles, strict per-workspace data isolation
- **Projects**: CRUD, members, status, colour, deadline, live progress calculation
- **Tasks**: CRUD, assignment, status, priority, deadline, tags, estimates, search, filters, sorting, pagination
- **Kanban board**: drag & drop with optimistic UI updates and rollback on failure (select fallback for touch devices)
- **Comments** (add / edit own / delete own) and a **task activity timeline**
- **Notifications**: assigned, comment, deadline approaching, completed, added to project; unread badge, mark read / mark all read
- **Dashboard & Analytics**: Recharts charts; every number comes from MongoDB aggregations
- **Smart deadlines**: "Overdue by X days", "Due in X days", "Completed in X"
- **AI Task Assistant** (optional): turns a sentence into a task with subtasks, priority, estimate and tags. The app works fully without it
- **Profile** (name, avatar URL, change password, my tasks) and **Admin panel**
- Loading, error and empty states on every major page, responsive layout, toasts, confirmation dialogs
- **Live updates** via Socket.IO: new notifications, comments and task changes appear without refreshing
- **Dark mode** (remembers your choice, follows system on first visit)
- **Command palette** (`Ctrl/Cmd + K`): jump to any page, create a task, toggle theme, or search tasks
- **Calendar view** of task deadlines (month grid on desktop, dot markers + day list on mobile)
- **Task checklists** with progress bar; AI-suggested subtasks become real checklist items
- **Quick filter chips** (mine, overdue, unassigned, urgent, in review) and **CSV export** of the filtered list
- **Dashboard** with progress ring, upcoming deadlines and a recent-activity feed
- **Mobile-first layout**: bottom navigation bar, slide-in drawer, card lists instead of tables on phones, swipeable Kanban columns

## Technology stack

| Layer | Tech |
| --- | --- |
| Frontend | React 18, Vite, TypeScript, React Router, Tailwind CSS, Axios, React Hook Form + Zod, Recharts, Lucide |
| Backend | Node.js, Express, TypeScript, MongoDB + Mongoose, JWT, bcryptjs, Zod, Helmet, CORS, Morgan, express-rate-limit |
| Testing | Vitest, Supertest, mongodb-memory-server, React Testing Library |

> `bcryptjs` is used instead of native `bcrypt` so installation never needs a C++ toolchain. The hashing algorithm is the same (bcrypt, 12 rounds).

## Architecture

```
taskforge/
  client/src/   components · pages · layouts · hooks · context · services · types · utils · routes
  server/src/   config · controllers · middleware · models · routes · services (+ services/ai) · validators · utils · types
```

Routes only wire middleware to controllers; controllers handle HTTP; business rules live in `services/`. All input is validated with Zod on the server (and again with Zod + React Hook Form in the UI). A central error middleware converts Zod, Mongoose, JWT and custom errors into one response shape and hides stack traces in production.

```jsonc
{ "success": true,  "message": "Task created successfully", "data": {} }
{ "success": false, "message": "Validation failed", "errors": [{ "field": "title", "message": "..." }] }
```

## Database models

`User` · `Workspace` · `Project` · `Task` · `Comment` · `Notification` · `Activity` — ObjectId references, timestamps, validation, and indexes on workspace, project, assignee, status/priority, creation date, deadline and tags. `Task` stores two derived fields (`priorityRank`, `dueSort`) so sorting by priority/deadline is a plain indexed sort.

## API overview

| Area | Endpoints |
| --- | --- |
| Auth | `POST /api/auth/register` · `login` · `logout` · `GET /api/auth/me` |
| Users | `GET/PATCH /api/users/me` · `PATCH /api/users/me/password` |
| Workspaces | `POST /api/workspaces` · `GET/PATCH/DELETE /api/workspaces/:id` · `GET/POST /api/workspaces/:id/members` · `PATCH/DELETE /api/workspaces/:id/members/:userId` |
| Projects | `POST/GET /api/projects` · `GET/PATCH/DELETE /api/projects/:id` |
| Tasks | `POST/GET /api/tasks` (filters incl. `overdue=true`, `unassigned=true`) · `GET/PATCH/DELETE /api/tasks/:id` |
| Comments | `POST/GET /api/tasks/:taskId/comments` · `PATCH/DELETE /api/comments/:id` |
| Notifications | `GET /api/notifications` · `PATCH /api/notifications/:id/read` · `PATCH /api/notifications/read-all` |
| Analytics | `GET /api/analytics/dashboard` · `GET /api/analytics/productivity` |
| AI | `POST /api/ai/task-assistant` |

Example: `GET /api/tasks?status=IN_PROGRESS&priority=HIGH&search=auth&assignedTo=me&sort=deadline&page=1&limit=10`

## Environment variables (`server/.env`)

```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/taskforge
JWT_SECRET=replace-with-a-long-random-string
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
AI_API_KEY=            # optional Google Gemini API key, enables the AI Task Assistant
AI_MODEL=gemini-3.5-flash
```

Copy `server/.env.example` to `server/.env`. Never commit `.env`. The optional `client/.env` only needs `VITE_API_URL` when the API runs on a different origin.

## Installation

Requirements: Node.js 18+ and MongoDB.

**MongoDB**: run locally (`mongod`), use Docker (`docker run -d -p 27017:27017 --name mongo mongo:7`), or use a MongoDB Atlas connection string in `MONGODB_URI`.

```bash
npm run install:all                 # root + server + client dependencies
cp server/.env.example server/.env  # then edit JWT_SECRET (and MONGODB_URI if needed)
```

### Backend setup
```bash
cd server
npm run dev        # http://localhost:5000  (health check: /api/health)
```

### Frontend setup
```bash
cd client
npm run dev        # http://localhost:5173  (proxies /api to :5000)
```

### Run both from the root
```bash
npm run dev
```

### Run with Docker (one command)
```bash
cp .env.example .env        # set JWT_SECRET
docker compose up --build   # app at http://localhost:8080
docker compose exec server node dist/seed.js   # optional demo data
```
Services: MongoDB, the API (port 5000, internal) and the client served by nginx, which proxies `/api` and `/socket.io` to the API.

### Seed data
```bash
npm run seed
```
Creates 1 admin and 2 members, 2 projects, 14 tasks, comments, notifications and activity. Login: `admin@taskforge.dev` / `Password123` (also `priya@taskforge.dev`, `rahul@taskforge.dev`). **The seed script wipes the target database.**

### Tests
```bash
npm test --prefix server    # API tests (downloads an in-memory MongoDB on first run)
npm test --prefix client    # deadline logic + component tests
npm run typecheck --prefix server && npm run typecheck --prefix client
```

### Continuous integration
`.github/workflows/ci.yml` runs typecheck and tests for both apps (plus the client build) on every push and pull request.

### Deploy to Render + Vercel
See [DEPLOYMENT.md](DEPLOYMENT.md): MongoDB Atlas -> Render (API, `render.yaml`) -> Vercel (client, `client/vercel.json`) -> set `CLIENT_URL`.

### Production build
```bash
npm run build
NODE_ENV=production JWT_SECRET=... MONGODB_URI=... npm start --prefix server
```
Serve `client/dist` from any static host and set `CLIENT_URL` on the server to that origin (and `VITE_API_URL` at build time).

## Screenshots

_Add screenshots here after running the app: Dashboard, Kanban board, Task detail, Analytics, Admin._

## Git workflow

Small, meaningful commits on a feature branch, merged to `main` via pull request, for example: *Initial MERN project setup → Setup models, validation and auth APIs → Add workspace/project/task APIs → Add seed script and tests → Add client setup and auth pages → Build dashboard and Kanban board → Add comments, notifications, profile and admin → Add README*.

```bash
git remote add origin https://github.com/<you>/taskforge.git
git push -u origin main
```

## AI Development Experience

Code0 was used as an AI-assisted development tool during this project. Its suggestions were treated as drafts: I reviewed them, ran and tested them, and modified them by hand. The project was not written end-to-end by AI, and design decisions, security choices and verification remained my responsibility.

Concrete examples of where it helped:

1. **Backend API development** — scaffolding controller/service/route structure and Express error-handling middleware, which I then adapted to a single response format and consistent status codes.
2. **JWT authentication middleware** — drafting token verification and role guards; I added expiry-specific errors and made sure authorization is enforced server-side on every protected route.
3. **MongoDB/Mongoose schema design** — proposing models and indexes; I reviewed relationships, added derived sort fields, and checked queries for workspace isolation.
4. **React component development** — generating first versions of the Kanban board and form components, which I reworked for optimistic updates, accessibility and mobile behaviour.
5. **Debugging API/database issues** — narrowing down validation, population and aggregation problems, then confirming each fix with a test.

> Edit this section so it reflects your own real experience before submitting.
