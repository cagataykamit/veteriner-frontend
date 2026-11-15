import type { MockedObject } from 'vitest';
import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { IMPORTS_ROUTE } from '@/app/core/routing/panel-navigation';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import type { ImportBatchDto, ImportSourceProfileCode, ImportSourceProfileDto, ImportTableSummaryDto, ImportUploadEvent } from '@/app/features/imports/models/import-api.model';
import { ImportUploadPageComponent } from '@/app/features/imports/pages/import-upload-page.component';
import { ImportsService } from '@/app/features/imports/services/imports.service';

const profiles: ImportSourceProfileDto[] = [
    { code: 'Generic', displayName: 'Genel Excel / CSV', note: 'Genel', verified: true, mappings: [] },
    { code: 'Kolayvet', displayName: 'Kolayvet', note: 'Kolayvet dışa aktarımı', verified: false, mappings: [] },
    { code: 'EVet', displayName: 'E-vet', note: 'E-vet yedeği', verified: true, mappings: [] }
];

const zero: ImportTableSummaryDto = { total: 0, valid: 0, warning: 0, error: 0, willCreate: 0, willMatch: 0, willSkip: 0, created: 0, matched: 0, skipped: 0, failed: 0 };

const uploaded: ImportBatchDto = {
    id: 'b1',
    status: 'Uploaded',
    name: null,
    clinicId: 'c1',
    validationId: null,
    createdAtUtc: '2026-11-11T08:00:00Z',
    updatedAtUtc: null,
    validatedAtUtc: null,
    committedAtUtc: null,
    rolledBackAtUtc: null,
    remindersReleasedAtUtc: null,
    payloadPurgedAtUtc: null,
    summary: { customers: zero, pets: zero, vaccinations: zero, clinicalRecords: zero, accountEntries: zero, appointments: zero, products: zero },
    warnings: [{ code: 'Imports.EVetConversion', message: 'Randevu Listesi: 3 görev aktarılmayacak.' }]
};

const file = (name: string) => new File(['ornek'], name);

