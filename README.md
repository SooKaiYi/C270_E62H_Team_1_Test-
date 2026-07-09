# C270 Rewards & Referral — split into frontend / backend

The original project was a single Express app that used EJS templates to
render HTML on the server. It's been split into two independent pieces:

```
backend/           Express JSON API (no view engine, no HTML)
  server.js
  package.json

frontend/           Static HTML/CSS/JS site that calls the backend over fetch()
  index.html
  css/style.css
  js/app.js
  package.json
```

## Backend

```bash
cd backend
npm install
npm start          # runs on http://localhost:3001
```

Routes (all JSON):
- `GET  /api/dashboard` — user, transactions, progress, nextReward (used on page load)
- `GET  /api/user`
- `GET  /api/user/points`
- `GET  /api/transactions`
- `POST /api/ride-complete`  `{ minutes }`
- `POST /api/calculate`      `{ minutes }` (ride simulator, replaces the old `/calculate` form POST)
- `POST /api/referral/submit` `{ referralCode }`
- `POST /api/redeem`         `{ points }`

CORS is wide-open (`Access-Control-Allow-Origin: *`) so the frontend can be
served from a different port/origin during development.

## Frontend

Any static file server works. Simplest option:

```bash
cd frontend
npx serve -l 5173 .
# then open http://localhost:5173
```

`js/app.js` has a single `API_BASE` constant at the top — point it at wherever
the backend is actually running (defaults to `http://localhost:3001`).

## What changed from the original

- All EJS templating (`<%= %>`) was replaced with plain JS that fetches JSON
  from the backend and fills in the DOM (`js/app.js`).
- The old `POST /calculate` form-submit route now returns JSON at
  `POST /api/calculate` instead of re-rendering a page.
- `views/rewards.ejs` and `public/css/style.css` became `frontend/index.html`
  and `frontend/css/style.css` — styling and layout are unchanged.
- Business logic (points calculation, referral rules, redemption) is untouched
  in `backend/server.js`.
