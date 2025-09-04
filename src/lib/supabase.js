import { createClient } from '@supabase/supabase-js'

const GK = '__supabase_singleton__'
const g = globalThis

export const supabase =
    g[GK] ||
    (g[GK] = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        {
            auth: {
                storageKey: 'drgo-app-auth',
                persistSession: true,
                autoRefreshToken: true,
            }
        }
    ))