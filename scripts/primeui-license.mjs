// PrimeNG 22 lisans anahtarı (PrimeUI Community/Commercial) depoya girmez: git'in yok saydığı
// `primeui-license.local.ts` dosyalarında durur (panel ve portal; portal kendi kök klasörü dışından içe aktaramaz).
// - PRIMEUI_LICENSE ortam değişkeni verilirse iki dosyaya da yazılır (CI: depo gizli değişkeni; yerelde de kullanılabilir).
// - Verilmezse eksik dosya boş anahtarla oluşturulur (npm install sonrası; derleme kırılmaz, PrimeNG yalnız
//   "Invalid PrimeUI License" uyarısı gösterir). Var olan yerel dosyaya dokunulmaz.
// Yerelde: PRIMEUI_LICENSE=... node scripts/primeui-license.mjs  (ya da iki dosyadaki boş metne yapıştırın).
import { existsSync, writeFileSync } from 'node:fs';

const targets = [new URL('../src/environments/primeui-license.local.ts', import.meta.url), new URL('../projects/portal/src/environments/primeui-license.local.ts', import.meta.url)];
const key = process.env.PRIMEUI_LICENSE?.trim() ?? '';

const content = (value) =>
    [
        '// Yerel dosya, depoya girmez (.gitignore). Kaynak: primeui.store > Account > PrimeUI > büyüteç. Bkz. scripts/primeui-license.mjs',
        `export const PRIMEUI_LICENSE = '${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}';`,
        ''
    ].join('\n');

for (const target of targets) {
    if (key) {
        writeFileSync(target, content(key), 'utf8');
    } else if (!existsSync(target)) {
        writeFileSync(target, content(''), 'utf8');
        console.log(`${target.pathname.split('/').slice(-4).join('/')} boş anahtarla oluşturuldu.`);
    }
}

if (key) {
    console.log('PrimeUI lisans anahtarı yazıldı (değer gösterilmez).');
}
