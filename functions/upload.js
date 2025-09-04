// functions/upload.js
import { createClient } from '@supabase/supabase-js';
const publicUrl = `${env.R2_PUBLIC_URL}/${encodeURIComponent(key)}`
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
    // 헬스체크 (브라우저로 GET /upload 열면 JSON이 떠야 정상)
    return json({ ok: true, via: 'functions/upload.js' });
}

export async function onRequestPost({ request, env }) {
    try {
        // 1) Supabase 토큰 검증 (Service Key 사용)
        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
            auth: { persistSession: false, autoRefreshToken: false },
        });

        const auth = request.headers.get('Authorization') || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
        if (!token) return json({ error: '인증 토큰이 없습니다.' }, 401);

        const { data: userData, error: userErr } = await supabase.auth.getUser(token);
        if (userErr || !userData || !userData.user || !userData.user.id) {
            return json({ error: '사용자 인증 실패' }, 401);
        }
        const uid = userData.user.id;

        // 2) FormData 파싱
        const form = await request.formData();
        const file = form.get('file');
        const userId = String(form.get('user_id') || '');
        if (!file || !userId) return json({ error: '파일과 사용자 ID가 필요합니다.' }, 400);
        if (userId !== uid) return json({ error: '사용자 불일치' }, 403);

        // (선택) 제한
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

        // 4) DB insert (서버에서 처리: service key → RLS 무시)
        const fileType =
            (file.type || '').startsWith('image/') ? 'image'
                : (file.type || '').startsWith('audio/') ? 'audio'
                    : 'other';

        const size = typeof file.size === 'number' ? file.size : null;

        const { data: record, error: dbErr } = await supabase
            .from('signatures')
            .insert({
                user_id: uid,
                file_name: name,
                file_url: publicUrl,
                file_type: fileType,
                size: size,
            })
            .select()
            .single();

        if (dbErr) throw dbErr;

        return json({ ok: true, key, publicUrl, userId: uid, record });
    } catch (e) {
        return json({ error: (e && e.message) || '서버 에러' }, 500);
    }
}