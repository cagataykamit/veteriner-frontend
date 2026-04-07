import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const IMPORT = "import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';\n";

const patches = [
    {
        rel: 'src/app/features/examinations/pages/examinations-list-page/examinations-list-page.component.ts',
        old: `        <app-page-header title="Muayeneler" subtitle="Klinik" description="Muayene kayıtları ve takip.">
            <a actions routerLink="/panel/examinations/new" pButton type="button" label="Yeni Muayene" icon="pi pi-plus" class="p-button-primary"></a>
        </app-page-header>`,
        neu: `        <app-page-header title="Muayeneler" subtitle="Klinik" description="Muayene kayıtları ve takip.">
            @if (!ro.mutationBlocked()) {
                <a actions routerLink="/panel/examinations/new" pButton type="button" label="Yeni Muayene" icon="pi pi-plus" class="p-button-primary"></a>
            } @else {
                <button
                    actions
                    pButton
                    type="button"
                    label="Yeni Muayene (salt okunur)"
                    icon="pi pi-lock"
                    [disabled]="true"
                    class="p-button-secondary"
                ></button>
            }
        </app-page-header>`,
        classNeedle: 'export class ExaminationsListPageComponent',
        injectAfter: 'readonly copy = PANEL_COPY;\n'
    },
    {
        rel: 'src/app/features/vaccinations/pages/vaccinations-list-page/vaccinations-list-page.component.ts',
        old: `            <a actions routerLink="/panel/vaccinations/new" pButton type="button" label="Yeni Aşı" icon="pi pi-plus" class="p-button-primary"></a>`,
        neu: `            @if (!ro.mutationBlocked()) {
                <a actions routerLink="/panel/vaccinations/new" pButton type="button" label="Yeni Aşı" icon="pi pi-plus" class="p-button-primary"></a>
            } @else {
                <button
                    actions
                    pButton
                    type="button"
                    label="Yeni Aşı (salt okunur)"
                    icon="pi pi-lock"
                    [disabled]="true"
                    class="p-button-secondary"
                ></button>
            }`,
        classNeedle: 'export class VaccinationsListPageComponent',
        injectAfter: 'readonly copy = PANEL_COPY;\n'
    },
    {
        rel: 'src/app/features/payments/pages/payments-list-page/payments-list-page.component.ts',
        old: `            <a actions routerLink="/panel/payments/new" pButton type="button" label="Yeni Ödeme" icon="pi pi-plus" class="p-button-primary"></a>`,
        neu: `            @if (!ro.mutationBlocked()) {
                <a actions routerLink="/panel/payments/new" pButton type="button" label="Yeni Ödeme" icon="pi pi-plus" class="p-button-primary"></a>
            } @else {
                <button
                    actions
                    pButton
                    type="button"
                    label="Yeni Ödeme (salt okunur)"
                    icon="pi pi-lock"
                    [disabled]="true"
                    class="p-button-secondary"
                ></button>
            }`,
        classNeedle: 'export class PaymentsListPageComponent',
        injectAfter: 'readonly copy = PANEL_COPY;\n'
    },
    {
        rel: 'src/app/features/treatments/pages/treatments-list-page/treatments-list-page.component.ts',
        old: `            <a actions routerLink="/panel/treatments/new" pButton type="button" label="Yeni Tedavi" icon="pi pi-plus" class="p-button-primary"></a>`,
        neu: `            @if (!ro.mutationBlocked()) {
                <a actions routerLink="/panel/treatments/new" pButton type="button" label="Yeni Tedavi" icon="pi pi-plus" class="p-button-primary"></a>
            } @else {
                <button
                    actions
                    pButton
                    type="button"
                    label="Yeni Tedavi (salt okunur)"
                    icon="pi pi-lock"
                    [disabled]="true"
                    class="p-button-secondary"
                ></button>
            }`,
        classNeedle: 'export class TreatmentsListPageComponent',
        injectAfter: 'readonly copy = PANEL_COPY;\n'
    },
    {
        rel: 'src/app/features/prescriptions/pages/prescriptions-list-page/prescriptions-list-page.component.ts',
        old: `            <a actions routerLink="/panel/prescriptions/new" pButton type="button" label="Yeni Reçete" icon="pi pi-plus" class="p-button-primary"></a>`,
        neu: `            @if (!ro.mutationBlocked()) {
                <a actions routerLink="/panel/prescriptions/new" pButton type="button" label="Yeni Reçete" icon="pi pi-plus" class="p-button-primary"></a>
            } @else {
                <button
                    actions
                    pButton
                    type="button"
                    label="Yeni Reçete (salt okunur)"
                    icon="pi pi-lock"
                    [disabled]="true"
                    class="p-button-secondary"
                ></button>
            }`,
        classNeedle: 'export class PrescriptionsListPageComponent',
        injectAfter: 'readonly copy = PANEL_COPY;\n'
    },
    {
        rel: 'src/app/features/lab-results/pages/lab-results-list-page/lab-results-list-page.component.ts',
        old: `            <a actions routerLink="/panel/lab-results/new" pButton type="button" label="Yeni kayıt" icon="pi pi-plus" class="p-button-primary"></a>`,
        neu: `            @if (!ro.mutationBlocked()) {
                <a actions routerLink="/panel/lab-results/new" pButton type="button" label="Yeni kayıt" icon="pi pi-plus" class="p-button-primary"></a>
            } @else {
                <button
                    actions
                    pButton
                    type="button"
                    label="Yeni kayıt (salt okunur)"
                    icon="pi pi-lock"
                    [disabled]="true"
                    class="p-button-secondary"
                ></button>
            }`,
        classNeedle: 'export class LabResultsListPageComponent',
        injectAfter: 'readonly copy = PANEL_COPY;\n'
    },
    {
        rel: 'src/app/features/hospitalizations/pages/hospitalizations-list-page/hospitalizations-list-page.component.ts',
        old: `            <a actions routerLink="/panel/hospitalizations/new" pButton type="button" label="Yeni yatış" icon="pi pi-plus" class="p-button-primary"></a>`,
        neu: `            @if (!ro.mutationBlocked()) {
                <a actions routerLink="/panel/hospitalizations/new" pButton type="button" label="Yeni yatış" icon="pi pi-plus" class="p-button-primary"></a>
            } @else {
                <button
                    actions
                    pButton
                    type="button"
                    label="Yeni yatış (salt okunur)"
                    icon="pi pi-lock"
                    [disabled]="true"
                    class="p-button-secondary"
                ></button>
            }`,
        classNeedle: 'export class HospitalizationsListPageComponent',
        injectAfter: 'readonly copy = PANEL_COPY;\n'
    }
];

for (const p of patches) {
    const file = path.join(root, p.rel);
    let s = fs.readFileSync(file, 'utf8');
    if (!s.includes('TenantReadOnlyContextService')) {
        const comp = s.indexOf('@Component');
        const head = s.slice(0, comp);
        const lastImportIdx = head.lastIndexOf('\nimport ');
        const endLine = s.indexOf('\n', lastImportIdx + 1);
        s = s.slice(0, endLine + 1) + IMPORT + s.slice(endLine + 1);
    }
    if (!s.includes(p.old.trim())) {
        console.error('miss', p.rel);
        continue;
    }
    s = s.replace(p.old, p.neu);
    const inj = `${p.injectAfter}    readonly ro = inject(TenantReadOnlyContextService);\n`;
    if (!s.includes('readonly ro = inject(TenantReadOnlyContextService)')) {
        s = s.replace(p.injectAfter, inj);
    }
    fs.writeFileSync(file, s);
    console.log('ok', p.rel);
}
