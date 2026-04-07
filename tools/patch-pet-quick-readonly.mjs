import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const files = [
    'src/app/features/examinations/pages/examination-new-page/examination-new-page.component.ts',
    'src/app/features/examinations/pages/examination-edit-page/examination-edit-page.component.ts',
    'src/app/features/payments/pages/payment-new-page/payment-new-page.component.ts',
    'src/app/features/payments/pages/payment-edit-page/payment-edit-page.component.ts',
    'src/app/features/treatments/pages/treatment-new-page/treatment-new-page.component.ts',
    'src/app/features/treatments/pages/treatment-edit-page/treatment-edit-page.component.ts',
    'src/app/features/prescriptions/pages/prescription-new-page/prescription-new-page.component.ts',
    'src/app/features/prescriptions/pages/prescription-edit-page/prescription-edit-page.component.ts',
    'src/app/features/lab-results/pages/lab-result-new-page/lab-result-new-page.component.ts',
    'src/app/features/lab-results/pages/lab-result-edit-page/lab-result-edit-page.component.ts'
];

const block = `        if (this.ro.mutationBlocked()) {
            return true;
        }
`;

for (const rel of files) {
    const file = path.join(root, rel);
    let s = fs.readFileSync(file, 'utf8');
    if (!s.includes('petQuickAddDisabled(): boolean')) continue;
    if (s.includes('ro.mutationBlocked()') && s.includes('petQuickAddDisabled(): boolean')) {
        const idx = s.indexOf('petQuickAddDisabled(): boolean');
        const slice = s.slice(idx, idx + 200);
        if (slice.includes('ro.mutationBlocked()')) continue;
    }
    s = s.replace(
        /    petQuickAddDisabled\(\): boolean \{\n        if \(this\.contextFromAppointment\(\)\) \{\n            return true;\n        \}\n        return /,
        `    petQuickAddDisabled(): boolean {\n${block}        if (this.contextFromAppointment()) {\n            return true;\n        }\n        return `
    );
    s = s.replace(
        /    petQuickAddDisabled\(\): boolean \{\n        if \(this\.contextFromExamination\(\)\) \{\n            return true;\n        \}\n        return /g,
        `    petQuickAddDisabled(): boolean {\n${block}        if (this.contextFromExamination()) {\n            return true;\n        }\n        return `
    );
    s = s.replace(
        /    petQuickAddDisabled\(\): boolean \{\n        return !trimClientIdControlValue/,
        `    petQuickAddDisabled(): boolean {\n${block}        return !trimClientIdControlValue`
    );
    fs.writeFileSync(file, s);
}
console.log('pet quick patch ok');
