import type { MockedObject } from 'vitest';
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

interface Setup {
    profiles?: ImportSourceProfileDto[] | 'error';
    clinics?: { id: string; name: string; isActive: boolean }[];
    clinicId?: string | null;
    drafts?: ImportBatchDto[];
    support?: boolean;
}

describe('ImportUploadPageComponent', () => {
    let fixture: ComponentFixture<ImportUploadPageComponent>;
    let page: ImportUploadPageComponent;
    let el: HTMLElement;
    let imports: MockedObject<ImportsService>;

    function create(setup: Setup = {}): void {
        const drafts = setup.drafts ?? [];

        imports = {
            getSourceProfiles: vi.fn().mockReturnValue(setup.profiles === 'error' ? throwError(() => new Error('yok')) : of(setup.profiles ?? profiles)),
            createBatch: vi.fn().mockReturnValue(of({ type: 'progress', percent: 100 }, { type: 'done', batch: uploaded })),
            listBatches: vi.fn().mockReturnValue(of({ items: drafts, page: 1, pageSize: 20, totalItems: drafts.length, totalPages: 1 })),
            downloadTemplate: vi.fn().mockReturnValue(new Subject())
        } as unknown as MockedObject<ImportsService>;
        TestBed.configureTestingModule({
            imports: [ImportUploadPageComponent],
            providers: [
                provideRouter([]),
                { provide: ImportsService, useValue: imports },
                { provide: ClinicsService, useValue: { listClinics: () => of(setup.clinics ?? [{ id: 'c1', name: 'Merkez Klinik', isActive: true }]) } },
                { provide: AuthService, useValue: { hasOperationClaim: () => setup.support ?? false, getClinicId: () => setup.clinicId ?? null } }
            ]
        });
        vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        fixture = TestBed.createComponent(ImportUploadPageComponent);
        page = fixture.componentInstance;
        el = fixture.nativeElement as HTMLElement;
        fixture.detectChanges();
    }

    const text = () => (el.textContent ?? '').replace(/\s+/g, ' ');
    const q = <T extends HTMLElement = HTMLElement>(id: string) => el.querySelector<T>(`[data-testid="${id}"]`);

    const click = (id: string) => {
        q(id)!.click();
        fixture.detectChanges();
    };

    const choose = (code: ImportSourceProfileCode) => {
        el.querySelector<HTMLButtonElement>(`[data-profile="${code}"]`)!.click();
        fixture.detectChanges();
    };

    const submitButton = () => q<HTMLButtonElement>('import-submit')!;
    const sentForm = () => imports.createBatch.mock.calls[0][0] as FormData;
    const sentKeys = () => Array.from(sentForm().keys());

    it('ilk ekran yalnız programı sorar: adı bilinenler önce, "Programım listede yok" sonda', () => {
        create();

        const options = Array.from(el.querySelectorAll<HTMLButtonElement>('[data-testid="import-source-profile"] button'));

        expect(text()).toContain('Hangi programdan geliyorsunuz?');
        expect(options.map((o) => o.dataset['profile'])).toEqual(['Kolayvet', 'EVet', 'Generic']);
        expect(options[2].textContent).toContain('Programım listede yok');
        expect(options[2].textContent).toContain('Genel Excel / CSV · Genel');
        expect(options[1].textContent).toContain('E-vet yedeği');
        expect(el.querySelector('app-import-drop-zone')).toBeNull();
        expect(submitButton()).toBeNull();
        expect(q('import-migration-support-link')).toBeNull();
    });

    it('geçiş desteği yetkisi varsa program ekranında bağlantısı görünür', () => {
        create({ support: true });

        expect(q('import-migration-support-link')?.textContent).toContain('geçiş desteği isteyin');
    });

    it('Genel: dosya ve gönderme tek ekranda; şablon ve CSV ikinci planda; Excel klinik olmadan "file" ile gider, profil gönderilmez', () => {
        create();
        choose('Generic');

        expect(text()).toContain('Dosyanızı yükleyin');
        expect(q('import-generic-guide')?.textContent).toContain('Nereden alacağım?');
        expect(q('import-template-xlsx')?.textContent).toContain('Boş Excel şablonunu indirin');
        expect(el.querySelectorAll('app-import-drop-zone').length).toBe(1);
        expect(q('import-csv')).toBeNull();
        expect(q('import-evet-guide')).toBeNull();
        expect(submitButton().disabled).toBe(true);
        expect(q('import-submit-hint')?.textContent).toBe('Önce dosyanızı seçin.');
        expect(q('import-roadmap')?.textContent).toContain('Yükledikten sonra ne olacak?');

        page.setXlsx(file('ornek-musteriler.xlsx'));
        fixture.detectChanges();
        expect(submitButton().disabled).toBe(false);
        expect(q('import-submit-hint')?.textContent).toBe('Bu adımda hiçbir kayıt oluşmaz.');

        submitButton().click();

        expect(sentKeys()).toEqual(['requestId', 'file', 'name']);
        expect(sentForm().get('name')).toBe('ornek-musteriler.xlsx');
        expect((sentForm().get('file') as File).name).toBe('ornek-musteriler.xlsx');
    });

    it('Genel CSV: yedi alan, şablonlar, kodlama ve ayırıcı; klinik isteyen liste varsa klinik zorunlu', () => {
        create();
        choose('Generic');
        click('import-mode-csv');

        expect(el.querySelectorAll('[data-testid="import-csv"] app-import-drop-zone').length).toBe(7);
        expect(el.querySelector('label[for="importEncoding"]')).not.toBeNull();
        expect(el.querySelector('label[for="importDelimiter"]')).not.toBeNull();
        expect(q('import-submit-hint')?.textContent).toBe('Önce en az bir CSV dosyası seçin.');

        page.setCsv('customers', file('musteriler.csv'));
        fixture.detectChanges();
        expect(submitButton().disabled).toBe(false);

        page.setCsv('vaccinations', file('asilar.csv'));
        fixture.detectChanges();
        expect(submitButton().disabled).toBe(true);
        expect(q('import-submit-hint')?.textContent).toBe('Kayıtların yazılacağı kliniği seçin.');
        expect(el.querySelector('label[for="importClinic"]')?.textContent).toContain('(zorunlu)');

        page.clinicId.set('c1');
        page.encoding.set('windows-1254');
        page.delimiter.set(';');
        fixture.detectChanges();
        submitButton().click();

        expect(sentKeys()).toEqual(['requestId', 'customersFile', 'vaccinationsFile', 'encoding', 'delimiter', 'clinicId', 'name']);
    });

    it('Kolayvet: genel yoldan gider; başlıkta program adı, profil notu ve "sourceProfile" ile', () => {
        create();
        choose('Kolayvet');

        expect(text()).toContain('Kolayvet dosyanızı yükleyin');
        expect(q('import-source-profile-note')?.textContent).toBe('Kolayvet dışa aktarımı');

        page.setXlsx(file('kolayvet.xlsx'));
        fixture.detectChanges();
        submitButton().click();

        expect(sentKeys()).toEqual(['requestId', 'file', 'name', 'sourceProfile']);
        expect(sentForm().get('sourceProfile')).toBe('Kolayvet');
    });

    it('E-vet: her dosya ayrı ekranda; nereden alınacağı menü yoluyla yazar, sayaç dosyaları sayar', () => {
        create();
        choose('EVet');

        const guide = () => (q('import-evet-guide')?.textContent ?? '').replace(/\s+/g, ' ');
        const menu = () => q('import-evet-guide')?.querySelector('[aria-label]')?.getAttribute('aria-label');

        expect(q('import-file-counter')?.textContent).toBe('Dosya 1 / 4');
        expect(text()).toContain('E-vet yedeği (.xlsx)');
        expect(text()).toContain('zorunlu');
        expect(menu()).toBe('Menü yolu: Genel > Yedek Al');
        expect(guide()).toContain('Müşteriler bu yedekten gelir');
        expect(guide()).toContain("Giriş Bilgileri'ni işaretlemeyin");
        expect(el.querySelectorAll('app-import-drop-zone').length).toBe(1);
        expect(q<HTMLButtonElement>('import-next')?.disabled).toBe(true);
        expect(q('import-skip')).toBeNull();
        expect(el.querySelector('label[for="importEncoding"]')).toBeNull();
        expect(q('import-evet-ambiguous-hint')?.textContent?.trim()).toBe('Aynı müşterinin aynı adlı iki hayvanı varsa Vetinity çoğunu tür, tarih ve kiloya bakarak kendisi ayırır; kalanları size sorar.');

        page.setEVet('backup', file('ornek-yedek.xlsx'));
        fixture.detectChanges();
        click('import-next');

        expect(q('import-file-counter')?.textContent).toBe('Dosya 2 / 4');
        expect(text()).toContain('Hasta Listesi (.csv)');
        expect(q('import-evet-ambiguous-hint')).toBeNull();
        expect(menu()).toBe('Menü yolu: Rapor > Genel > Hasta Listesi');

        click('import-skip');
        expect(menu()).toBe('Menü yolu: Rapor > Resmi > Aşı Bilgisi');
        expect(guide()).toContain("E-vet'i kullanmaya başladığınız tarihten bugüne");

        click('import-skip');
        expect(q('import-file-counter')?.textContent).toBe('Dosya 4 / 4');
        expect(menu()).toBe('Menü yolu: Rapor > Depo > Ürün Listesi');

        click('import-skip');
        expect(text()).toContain('Hazırsınız: gönderelim mi?');
        expect(q('import-file-counter')).toBeNull();
    });

    it('E-vet özeti: yüklenen ve yüklenmeyen dosyaları gösterir; "Ekle" o dosyanın ekranına götürür', () => {
        create({ clinicId: 'c1' });
        choose('EVet');
        page.setEVet('backup', file('ornek-yedek.xlsx'));
        fixture.detectChanges();
        click('import-next');
        click('import-skip');
        click('import-skip');
        click('import-skip');

        const rows = Array.from(q('import-evet-summary')!.querySelectorAll('li')).map((li) => (li.textContent ?? '').replace(/\s+/g, ' ').trim());

        expect(rows[0]).toContain('ornek-yedek.xlsx');
        expect(rows[0]).toContain('Değiştir');
        expect(rows[1]).toContain('Yüklenmeyecek');
        expect(rows[1]).toContain('Ekle');
        expect(q('import-clinic-info')?.textContent).toContain('Merkez Klinik');
        expect(submitButton().disabled).toBe(false);

        q('import-evet-summary')!.querySelectorAll<HTMLButtonElement>('button')[1].click();
        fixture.detectChanges();

        expect(q('import-file-counter')?.textContent).toBe('Dosya 2 / 4');
    });

    it('E-vet: yedek ve klinik birlikte seçilmeden yüklenemez; nedeni düğmenin yanında yazar', () => {
        create();
        choose('EVet');
        page.setEVet('patientReport', file('ornek-hasta-listesi.csv'));
        page.clinicId.set('c1');
        page.submit();
        expect(imports.createBatch).not.toHaveBeenCalled();

        page.clinicId.set(null);
        page.setEVet('backup', file('ornek-yedek.xlsx'));
        fixture.detectChanges();
        click('import-next');
        click('import-next');
        click('import-skip');
        click('import-skip');

        expect(submitButton().disabled).toBe(true);
        expect(q('import-submit-hint')?.textContent).toBe('Kayıtların yazılacağı kliniği seçin.');
        expect(el.querySelector('label[for="importClinic"]')?.textContent).toContain('(zorunlu)');

        page.submit();
        expect(imports.createBatch).not.toHaveBeenCalled();

        page.clinicId.set('c1');
        fixture.detectChanges();
        expect(submitButton().disabled).toBe(false);
    });

    it('E-vet: yalnız dolu dosyalar sözleşme alan adlarıyla gider; kodlama ve ayırıcı gönderilmez, uyarılar sihirbaza taşınır', () => {
        create();
        page.setMode('csv');
        page.encoding.set('utf-8');
        page.delimiter.set(';');
        choose('EVet');
        page.setEVet('backup', file('ornek-yedek.xlsx'));
        page.setEVet('patientReport', file('ornek-hasta-listesi.csv'));
        page.clinicId.set('c1');
        page.name.set(' E-vet geçişi ');

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
        create();
        choose('EVet');
        page.setEVet('backup', file('ornek-yedek.xlsx'));
        page.setEVet('patientReport', file('ornek-hasta-listesi.csv'));
        page.setEVet('vaccineReport', file('ornek-asi-bilgi.csv'));
        page.setEVet('products', file('ornek-urun-listesi.csv'));
        page.clinicId.set('c1');

        page.submit();

        expect(sentKeys()).toEqual(['requestId', 'file', 'evetPatientReportFile', 'evetVaccineReportFile', 'productsFile', 'clinicId', 'name', 'sourceProfile']);
        expect((sentForm().get('productsFile') as File).name).toBe('ornek-urun-listesi.csv');
    });

    it('klinik: tek klinik seçiliyse bilgi satırı, değilse seçim; ad bağlantıyla açılır', () => {
        create({ clinicId: 'c1' });
        choose('Generic');

        expect(q('import-clinic-info')?.textContent).toContain('Kayıtlar Merkez Klinik kliniğine yazılır.');
        expect(el.querySelector('label[for="importClinic"]')).toBeNull();
        expect(el.querySelector('#importName')).toBeNull();

        click('import-name-open');
        expect(el.querySelector('#importName')).not.toBeNull();

        TestBed.resetTestingModule();
        create({
            clinicId: 'c1',
            clinics: [
                { id: 'c1', name: 'Merkez Klinik', isActive: true },
                { id: 'c2', name: 'Sahil Şubesi', isActive: true }
            ]
        });
        choose('Generic');

        expect(q('import-clinic-info')).toBeNull();
        expect(el.querySelector('label[for="importClinic"]')?.textContent).not.toContain('(zorunlu)');
    });

    it('gönderim yüzdesini, sonra sunucuda okunduğunu ve sayfa kapansa da sürdüğünü söyler', () => {
        const events = new Subject<ImportUploadEvent>();

        create();
        choose('Generic');
        imports.createBatch.mockReturnValue(events);
        page.setXlsx(file('ornek.xlsx'));
        fixture.detectChanges();
        submitButton().click();
        events.next({ type: 'progress', percent: 42 });
        fixture.detectChanges();
        const progress = () => (q('import-upload-progress')?.textContent ?? '').replace(/\s+/g, ' ');

        expect(progress()).toContain('Dosyalar gönderiliyor… %42');
        expect(progress()).toContain('bu sayfada kalın');
        expect(submitButton()).toBeNull();

        events.next({ type: 'progress', percent: 100 });
        fixture.detectChanges();

        expect(progress()).toContain('Dosyalar gönderildi');
        expect(progress()).toContain('Dosyalar okunuyor ve dönüştürülüyor');
        expect(progress()).toContain('Sayfayı kapatsanız da işlem sürer');

        events.next({ type: 'done', batch: uploaded });
        fixture.detectChanges();

        expect(q('import-upload-progress')).toBeNull();
        expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith([IMPORTS_ROUTE, 'b1'], expect.anything());
    });

    it('yarım kalmış içe aktarmaları program ekranının üstünde, devam bağlantısıyla gösterir; bitmiş olanları göstermez', () => {
        create({
            drafts: [
                { ...uploaded, id: 'd1', name: 'backup.xlsx', status: 'Validated' },
                { ...uploaded, id: 'd2', name: 'eski.xlsx', status: 'Committed' }
            ]
        });

        const drafts = q('import-open-drafts');

        expect(drafts?.textContent).toContain('Yarım kalan aktarmanız var');
        expect(drafts?.textContent).toContain('backup.xlsx');
        expect(drafts?.textContent).toContain('Doğrulandı');
        expect(drafts?.textContent).not.toContain('eski.xlsx');
        expect(drafts?.querySelector('a')?.getAttribute('href')).toContain('d1');
        expect(text()).toContain('Ya da yeni bir aktarma başlatın');
    });

    it('aynı dosya zaten yüklüyse o içe aktarmaya bağlantı verir', () => {
        create();
        choose('Generic');
        imports.createBatch.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { code: 'Imports.DuplicateFile', detail: 'Aynı dosya zaten yüklenmiş.', extensions: { batchId: 'b9' } } })));
        page.setXlsx(file('ornek.xlsx'));
        fixture.detectChanges();
        submitButton().click();
        fixture.detectChanges();

        const duplicate = q('import-duplicate');

        expect(duplicate?.textContent).toContain('Bu dosya zaten yüklendi');
        expect(duplicate?.querySelector('a')?.getAttribute('href')).toContain('b9');
    });

    it('program değişince dosya seçimleri ve deneme durumu sıfırlanır', () => {
        create();
        choose('Generic');
        page.setXlsx(file('ornek.xlsx'));
        page.error.set('Dosya yüklenemedi.');
        fixture.detectChanges();
        click('import-back');
        choose('EVet');

        expect(page.xlsxFile()).toBeNull();
        expect(page.error()).toBeNull();

        page.setEVet('backup', file('ornek-yedek.xlsx'));
        fixture.detectChanges();
        click('import-back');
        choose('Kolayvet');

        expect(Object.values(page.evetFiles()).every((f) => f === null)).toBe(true);
        expect(q('import-evet-guide')).toBeNull();
        expect(text()).toContain('Kolayvet dosyanızı yükleyin');
    });

    it('aynı program yeniden seçilirse dosyalar korunur', () => {
        create();
        choose('EVet');
        page.setEVet('backup', file('ornek-yedek.xlsx'));
        fixture.detectChanges();
        click('import-back');
        choose('EVet');

        expect(page.evetFiles().backup?.name).toBe('ornek-yedek.xlsx');
    });

    it('program listesi gelmezse soru sorulmaz; genel yol doğrudan açılır', () => {
        create({ profiles: 'error' });

        expect(q('import-source-profile')).toBeNull();
        expect(text()).toContain('Dosyanızı yükleyin');
        expect(q('import-back')).toBeNull();

        page.setXlsx(file('ornek.xlsx'));
        fixture.detectChanges();
        submitButton().click();

        expect(sentKeys()).toEqual(['requestId', 'file', 'name']);
    });
});
