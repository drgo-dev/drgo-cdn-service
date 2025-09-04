// functions/upload.js
import { createClient } from '@supabase/supabase-js';

const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...cors },
    });
}

export async function onRequestOptions() {
    return new Response(null, { headers: cors });
}

export async function onRequestGet() {
    // 헬스체크용
    return json({ ok: true, via: 'functions/upload.js' });
}

export async function onRequestPost({ request, env }) {
    try {
        // 1) Supabase 토큰 검증
        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
            auth: { persistSession: false, autoRefreshToken: false },
        });

        const auth = request.headers.get('Authorization') || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
        if (!token) return json({ error: '인증 토큰이 없습니다.' }, 401);

        const { data: userData, error } = await supabase.auth.getUser(token);
        if (error || !userData || !userData.user || !userData.user.id) {
            return json({ error: '사용자 인증 실패' }, 401);
        }
        const uid = userData.user.id;

        // 2) 폼 파싱
        const form = await request.formData();
        const file = form.get('file');
        const userId = String(form.get('user_id') || '');
        if (!file || !userId) return json({ error: '파일과 사용자 ID가 필요합니다.' }, 400);
        if (userId !== uid) return json({ error: '사용자 불일치' }, 403);

        // (선택) 파일 제한
        // if (file.size && file.size > 10 * 1024 * 1024) return json({ error: '파일이 너무 큽니다.' }, 413);
        // const okType = ['image/', 'audio/'].some(p => (file.type || '').startsWith(p));
        // if (!okType) return json({ error: '허용되지 않는 형식' }, 415);

        // 3) R2 업로드 (바인딩: MY_BUCKET)
        const name = file.name || 'file';
        const ext = name.includes('.') ? name.split('.').pop() : 'bin';
        const key = `${crypto.randomUUID()}.${ext}`;

        await env.MY_BUCKET.put(key, file.stream(), {
            httpMetadata: { contentType: file.type || 'application/octet-stream' },
        });

        const publicUrl = `${env.R2_PUBLIC_URL}/${encodeURIComponent(key)}`;
        return json({ ok: true, key, publicUrl, userId: uid });
    } catch (e) {
        return json({ error: (e && e.message) || '서버 에러' }, 500);
    }
}
await supabase.from('signatures').insert({
    user_id: session.user.id,
    file_name: file.name,
    file_url: data.publicUrl,
    file_type: file.type.startsWith('image/') ? 'image' : 'audio',
    size: file.size,
});