// Üretim derlemesi için API adresini API_BASE_URL ortam değişkeninden yazar (ADR-033: panel ve portal aynı API host'unu kullanır):
//   - panel  `src/environments/environment.ts`                 → `apiBaseUrl: <API_BASE_URL>`
//   - portal `projects/portal/src/environments/environment.ts` → `portalApiBaseUrl: <API_BASE_URL>/api/portal/v1`
// Gizli değer değildir (tarayıcıya zaten gider). Kullanım: API_BASE_URL=https://api.example.com node scripts/set-api-base-url.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const PORTAL_API_PATH = '/api/portal/v1';

const targets = [
    { file: new URL('../src/environments/environment.ts', import.meta.url), key: 'apiBaseUrl', suffix: '' },
    { file: new URL('../projects/portal/src/environments/environment.ts', import.meta.url), key: 'portalApiBaseUrl', suffix: PORTAL_API_PATH }
];

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

// Önce iki dosya da doğrulanır, sonra yazılır: biri bozuksa diğeri de değişmez.
const edits = targets.map(({ file, key, suffix }) => {
    const source = readFileSync(file, 'utf8');
    const pattern = new RegExp(`${key}:\\s*'[^']*'`);
    if (!pattern.test(source)) {
        console.error(`${file.pathname} içinde ${key} bulunamadı.`);
        process.exit(1);
    }
    const next = `${value}${suffix}`;
    return { file, key, next, content: source.replace(pattern, `${key}: '${next}'`) };
});

for (const { file, key, next, content } of edits) {
    writeFileSync(file, content);
    console.log(`${key} = ${next}`);
}
