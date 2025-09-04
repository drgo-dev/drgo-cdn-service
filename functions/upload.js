// functions/upload.js
const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const json = (data, status = 200) =>
    new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...cors },
    });

export async function onRequestOptions() {
    return new Response(null, { headers: cors });
}

export async function onRequestGet() {
    return json({ ok: true, via: 'functions/upload.js', method: 'GET' });
}

export async function onRequestPost() {
    // 일단 라우팅만 확인
    return json({ ok: true, via: 'functions/upload.js', method: 'POST' });
}