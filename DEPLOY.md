# Deploying

## 0. Clear the broken install

A `npm install` that timed out left a partial `web/node_modules`. Delete it first —
nothing depends on it, and OneDrive should not be syncing 316 MB of packages.

PowerShell:
```powershell
cd "$env:USERPROFILE\OneDrive\Desktop\NewPortfolio"
Remove-Item -Recurse -Force web\node_modules
```

## 1. Check it runs locally

```powershell
cd web
npm install
npm run dev
```

Open http://localhost:3000. Try `/lab` (type in the prediction box) and `/lens`
(click "Try a sample posting"). Ctrl-C when satisfied.

## 2. Push to GitHub

From the repo root (`NewPortfolio`, not `web`):

```powershell
cd ..
git init
git add .
git commit -m "Portfolio: Next.js 16 with browser-side NLP models"
```

Then either — with the GitHub CLI:

```powershell
gh repo create portfolio --public --source=. --push
```

— or create an empty repo at https://github.com/new (no README, no .gitignore), then:

```powershell
git remote add origin https://github.com/YOUR-USERNAME/portfolio.git
git branch -M main
git push -u origin main
```

## 3. Deploy on Vercel

1. Go to https://vercel.com/new and import the repo.
2. **Set Root Directory to `web`.** This is the one setting that matters — the Next.js
   app lives in `web/`, not at the repo root. Vercel will fail the build without it.
3. Leave the framework preset (Next.js), build command and output directory as detected.
4. No environment variables are needed.
5. Deploy.

Every later `git push` to `main` redeploys automatically.

## 4. Custom domain (optional)

Vercel → Project → Settings → Domains. A `.dev` or `.com` domain runs roughly
$12–15/year through any registrar; point it at Vercel with the DNS records they show you.

---

### Notes

- The trained model artifacts in `web/public/models/` are committed, so the Vercel build
  needs **no Python**. It is a plain `next build`.
- After editing anything in `web/src/content/`, retrain before pushing:
  ```powershell
  python -m venv .venv
  .venv\Scripts\activate
  pip install -r ml\requirements.txt
  cd web
  npm run models
  ```
- `npm run verify` runs the accessibility, console-error and mobile-overflow checks
  against a running production build (`npm run build` then `npm start` in another shell).
