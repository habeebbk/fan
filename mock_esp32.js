// Mock ESP32 client for local testing
const token = process.env.CONTROL_TOKEN || 'dev_token_sample_1234567890abcdef';
const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';

const commandNames = ['POWER', 'SPEED 1', 'SPEED 2', 'SPEED 3', 'SPEED 4', 'SPEED 5', 'BOOST'];

console.log(`[Mock ESP32] Connected to ${serverUrl}`);
console.log(`[Mock ESP32] Polling every 1 second... Press buttons at http://localhost:3000 to test.`);

setInterval(async () => {
  try {
    const res = await fetch(`${serverUrl}/api/next`, {
      headers: { 'X-Control-Token': token }
    });
    if (res.status === 200) {
      const data = await res.json();
      const cmdName = commandNames[data.id] || `Unknown (${data.id})`;
      console.log(`[Mock ESP32] >>> Received Command: ${cmdName} (ID: ${data.id}) -> Emulating IR NEC code send!`);
    } else if (res.status !== 204) {
      console.log(`[Mock ESP32] Unexpected status: ${res.status}`);
    }
  } catch (err) {
    console.error(`[Mock ESP32] Poll error:`, err.message);
  }
}, 1000);

