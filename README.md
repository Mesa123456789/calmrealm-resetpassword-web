# Calm Realm Password Reset

A small Vite app for Supabase Auth password recovery redirects. Users land on `/reset-password`, set a new password, then return to Calm Realm to sign in again.

## Local Setup

1. Run `npm install`
2. Copy `.env.example` to `.env` and set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Run `npm run dev`
4. Open `http://localhost:5173/reset-password`

## Vercel Deployment

1. Run `npm install`
2. Run `npm run dev` for local testing
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel
4. Deploy the app to Vercel
5. Add the deployed `/reset-password` URL to Supabase Authentication > URL Configuration > Redirect URLs
6. Use that URL as `redirectTo` when requesting password reset

## Supabase Notes

- This app uses `@supabase/supabase-js` v2.
- Only use the anon/public key in the frontend.
- Never use a `service_role` key in this app.
- The reset form calls `supabase.auth.updateUser({ password: newPassword })` after a valid recovery session is available.
