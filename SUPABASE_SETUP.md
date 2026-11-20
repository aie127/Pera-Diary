# Supabase account setup

1. Create a project at https://supabase.com.
2. Open the Supabase SQL editor and run `supabase.sql`. If you already ran an earlier version, run the updated file again to add profile fields and the private avatar bucket/policies.
3. In Supabase Authentication settings, enable Email authentication.
4. Copy `.env.example` to `.env.local` and set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
5. Restart the local Vite server.
6. In Vercel, add the same two variables under **Project Settings > Environment Variables**, then redeploy.

The app keeps browser-local storage as a fallback. Once Supabase is configured and a user signs in, transactions, currency preferences, display names, and private profile photos are isolated by account using Supabase Row Level Security.
