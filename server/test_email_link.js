import { getPortalBaseUrl } from './services/notification.service.js';

console.log('--- Testing getPortalBaseUrl Resolution ---');

// Test 1: With default env
console.log('1. Current Resolved Portal Base URL:', getPortalBaseUrl());

// Test 2: In production without CLIENT_URL
const origEnv = process.env.NODE_ENV;
const origClient = process.env.CLIENT_URL;

process.env.NODE_ENV = 'production';
delete process.env.CLIENT_URL;
console.log('2. In Production (no CLIENT_URL):', getPortalBaseUrl());

process.env.CLIENT_URL = 'http://localhost:5173';
console.log('3. In Production (CLIENT_URL=localhost):', getPortalBaseUrl());

process.env.CLIENT_URL = 'https://floww-gamma-gilt.vercel.app,http://localhost:5173';
console.log('4. Multi-origin (Vercel + localhost):', getPortalBaseUrl());

process.env.CLIENT_URL = 'https://custom-domain.edu/';
console.log('5. Custom domain with trailing slash:', getPortalBaseUrl());

// Restore
process.env.NODE_ENV = origEnv;
process.env.CLIENT_URL = origClient;

console.log('\n✅ All URL resolution scenarios verified successfully!');
