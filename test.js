const test = require('node:test');
const assert = require('node:assert/strict');

const BASE_URL = process.env.SERVER_URL || 'http://localhost:3000';
const TOKEN = process.env.CONTROL_TOKEN || 'dev_token_sample_1234567890abcdef';

test('1. Health check endpoint responds with {ok: true}', async () => {
  const res = await fetch(`${BASE_URL}/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.deepEqual(data, { ok: true });
});

test('2. Web UI root endpoint returns HTML page', async () => {
  const res = await fetch(`${BASE_URL}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /text\/html/);
  const html = await res.text();
  assert.match(html, /Smart Fan Control/);
});

test('3. Unauthorized request without token returns 401', async () => {
  const res = await fetch(`${BASE_URL}/api/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 0 })
  });
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.error, 'Unauthorized');
});

test('4. Unauthorized request with incorrect token returns 401', async () => {
  const res = await fetch(`${BASE_URL}/api/command`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Control-Token': 'wrong_invalid_token_1234567890'
    },
    body: JSON.stringify({ id: 0 })
  });
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.error, 'Unauthorized');
});

test('5. Valid token but invalid command ID returns 400', async () => {
  for (const badId of [-1, 7, 100, 'abc', null]) {
    const res = await fetch(`${BASE_URL}/api/command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Control-Token': TOKEN
      },
      body: JSON.stringify({ id: badId })
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error, 'Invalid command');
  }
});

test('6. Valid command queuing and ESP32 polling flow', async () => {
  // Queue a command (ID 2 = SPEED 2)
  const postRes = await fetch(`${BASE_URL}/api/command`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Control-Token': TOKEN
    },
    body: JSON.stringify({ id: 2 })
  });
  assert.equal(postRes.status, 200);
  const postData = await postRes.json();
  assert.equal(postData.queued, true);
  assert.equal(postData.name, 'SPEED 2');

  // Next fetch by ESP32 receives the queued command
  const getRes = await fetch(`${BASE_URL}/api/next`, {
    headers: { 'X-Control-Token': TOKEN }
  });
  assert.equal(getRes.status, 200);
  const getData = await getRes.json();
  assert.equal(getData.id, 2);

  // Subsequent fetch gets 204 No Content because queue is drained
  const emptyRes = await fetch(`${BASE_URL}/api/next`, {
    headers: { 'X-Control-Token': TOKEN }
  });
  assert.equal(emptyRes.status, 204);
});

