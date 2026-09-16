const assert = require('assert');

const server = require('../server.js');

const { hasRealSupabaseConfig, looksLikePlaceholderValue } = server;

assert.strictEqual(typeof looksLikePlaceholderValue, 'function');
assert.strictEqual(hasRealSupabaseConfig('https://example.supabase.co', 'anon-key'), true);
assert.strictEqual(hasRealSupabaseConfig('https://YOUR_PROJECT_REF.supabase.co', 'your-service-role-key'), false);
assert.strictEqual(hasRealSupabaseConfig('', 'anon-key'), false);

console.log('supabase-config tests passed');
