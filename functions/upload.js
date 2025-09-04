import { createClient } from '@supabase/supabase-js'

const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}
const json = (data: any, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors } })

export const onRequestOptions: PagesFunction = async () => new Response(null, { headers: cors })

export const onRequestGet: PagesFunction = async () => json({ ok: true, via: 'functions/upload.ts', method: 'GET' })

export const onRequestPost: PagesFunction = async ({ request, env }) => {
    try {
        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
            auth: { persistSession: false, autoRefreshToken: false },
        })

        const auth = request.headers.get('Authorization') || ''
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
        if (!token) return json({ error: '인증 토큰이 없습니다.' }, 401)

        const { data: userData, error } = await supabase.auth.getUser(token)
        if (error || !userData?.user?.id) return json({ error: '사용자 인증 실패' }, 401)
        const uid = userData.user.id

        const form = await request.formData()
        const file = form.get('file') as File | null
        const userId = String(form.get('user_id') || '')
        if (!file || !userId) return json({ error: '파일과 사용자 ID가 필요합니다.' }, 400)
        if (userId !== uid) return json({ error: '사용자 불일치' }, 403)

        const ext = (file.name || 'file').split('.').pop() || 'bin'
        const key = `${crypto.randomUUID()}.${ext}`

        // R2 바인딩 이름: MY_BUCKET
        await env.MY_BUCKET.put(key, file.stream(), {
            httpMetadata: { contentType: file.type || 'application/octet-stream' },
        })
        const publicUrl = `${env.R2_PUBLIC_URL}/${encodeURIComponent(key)}`
        return json({ ok: true, key, publicUrl, userId: uid })
    } catch (e: any) {
        return json({ error: e?.message || '서버 에러' }, 500)
    }
}