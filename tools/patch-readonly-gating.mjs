import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const IMPORT = "import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';\n";
const BANNER_MARKER = 'salt okunur moddadır; kayıt oluşturulamaz';
const BANNER_MARKER_EDIT = 'salt okunur moddadır; değişiklik kaydedilemez';

const BANNER_NEW = `            @if (ro.mutationBlocked()) {
                <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">
                    İşletme salt okunur moddadır; kayıt oluşturulamaz.
                </p>
            }
`;
const BANNER_EDIT = `                @if (ro.mutationBlocked()) {
                    <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">
                        İşletme salt okunur moddadır; değişiklik kaydedilemez.
                    </p>
                }
`;

function addImport(src) {
    if (src.includes('TenantReadOnlyContextService')) return src;
    const comp = src.indexOf('@Component');
    if (comp < 0) return src;
    const head = src.slice(0, comp);
    const lastImportIdx = head.lastIndexOf('\nimport ');
    if (lastImportIdx < 0) return src;
    const endLine = src.indexOf('\n', lastImportIdx + 1);
    return src.slice(0, endLine + 1) + IMPORT + src.slice(endLine + 1);
}

function addRoInject(src) {
    if (src.includes('readonly ro = inject(TenantReadOnlyContextService)')) return src;
    const m = src.match(/private readonly auth = inject\(AuthService\);/);
    if (m) {
        return src.replace(m[0], `${m[0]}\n    readonly ro = inject(TenantReadOnlyContextService);`);
    }
    const m2 = src.match(/private readonly fb = inject\(FormBuilder\);/);
    if (m2) {
        return src.replace(m2[0], `${m2[0]}\n    readonly ro = inject(TenantReadOnlyContextService);`);
    }
    return src;
}

function patchSubmitDisabled(src) {
    return src.replace(/\[disabled\]="(form\.invalid \|\| submitting\(\)[^"]*)"/g, (full, inner) => {
        if (inner.includes('ro.mutationBlocked')) return full;
        return `[disabled]="${inner} || ro.mutationBlocked()"`;
    });
}

function patchQuickClient(src) {
    return src.replace(
        /(label="Yeni müşteri"[\s\S]*?icon="pi pi-user-plus")([\s\S]*?)\(onClick\)="quickClientOpen/g,
        (block) => {
            if (block.includes('[disabled]="ro.mutationBlocked()"')) return block;
            return block.replace(/icon="pi pi-user-plus"/, 'icon="pi pi-user-plus"\n                                    [disabled]="ro.mutationBlocked()"');
        }
    );
}

function patchNewFile(rel) {
    const file = path.join(root, 'src/app/features', rel);
    let s = fs.readFileSync(file, 'utf8');
    s = addImport(s);
    s = addRoInject(s);
    if (!s.includes(BANNER_MARKER)) {
        if (s.includes('@if (selectionError())')) {
            s = s.replace(/<div class="card">\s*\n\s*@if \(selectionError/, `<div class="card">\n${BANNER_NEW}            @if (selectionError`);
        } else {
            s = s.replace(
                /<div class="card">\s*\n\s*<p class="text-sm text-muted-color/,
                `<div class="card">\n${BANNER_NEW}            <p class="text-sm text-muted-color`
            );
        }
    }
    s = patchSubmitDisabled(s);
    s = patchQuickClient(s);
    fs.writeFileSync(file, s);
}

function patchEditFile(rel) {
    const file = path.join(root, 'src/app/features', rel);
    let s = fs.readFileSync(file, 'utf8');
    s = addImport(s);
    s = addRoInject(s);
    if (!s.includes(BANNER_MARKER_EDIT)) {
        if (s.includes('@if (selectionError())')) {
            s = s.replace(/<div class="card">\s*\n\s*@if \(selectionError/, `<div class="card">\n${BANNER_EDIT}                @if (selectionError`);
        } else {
            s = s.replace(
                /<div class="card">\s*\n\s*<p class="text-sm text-muted-color/,
                `<div class="card">\n${BANNER_EDIT}                <p class="text-sm text-muted-color`
            );
        }
    }
    s = patchSubmitDisabled(s);
    s = patchQuickClient(s);
    fs.writeFileSync(file, s);
}

const news = [
    'examinations/pages/examination-new-page/examination-new-page.component.ts',
    'vaccinations/pages/vaccination-new-page/vaccination-new-page.component.ts',
    'payments/pages/payment-new-page/payment-new-page.component.ts',
    'treatments/pages/treatment-new-page/treatment-new-page.component.ts',
    'prescriptions/pages/prescription-new-page/prescription-new-page.component.ts',
    'lab-results/pages/lab-result-new-page/lab-result-new-page.component.ts',
    'hospitalizations/pages/hospitalization-new-page/hospitalization-new-page.component.ts'
];
const edits = [
    'examinations/pages/examination-edit-page/examination-edit-page.component.ts',
    'vaccinations/pages/vaccination-edit-page/vaccination-edit-page.component.ts',
    'payments/pages/payment-edit-page/payment-edit-page.component.ts',
    'treatments/pages/treatment-edit-page/treatment-edit-page.component.ts',
    'prescriptions/pages/prescription-edit-page/prescription-edit-page.component.ts',
    'lab-results/pages/lab-result-edit-page/lab-result-edit-page.component.ts',
    'hospitalizations/pages/hospitalization-edit-page/hospitalization-edit-page.component.ts'
];

for (const f of news) patchNewFile(f);
for (const f of edits) patchEditFile(f);
console.log('done', news.length + edits.length, 'files');
