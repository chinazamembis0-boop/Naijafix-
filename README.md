# NaijaFix

NaijaFix is a Nigerian local-services marketplace built with React, Vite, and Supabase. It connects customers with trusted local service providers and includes food ordering, delivery, and provider verification.

## Tech Stack

- **Frontend:** React 19 + Vite
- **Backend:** Supabase (PostgreSQL, Auth, Storage, RLS)
- **Maps:** Leaflet + React-Leaflet
- **Analytics:** Vercel Web Analytics
- **Deployment:** Vercel

## Getting Started

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Start the development server:
   ```
   npm run dev
   ```

## Production Build

```
npm run build
```

## Supabase Migrations

SQL migration files are located in the `supabase/` directory. Apply them in order using the Supabase SQL Editor.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous/public key |
