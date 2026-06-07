import fetch from 'node-fetch';
async function test() {
  const res = await fetch('http://localhost:4000/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'get_projects' })
  });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Data sample:', data.slice(0, 1));
}
test();
