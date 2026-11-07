// Klinik sitesini yerelde açar (`npm run start:site`, http://localhost:4400/k/{adres}). Yalnız geliştirme: sunucu yerel API'nin geliştirme
// sertifikasına işletim sisteminin güven deposundan bakar, görseller geliştirme vekilinden gelir, TLS denetimi kapatılmaz.
import { spawn } from 'node:child_process';

const child = spawn('npx', ['ng', 'serve', 'site', ...process.argv.slice(2)], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
        ...process.env,
        NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --use-system-ca`.trim(),
        SITE_PUBLIC_API_BASE_URL: process.env.SITE_PUBLIC_API_BASE_URL ?? '',
        SITE_PUBLIC_ORIGIN: process.env.SITE_PUBLIC_ORIGIN ?? 'http://localhost:4400'
    }
});

child.on('exit', (code) => process.exit(code ?? 0));
