async function check() {
  try {
    const res = await fetch('https://broker-automation.onrender.com/api/chats');
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response body:', text);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

check();
