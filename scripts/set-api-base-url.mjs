// Üretim derlemesi için `environment.ts` içindeki `apiBaseUrl` değerini API_BASE_URL ortam değişkeninden yazar.
// Gizli değer değildir (tarayıcıya zaten gider). Kullanım: API_BASE_URL=https://api.example.com node scripts/set-api-base-url.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const target = new URL('../src/environments/environment.ts', import.meta.url);
const value = process.env.API_BASE_URL?.trim();

if (!value) {
    console.error('API_BASE_URL tanımlı değil.');
    process.exit(1);
}

let url;
try {
    url = new URL(value);
} catch {
    console.error(`API_BASE_URL geçerli bir URL değil: ${value}`);
    process.exit(1);
}

if (url.protocol !== 'https:' || value.endsWith('/') || url.search || url.hash) {
    console.error('API_BASE_URL https ile başlamalı, sonunda "/" olmamalı, sorgu/parça içermemeli (örn. https://api.vetinity.com).');
    process.exit(1);
}

const source = readFileSync(target, 'utf8');
const pattern = /apiBaseUrl:\s*'[^']*'/;
if (!pattern.test(source)) {
    console.error('environment.ts içinde apiBaseUrl bulunamadı.');
    process.exit(1);
}

writeFileSync(target, source.replace(pattern, `apiBaseUrl: '${value}'`));
console.log(`environment.ts apiBaseUrl = ${value}`);
