import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import worker from '../src/index.js';

const accessCode = 'a'.repeat(64);
const origin = 'https://squaredlemon.github.io';

function createEnv(overrides) {
    return Object.assign({
        GEMINI_API_KEY: 'test-gemini-secret',
        GEMINI_MODEL: 'gemini-3.5-flash-lite',
        LEMON_AI_ACCESS_TOKEN: accessCode,
        ALLOWED_ORIGINS: origin + ',http://127.0.0.1:8785',
        AI_RATE_LIMITER: { limit: async function() { return { success: true }; } }
    }, overrides || {});
}

function request(path, options) {
    return new Request('https://lemon-station-ai.example.workers.dev' + path, Object.assign({
        headers: {
            Origin: origin,
            Authorization: 'Bearer ' + accessCode
        }
    }, options || {}));
}

let originalFetch;
afterEach(function() {
    if (originalFetch) globalThis.fetch = originalFetch;
    originalFetch = undefined;
});

test('health endpoint requires the private access code', async function() {
    const response = await worker.fetch(new Request('https://worker.example/health', {
        headers: { Origin: origin }
    }), createEnv());
    assert.equal(response.status, 401);
});

test('browser origins outside the allowlist are rejected', async function() {
    const response = await worker.fetch(new Request('https://worker.example/health', {
        headers: { Origin: 'https://untrusted.example', Authorization: 'Bearer ' + accessCode }
    }), createEnv());
    assert.equal(response.status, 403);
});

test('valid health checks report the Gemini model without exposing secrets', async function() {
    const response = await worker.fetch(request('/health'), createEnv());
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(data, { ok: true, provider: 'Gemini', model: 'gemini-3.5-flash-lite' });
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
    assert.equal(JSON.stringify(data).includes('test-gemini-secret'), false);
});

test('native desktop requests without a browser origin still require the access code', async function() {
    const response = await worker.fetch(new Request('https://worker.example/health', {
        headers: { Authorization: 'Bearer ' + accessCode }
    }), createEnv());
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
});

test('valid chat requests are sent to Gemini with the server-side key', async function() {
    originalFetch = globalThis.fetch;
    let upstreamRequest;
    globalThis.fetch = async function(url, options) {
        upstreamRequest = { url: String(url), options: options };
        return new Response(JSON.stringify({
            candidates: [{ content: { parts: [{ text: 'Start with one small step.' }] } }]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
    const response = await worker.fetch(request('/api/chat', {
        method: 'POST',
        headers: {
            Origin: origin,
            Authorization: 'Bearer ' + accessCode,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messages: [{ role: 'user', text: 'Help me get started.' }],
            context: { openTasks: ['Write a draft'] }
        })
    }), createEnv());
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(data, { reply: 'Start with one small step.' });
    assert.match(upstreamRequest.url, /gemini-3\.5-flash-lite:generateContent$/);
    assert.equal(upstreamRequest.options.headers['x-goog-api-key'], 'test-gemini-secret');
    const body = JSON.parse(upstreamRequest.options.body);
    assert.equal(body.contents[0].role, 'user');
    assert.match(body.systemInstruction.parts[0].text, /Write a draft/);
});

test('Gemini upstream errors are sanitized before reaching the browser', async function() {
    originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
        return new Response('private upstream error detail', { status: 403 });
    };
    const response = await worker.fetch(request('/api/chat', {
        method: 'POST',
        headers: {
            Origin: origin,
            Authorization: 'Bearer ' + accessCode,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages: [{ role: 'user', text: 'Hello' }] })
    }), createEnv());
    const data = await response.json();
    assert.equal(response.status, 502);
    assert.equal(data.error, 'Gemini rejected the Worker API key. Check GEMINI_API_KEY in Cloudflare.');
    assert.equal(JSON.stringify(data).includes('private upstream error detail'), false);
});

test('invalid chat payloads and rate-limited requests do not reach Gemini', async function() {
    originalFetch = globalThis.fetch;
    let upstreamCalls = 0;
    globalThis.fetch = async function() {
        upstreamCalls += 1;
        throw new Error('Upstream should not be called.');
    };
    const invalid = await worker.fetch(request('/api/chat', {
        method: 'POST',
        headers: {
            Origin: origin,
            Authorization: 'Bearer ' + accessCode,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages: [] })
    }), createEnv());
    assert.equal(invalid.status, 400);
    const limited = await worker.fetch(request('/api/chat', {
        method: 'POST',
        headers: {
            Origin: origin,
            Authorization: 'Bearer ' + accessCode,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages: [{ role: 'user', text: 'Hello' }] })
    }), createEnv({ AI_RATE_LIMITER: { limit: async function() { return { success: false }; } } }));
    assert.equal(limited.status, 429);
    assert.equal(upstreamCalls, 0);
});
