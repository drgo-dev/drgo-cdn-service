// _worker.js (디버그 버전)
export default {
    async fetch(request, env) {
        const url = new URL(request.url)

        if (url.pathname === '/upload' && request.method === 'GET') {
            return new Response(JSON.stringify({ ok: true, via: '_worker.js', method: 'GET' }), {
                headers: { 'Content-Type': 'application/json' },
            })
        }

        if (url.pathname === '/upload' && request.method === 'POST') {
            return new Response(JSON.stringify({ ok: true, via: '_worker.js', method: 'POST' }), {
                headers: { 'Content-Type': 'application/json' },
            })
        }

        // 나머지는 정적 에셋 전달
        return env.ASSETS.fetch(request)
    },
}