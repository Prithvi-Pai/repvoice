import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const lines = envContent.split('\n');
let url = '';
let key = '';

for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    url = trimmed.split('=')[1].trim();
  } else if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
    key = trimmed.split('=')[1].trim();
  }
}

async function testSignIn(email, password) {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  console.log(`SignIn ${email}: status ${res.status}`);
  const data = await res.json();
  if (res.status === 200) {
    console.log('Successfully signed in! User ID:', data.user?.id);
    return data;
  } else {
    console.log('SignIn error:', data.msg || data.error_description);
  }
}

async function checkCommon() {
  await testSignIn('test@test.com', 'test123456');
  await testSignIn('user@example.com', 'password123');
  await testSignIn('athlete@repvoice.com', 'Athlete123!');
}

checkCommon();
