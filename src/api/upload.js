// src/api/upload.js
import { supabase } from '@/lib/supabase';

const ENDPOINT =
    import.meta.env.VITE_UPLOAD_ENDPOINT || 'https://drgo-cdn-service.pages.dev/upload';

export async function uploadToR2(file) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('로그인이 필요합니다.');

    const form = new FormData();
    form.append('file', file);
    form.append('user_id', session.user.id);

    const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: form,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) {
        throw new Error(data?.error || `업로드 실패 (${response.status})`);
    }
    return data; // { ok, key, publicUrl, userId, record }
}