describe('ImportUploadPageComponent', () => {
    let fixture: ComponentFixture<ImportUploadPageComponent>;
    let page: ImportUploadPageComponent;
    let el: HTMLElement;
    let imports: MockedObject<ImportsService>;

    function create(): void {
        imports = {
            getSourceProfiles: vi.fn().mockReturnValue(of(profiles)),
            createBatch: vi.fn().mockReturnValue(of({ type: 'progress', percent: 100 }, { type: 'done', batch: uploaded })),
            listBatches: vi.fn().mockReturnValue(of({ items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 })),
            downloadTemplate: vi.fn()
        } as unknown as MockedObject<ImportsService>;
        TestBed.configureTestingModule({
            imports: [ImportUploadPageComponent],
            providers: [
                provideRouter([]),
                { provide: ImportsService, useValue: imports },
                { provide: ClinicsService, useValue: { listClinics: () => of([{ id: 'c1', name: 'Merkez Klinik', isActive: true }]) } },
                { provide: AuthService, useValue: { hasOperationClaim: () => false, getClinicId: () => null } }
            ]
        });
        vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        fixture = TestBed.createComponent(ImportUploadPageComponent);
        page = fixture.componentInstance;
        el = fixture.nativeElement as HTMLElement;
        fixture.detectChanges();
    }

    /** Alanlar sinyal değil; OnPush görünümü elle işaretlenir. */
    function render(): void {
        fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck();
        fixture.detectChanges();
    }

    function selectProfile(code: ImportSourceProfileCode): void {
        page.sourceProfile = code;
        page.onProfileChange();
        render();
    }

    const text = () => el.textContent ?? '';
    const submitButton = () => Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Yükle ve eşlemeye geç'))!;
    const sentForm = () => imports.createBatch.mock.calls[0][0] as FormData;
    const sentKeys = () => Array.from(sentForm().keys());

    beforeEach(() => create());

    it('Genel: şablon ve Excel/CSV seçimi görünür; Excel klinik olmadan "file" ile gider, profil gönderilmez', () => {
        expect(text()).toContain('1. Şablonu indirin');
        expect(el.querySelector('p-selectbutton')).not.toBeNull();
        expect(el.querySelector('[data-testid="import-evet-guide"]')).toBeNull();
        expect(submitButton().disabled).toBe(true);

        page.setXlsx(file('ornek-musteriler.xlsx'));
        render();
        expect(submitButton().disabled).toBe(false);

        submitButton().click();

        expect(sentKeys()).toEqual(['requestId', 'file', 'name']);
        expect(sentForm().get('name')).toBe('ornek-musteriler.xlsx');
        expect((sentForm().get('file') as File).name).toBe('ornek-musteriler.xlsx');
    });

    it('E-vet: şablon yerine yönerge ve 4 yükleme alanı görünür; klinik zorunlu, kodlama ve ayırıcı yok', () => {
        page.mode = 'csv';
        selectProfile('EVet');

        const guide = el.querySelector('[data-testid="import-evet-guide"]')?.textContent ?? '';

        expect(el.querySelectorAll('[data-testid="import-evet-guide"] li').length).toBe(4);
        expect(guide).toContain('Genel > Yedek Al');
        expect(guide).toContain("Giriş Bilgileri'ni işaretlemeyin");
        expect(guide).toContain('Rapor > Genel > Hasta Listesi');
        expect(guide).toContain('Rapor > Resmi > Aşı Bilgisi');
        expect(guide).toContain("E-vet'i kullanmaya başladığınız tarihten bugüne");
        expect(guide).toContain('Müşteriler bu yedekten gelir');
        expect(guide).toContain('Rapor > Depo > Ürün Listesi');
        expect(guide).toContain('onayınız olmadan hiçbir kayıt oluşmaz');

        const zones = Array.from(el.querySelectorAll('app-import-drop-zone')).map((z) => z.textContent ?? '');

        expect(zones.length).toBe(4);
        expect(zones[0]).toContain('E-vet yedeği (.xlsx) · zorunlu');
        expect(zones[0]).toContain('Müşteri, hasta, randevu ve muayene kayıtları');
        expect(zones[1]).toContain('Hasta Listesi (.csv) · önerilir');

        expect(text()).not.toContain('1. Şablonu indirin');
        expect(el.querySelector('p-selectbutton')).toBeNull();
        expect(el.querySelector('label[for="importEncoding"]')).toBeNull();
        expect(el.querySelector('label[for="importDelimiter"]')).toBeNull();
        expect(el.querySelector('label[for="importClinic"]')?.textContent).toContain('(zorunlu)');
    });

    it('E-vet: yedek ve klinik birlikte seçilmeden yüklenemez', () => {
        selectProfile('EVet');
        expect(submitButton().disabled).toBe(true);

        page.setEVet('patientReport', file('ornek-hasta-listesi.csv'));
        page.clinicId = 'c1';
        render();
        expect(submitButton().disabled).toBe(true);

        page.clinicId = null;
        page.setEVet('backup', file('ornek-yedek.xlsx'));
        render();
        expect(submitButton().disabled).toBe(true);

        page.submit();
        expect(imports.createBatch).not.toHaveBeenCalled();

        page.clinicId = 'c1';
        render();
        expect(submitButton().disabled).toBe(false);
    });

    it('E-vet: yalnız dolu dosyalar sözleşme alan adlarıyla gider; kodlama ve ayırıcı gönderilmez, uyarılar sihirbaza taşınır', () => {
        page.mode = 'csv';
        page.encoding = 'utf-8';
        page.delimiter = ';';
        selectProfile('EVet');
        page.setEVet('backup', file('ornek-yedek.xlsx'));
        page.setEVet('patientReport', file('ornek-hasta-listesi.csv'));
        page.clinicId = 'c1';
        page.name = ' E-vet geçişi ';

        page.submit();

        expect(sentKeys()).toEqual(['requestId', 'file', 'evetPatientReportFile', 'clinicId', 'name', 'sourceProfile']);
        expect((sentForm().get('file') as File).name).toBe('ornek-yedek.xlsx');
        expect((sentForm().get('evetPatientReportFile') as File).name).toBe('ornek-hasta-listesi.csv');
        expect(sentForm().get('sourceProfile')).toBe('EVet');
        expect(sentForm().get('clinicId')).toBe('c1');
        expect(sentForm().get('name')).toBe('E-vet geçişi');
        expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith([IMPORTS_ROUTE, 'b1'], { state: { warnings: uploaded.warnings } });
    });

    it('E-vet: dört dosyanın tamamı ayrı alanlarla gider', () => {
        selectProfile('EVet');
        page.setEVet('backup', file('ornek-yedek.xlsx'));
        page.setEVet('patientReport', file('ornek-hasta-listesi.csv'));
        page.setEVet('vaccineReport', file('ornek-asi-bilgi.csv'));
        page.setEVet('products', file('ornek-urun-listesi.csv'));
        page.clinicId = 'c1';

        page.submit();

        expect(sentKeys()).toEqual(['requestId', 'file', 'evetPatientReportFile', 'evetVaccineReportFile', 'productsFile', 'clinicId', 'name', 'sourceProfile']);
        expect((sentForm().get('productsFile') as File).name).toBe('ornek-urun-listesi.csv');
    });

    it('gönderim yüzdesini, sonra sunucuda işlendiğini ve sayfa kapansa da sürdüğünü söyler', () => {
        const events = new Subject<ImportUploadEvent>();

        imports.createBatch.mockReturnValue(events);
        page.setXlsx(file('ornek.xlsx'));
        render();
        submitButton().click();
        events.next({ type: 'progress', percent: 42 });
        render();
        const progress = () => el.querySelector('[data-testid="import-upload-progress"]')?.textContent ?? '';

        expect(progress()).toContain('Dosyalar gönderiliyor… %42');
        expect(progress()).toContain('bu sayfada kalın');

        events.next({ type: 'progress', percent: 100 });
        render();

        expect(progress()).toContain('sunucuda okunuyor ve dönüştürülüyor');
        expect(progress()).toContain('Sayfayı kapatsanız da işlem sürer');

        events.next({ type: 'done', batch: uploaded });
        render();

        expect(el.querySelector('[data-testid="import-upload-progress"]')).toBeNull();
        expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith([IMPORTS_ROUTE, 'b1'], expect.anything());
    });

    it('yarım kalmış içe aktarmaları kaldığı yerden devam için listeler; bitmiş olanları göstermez', () => {
        TestBed.resetTestingModule();
        create();
        imports.listBatches.mockReturnValue(
            of({
                items: [
                    { ...uploaded, id: 'd1', name: 'backup.xlsx', status: 'Validated' },
                    { ...uploaded, id: 'd2', name: 'eski.xlsx', status: 'Committed' }
                ],
                page: 1,
                pageSize: 20,
                totalItems: 2,
                totalPages: 1
            })
        );
        page.ngOnInit();
        render();

        const drafts = el.querySelector('[data-testid="import-open-drafts"]')?.textContent ?? '';

        expect(drafts).toContain('backup.xlsx');
        expect(drafts).toContain('Doğrulandı');
        expect(drafts).not.toContain('eski.xlsx');
    });

    it('aynı dosya zaten yüklüyse o içe aktarmaya bağlantı verir', () => {
        imports.createBatch.mockReturnValue(
            throwError(() => new HttpErrorResponse({ status: 409, error: { code: 'Imports.DuplicateFile', detail: 'Aynı dosya zaten yüklenmiş.', extensions: { batchId: 'b9' } } }))
        );
        page.setXlsx(file('ornek.xlsx'));
        render();
        submitButton().click();
        render();

        const duplicate = el.querySelector('[data-testid="import-duplicate"]');

        expect(duplicate?.textContent).toContain('Bu dosya zaten yüklendi');
        expect(duplicate?.querySelector('a')?.getAttribute('href')).toContain('b9');
    });

    it('profil değişince dosya seçimleri ve deneme durumu sıfırlanır; Kolayvet şablon akışına döner', () => {
        page.setXlsx(file('ornek.xlsx'));
        page.error.set('Dosya yüklenemedi.');
        selectProfile('EVet');

        expect(page.xlsxFile()).toBeNull();
        expect(page.error()).toBeNull();

        page.setEVet('backup', file('ornek-yedek.xlsx'));
        selectProfile('Kolayvet');

        expect(Object.values(page.evetFiles()).every((f) => f === null)).toBe(true);
        expect(text()).toContain('1. Şablonu indirin');
        expect(el.querySelector('[data-testid="import-evet-guide"]')).toBeNull();
        expect(el.querySelector('label[for="importClinic"]')?.textContent).not.toContain('(zorunlu)');
    });
});
