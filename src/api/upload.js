import { supabase } from '@/lib/supabase'
const UPLOAD_ENDPOINT = import.meta.env.VITE_UPLOAD_ENDPOINT || '/upload'

export async function uploadToR2(file) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('로그인이 필요합니다.')

    const form = new FormData()
    form.append('file', file)
    form.append('user_id', session.user.id)

    const res = await fetch(UPLOAD_ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: form,
    })

    const json = await res.json().catch(() => ({}))
    if (!res.ok || !json?.ok) throw new Error(json?.error || `업로드 실패 (${res.status})`)
    return json // { ok, key, publicUrl, userId }
}