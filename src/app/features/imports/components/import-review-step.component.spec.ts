import type { MockedObject } from 'vitest';
import { HttpResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { BreedsService } from '@/app/entities/breed/services/breeds.service';
import { ImportReviewStepComponent } from '@/app/features/imports/components/import-review-step.component';
import type { ImportBatchDto, ImportPreviewDto, ImportRowDto, ImportRowPageDto, ImportTableSummaryDto } from '@/app/features/imports/models/import-api.model';
import { ImportsService } from '@/app/features/imports/services/imports.service';
import { PetColorsService } from '@/app/entities/pet/services/pet-colors.service';
import { SpeciesService } from '@/app/entities/species/services/species.service';
import { VaccineDefinitionsService } from '@/app/entities/vaccine-definition/services/vaccine-definitions.service';

const zero: ImportTableSummaryDto = { total: 0, valid: 0, warning: 0, error: 0, willCreate: 0, willMatch: 0, willSkip: 0, created: 0, matched: 0, skipped: 0, failed: 0 };

const batch = {
    id: 'b1',
    status: 'Validated',
    summary: { customers: zero, pets: { ...zero, total: 1, error: 1 }, vaccinations: { ...zero, total: 1, error: 1 }, clinicalRecords: zero, accountEntries: zero, appointments: zero, products: zero }
} as unknown as ImportBatchDto;

const preview = {
    validationId: 'v1',
    status: 'Validated',
    canCommit: false,
    blockers: [],
    summary: batch.summary,
    unmappedValues: [],
    issueCounts: [],
    reminderImpact: { vaccinationsWithDueDate: 0, vaccinationsWithFutureDueDate: 0, vaccinationsWithPastDueDate: 0, emailsWithinReminderWindow: 0, reminderWindowDays: 30, tenantRemindersEnabled: true },
    payloadPurged: false
} as unknown as ImportPreviewDto;

const row = (table: ImportRowDto['table'], field: string): ImportRowDto =>
    ({
        table,
        rowNumber: 2,
        validation: { status: 'Error', action: null },
        apply: { status: 'Pending', targetId: null },
        issues: [{ severity: 'Error', code: 'Imports.RequiredMissing', field, message: 'Zorunlu alan boş.' }],
        source: {}
    }) as unknown as ImportRowDto;

describe('ImportReviewStepComponent', () => {
    let fixture: ComponentFixture<ImportReviewStepComponent>;
    let imports: MockedObject<ImportsService>;

    beforeEach(() => {
        imports = {
            getRows: vi.fn().mockName('ImportsService.getRows'),
            downloadErrorReport: vi.fn().mockName('ImportsService.downloadErrorReport')
        } as unknown as MockedObject<ImportsService>;
        TestBed.configureTestingModule({
            imports: [ImportReviewStepComponent],
            providers: [
                { provide: ImportsService, useValue: imports },
                { provide: SpeciesService, useValue: {} },
                { provide: VaccineDefinitionsService, useValue: {} },
                { provide: BreedsService, useValue: {} },
                { provide: PetColorsService, useValue: {} }
            ]
        });
    });

    it('satır sorununun alanını API anahtarı yerine etiketle gösterir (ADR-022: hasta)', () => {
        imports.getRows.mockReturnValue(of({ items: [row('pets', 'HayvanAdi'), row('vaccinations', 'HayvanNo')], totalItems: 2 } as unknown as ImportRowPageDto));
        fixture = TestBed.createComponent(ImportReviewStepComponent);
        fixture.componentRef.setInput('batch', batch);
        fixture.componentRef.setInput('preview', preview);
        fixture.componentRef.setInput('choices', {});
        fixture.detectChanges();
        fixture.detectChanges();

        const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

        expect(text).toContain('(Hasta adı)');
        expect(text).toContain('(Hasta no)');
        expect(text).not.toContain('HayvanAdi');
        expect(text).not.toContain('HayvanNo');
    });

    it('mikroçip çakışmasında hangi satırla çakıştığını etiketin altında gösterir', () => {
        const conflict = {
            ...row('pets', 'Mikrocip'),
            issues: [{ severity: 'Error', code: 'Imports.MicrochipConflict', field: 'Mikrocip', message: 'Aynı mikroçip 14. satırdaki başka bir hastada da var.' }]
        } as unknown as ImportRowDto;

        imports.getRows.mockReturnValue(of({ items: [conflict, row('pets', 'HayvanAdi')], totalItems: 2 } as unknown as ImportRowPageDto));
        fixture = TestBed.createComponent(ImportReviewStepComponent);
        fixture.componentRef.setInput('batch', batch);
        fixture.componentRef.setInput('preview', preview);
        fixture.componentRef.setInput('choices', {});
        fixture.detectChanges();
        fixture.detectChanges();

        const details = (fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="import-issue-detail"]');

        expect(Array.from(details).map((d) => d.textContent?.trim())).toEqual(['Aynı mikroçip 14. satırdaki başka bir hastada da var.']);
    });

    it('filtre değişince satırlar yerinde kalır; "yükleniyor" yalnız ilk yüklemede görünür (alttaki düğmeler zıplamaz)', () => {
        imports.getRows.mockReturnValue(of({ items: [row('pets', 'HayvanAdi')], totalItems: 1 } as unknown as ImportRowPageDto));
        fixture = TestBed.createComponent(ImportReviewStepComponent);
        fixture.componentRef.setInput('batch', batch);
        fixture.componentRef.setInput('preview', preview);
        fixture.componentRef.setInput('choices', {});
        fixture.detectChanges();
        fixture.detectChanges();

        const pending = new Subject<ImportRowPageDto>();

        imports.getRows.mockReturnValue(pending);
        fixture.componentInstance['setStatus']('Error');
        fixture.detectChanges();

        const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

        expect(text()).toContain('(Hasta adı)');
        expect(text()).not.toContain('Satırlar yükleniyor');
        pending.next({ items: [row('pets', 'HayvanAdi')], totalItems: 1 } as unknown as ImportRowPageDto);
        pending.complete();
        fixture.detectChanges();
        expect(text()).toContain('(Hasta adı)');
    });

    describe('A kurgusu: sonuç, seçim ve katlanan ayrıntılar', () => {
        const ready = (over: Partial<ImportPreviewDto> = {}): ImportPreviewDto =>
            ({
                ...preview,
                canCommit: true,
                summary: {
                    ...batch.summary,
                    customers: { ...zero, total: 10, valid: 8, error: 1, willCreate: 8, willSkip: 1 },
                    clinicalRecords: { ...zero, total: 5, valid: 3, willCreate: 3, willSkip: 2 }
                },
                unmappedValues: [{ kind: 'breed', source: 'Sarman', rowCount: 9, blocking: false }],
                issueCounts: [
                    { code: 'Imports.PetNotFound', severity: 'Error', rowCount: 1 },
                    { code: 'Imports.PhoneInvalid', severity: 'Warning', rowCount: 2 },
                    { code: 'Imports.ClinicalRecordEmpty', severity: 'Info', rowCount: 2 },
                    { code: 'Imports.InactiveClient', severity: 'Info', rowCount: 4 }
                ],
                notImportedReasons: [
                    { table: 'customers', kind: 'Skipped', code: 'Imports.DuplicateInFile', rowCount: 1 },
                    { table: 'customers', kind: 'Error', code: 'Imports.NameTooShort', rowCount: 1 },
                    { table: 'clinicalRecords', kind: 'Skipped', code: 'Imports.ClinicalRecordEmpty', rowCount: 2 },
                    { table: 'pets', kind: 'Error', code: 'Imports.PetNotFound', rowCount: 1 },
                    { table: 'vaccinations', kind: 'Error', code: 'Imports.PetNotFound', rowCount: 1 }
                ],
                ...over
            }) as ImportPreviewDto;

        function render(p: ImportPreviewDto, canManage = true): HTMLElement {
            imports.getRows.mockReturnValue(of({ items: [], totalItems: 0 } as unknown as ImportRowPageDto));
            TestBed.overrideProvider(VaccineDefinitionsService, { useValue: { getVaccineDefinitions: () => of({ items: [] }) } });
            TestBed.overrideProvider(SpeciesService, { useValue: { getSpeciesList: () => of([]) } });
            TestBed.overrideProvider(BreedsService, { useValue: { getBreedList: () => of([]) } });
            fixture = TestBed.createComponent(ImportReviewStepComponent);
            fixture.componentRef.setInput('batch', batch);
            fixture.componentRef.setInput('preview', p);
            fixture.componentRef.setInput('choices', {});
            fixture.componentRef.setInput('canManage', canManage);
            fixture.detectChanges();
            fixture.detectChanges();

            return fixture.nativeElement as HTMLElement;
        }

        const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
        const q = (el: HTMLElement, id: string) => el.querySelector<HTMLElement>(`[data-testid="${id}"]`);

        it('üstte tek cümlelik sonuç ve üç sonuç: aktarılacak, bilerek atlanacak, aktarılamayacak', () => {
            const el = render(ready());

            expect(text(q(el, 'import-review-title'))).toBe('Aktarmaya hazır');
            expect(text(q(el, 'import-review-summary'))).toContain('17 satırdan 11 kayıt aktarılacak');

            const totals = text(q(el, 'import-review-totals'));

            expect(totals).toMatch(/Aktarılacak ?11/);
            expect(totals).toContain('Bilerek atlanacak');
            expect(totals).toContain('Boş ya da tekrar; kayıp değil.');
            expect(totals).toContain('Aktarılamayacak');
        });

        it('ayrıntılar katlı başlar; nedenler tablolar arasında toplanır ve açıklamasıyla gösterilir', () => {
            const el = render(ready());

            for (const id of ['import-importable', 'import-skipped', 'import-errors', 'import-attention', 'import-info', 'import-optional-values', 'import-rows']) {
                expect(el.querySelector<HTMLDetailsElement>(`[data-testid="${id}"]`)?.open).toBe(false);
            }

            const skipped = text(q(el, 'import-skipped'));

            expect(skipped).toContain('Bilerek atlanacak 3 satır');
            expect(skipped).toContain('Boş muayene satırı');
            expect(skipped).toContain('İçinde aktarılacak bilgi yok; sorun değil.');

            const errors = text(q(el, 'import-errors'));

            expect(errors).toContain('Aktarılamayacak 3 satır');
            expect(errors).toMatch(/Satırın hastası bulunamadı.*2/);
            expect(errors).toContain('Listeyi indir');
        });

        it('bilgi notları atlanma nedenini tekrarlamaz', () => {
            const info = text(q(render(ready()), 'import-info'));

            expect(info).toContain('Eski programda pasif müşteri');
            expect(info).not.toContain('Boş muayene');
        });

        it('atlanan nedene tıklanınca o tablonun o satırları açılır ve yalnız o neden indirilebilir', () => {
            const el = render(ready());
            const reason = Array.from(q(el, 'import-skipped')!.querySelectorAll<HTMLButtonElement>('[data-testid="import-reason-list"] button')).find((b) => b.textContent?.includes('Boş muayene'))!;

            imports.getRows.mockClear();
            reason.click();
            fixture.detectChanges();

            expect(imports.getRows).toHaveBeenLastCalledWith('b1', expect.objectContaining({ table: 'clinicalRecords', status: 'WillSkip', code: 'Imports.ClinicalRecordEmpty' }));
            expect(el.querySelector<HTMLDetailsElement>('[data-testid="import-rows"]')?.open).toBe(true);

            imports.downloadErrorReport.mockReturnValue(of(new HttpResponse<Blob>({ body: new Blob(['x']) })));
            Array.from(q(el, 'import-skipped-download')!.querySelectorAll<HTMLButtonElement>('button'))
                .find((b) => b.textContent?.includes('Excel'))!
                .click();

            expect(imports.downloadErrorReport).toHaveBeenCalledWith('b1', 'xlsx', { code: 'Imports.ClinicalRecordEmpty' });
        });

        it('birden çok tablodaki nedende tablo filtresi konmaz', () => {
            const el = render(ready());
            const reason = Array.from(q(el, 'import-errors')!.querySelectorAll<HTMLButtonElement>('[data-testid="import-reason-list"] button')).find((b) => b.textContent?.includes('hastası bulunamadı'))!;

            imports.getRows.mockClear();
            reason.click();

            expect(imports.getRows).toHaveBeenLastCalledWith('b1', expect.objectContaining({ table: undefined, status: 'Error', code: 'Imports.PetNotFound' }));
        });

        it('atlananların hepsi neden seçmeden indirilebilir', () => {
            const el = render(ready());

            imports.downloadErrorReport.mockReturnValue(of(new HttpResponse<Blob>({ body: new Blob(['x']) })));
            Array.from(q(el, 'import-skipped')!.querySelectorAll<HTMLButtonElement>('button'))
                .find((b) => b.textContent?.includes('Atlananları indir'))!
                .click();

            expect(imports.downloadErrorReport).toHaveBeenCalledWith('b1', 'xlsx', { code: null });
        });

        it('aktarılacak tablosunda tablo adına tıklanınca o tablonun bütün satırları açılır', () => {
            const el = render(ready());
            const button = Array.from(q(el, 'import-importable')!.querySelectorAll<HTMLButtonElement>('tbody button')).find((b) => b.textContent?.includes('Klinik geçmiş'))!;

            imports.getRows.mockClear();
            button.click();
            fixture.detectChanges();

            expect(imports.getRows).toHaveBeenLastCalledWith('b1', expect.objectContaining({ table: 'clinicalRecords', status: undefined, code: undefined }));
            expect(el.querySelector<HTMLDetailsElement>('[data-testid="import-rows"]')?.open).toBe(true);
        });

        it('seçim bekleyen değerler en üstte; "Atla" seçimi kaydeder ve geri alınabilir', () => {
            const el = render(
                ready({
                    canCommit: false,
                    blockers: ['Imports.VaccineUnmapped'],
                    unmappedValues: [
                        { kind: 'vaccine', source: 'UYUZ TEDAVİSİ', rowCount: 4, blocking: true },
                        { kind: 'breed', source: 'Sarman', rowCount: 9, blocking: false }
                    ]
                })
            );

            expect(text(q(el, 'import-review-title'))).toBe('Aktarmadan önce 1 seçim yapın');

            const required = q(el, 'import-required-values')!;

            expect(text(required)).toContain('UYUZ TEDAVİSİ');
            expect(text(required)).toContain('1 değer seçim bekliyor.');
            expect(q(el, 'import-blockers')).toBeNull();

            Array.from(required.querySelectorAll<HTMLButtonElement>('button'))
                .find((b) => b.textContent?.trim() === 'Atla')!
                .click();
            fixture.detectChanges();

            expect(fixture.componentInstance.choices()).toEqual({ 'vaccine|UYUZ TEDAVİSİ': '__skip__' });
            expect(text(q(el, 'import-value-skipped'))).toBe('Atlanacak; bu satırlar aktarılmaz.');
            expect((q(el, 'import-apply-values') as HTMLButtonElement | null)?.disabled).toBe(false);

            Array.from(required.querySelectorAll<HTMLButtonElement>('button'))
                .find((b) => b.textContent?.trim() === 'Geri al')!
                .click();
            fixture.detectChanges();

            expect(fixture.componentInstance.choices()).toEqual({});
            expect(q(el, 'import-optional-values')?.textContent).toContain('Sarman');
        });

        it('yetkisiz kullanıcı seçim yapamaz', () => {
            const el = render(ready({ canCommit: false, blockers: ['Imports.SpeciesUnmapped'], unmappedValues: [{ kind: 'species', source: 'ARABA', rowCount: 3, blocking: true }] }), false);
            const buttons = Array.from(q(el, 'import-required-values')!.querySelectorAll('button')).map((b) => b.textContent?.trim());

            expect(buttons).not.toContain('Atla');
            expect(q(el, 'import-apply-values')).toBeNull();
        });

        it('aynı adlı hastalar için kayıtların hangisine ait olduğunu adaylarla sorar', () => {
            const candidate = { ownerName: 'Ayşe Yılmaz', species: 'Kedi', breed: null, color: null, gender: null, birthDate: null, status: null, registeredOn: null };
            const p = ready({
                canCommit: false,
                blockers: ['Imports.AmbiguousPet'],
                unmappedValues: [{ kind: 'pet', source: 'Belirsiz: 903 / 904', rowCount: 3, blocking: true }],
                petCandidates: [
                    { ...candidate, petNo: '903', rowNumber: 4, name: 'Zeytin', color: 'Siyah' },
                    { ...candidate, petNo: '904', rowNumber: 5, name: 'Zeytin (E-vet 904)', color: 'Beyaz' }
                ]
            });
            const el = render(p);
            const component = fixture.componentInstance as unknown as { catalogOptions(u: unknown): { label: string; value: string }[] };
            const required = text(q(el, 'import-required-values'));
            const options = component.catalogOptions(p.unmappedValues[0]);

            expect(required).toContain("Ayşe Yılmaz: 'Zeytin' adlı 2 hasta");
            expect(required).toContain('3 aşı / muayene kaydı hangisine ait?');
            expect(required).toContain('Atla');
            expect(options.map((o) => o.value)).toEqual(['903', '904', 'merge:903', 'merge:904']);
            expect(options[1].label).toBe('Zeytin (E-vet 904) · Kedi · Beyaz');
            expect(options[3].label).toBe('İkisi aynı hayvan: Zeytin (E-vet 904) olarak tek hasta say');
        });

        it('belirsiz grubun kayıtlarını gösterir; türü farklı adaylarda "aynı hayvan" sunmaz, ırk farkını yazar', () => {
            const candidate = { ownerName: 'Ayşe Yılmaz', breed: null, color: null, gender: null, birthDate: null, status: null, registeredOn: null };
            const cat = { ...candidate, species: 'Kedi', name: 'Boncuk' };
            const p = ready({
                canCommit: false,
                blockers: ['Imports.AmbiguousPet'],
                unmappedValues: [
                    { kind: 'pet', source: 'Belirsiz: 1 / 2', rowCount: 7, blocking: true },
                    { kind: 'pet', source: 'Belirsiz: 3 / 4', rowCount: 1, blocking: true }
                ],
                petCandidates: [
                    { ...cat, petNo: '1', rowNumber: 1 },
                    { ...cat, petNo: '2', rowNumber: 2, species: 'Köpek' },
                    { ...cat, petNo: '3', rowNumber: 3, breed: 'Tekir' },
                    { ...cat, petNo: '4', rowNumber: 4, breed: 'Sarman' }
                ],
                petRows: [
                    { reference: 'Belirsiz: 1 / 2', table: 'vaccinations', rowNumber: 5, date: '2024-10-12', title: 'İÇ PARAZİT', summary: null },
                    { reference: 'Belirsiz: 1 / 2', table: 'clinicalRecords', rowNumber: 6, date: '2024-10-13', title: 'Muayene', summary: 'Kusma ve ishal' },
                    { reference: 'Belirsiz: 3 / 4', table: 'clinicalRecords', rowNumber: 7, date: null, title: 'Kısırlaştırma', summary: null }
                ]
            });
            const el = render(p);
            const component = fixture.componentInstance as unknown as { catalogOptions(u: unknown): { label: string; value: string }[] };
            const rows = Array.from(el.querySelectorAll('[data-testid="import-pet-rows"]')).map((r) => text(r));
            const required = text(q(el, 'import-required-values'));

            expect(rows[0]).toContain('12.10.2024 · Aşı: İÇ PARAZİT');
            expect(rows[0]).toContain('13.10.2024 · Muayene: Kusma ve ishal');
            expect(rows[1]).toContain('Tarihsiz · Kısırlaştırma');
            expect(required).toContain('ve 5 kayıt daha');
            expect(required).toContain('Bu kayıtlar hangisine ait?');
            expect(required).toContain('Bu kayıt hangisine ait?');
            expect(component.catalogOptions(p.unmappedValues[0]).map((o) => o.value)).toEqual(['1', '2']);
            expect(
                component
                    .catalogOptions(p.unmappedValues[1])
                    .map((o) => o.label)
                    .slice(2)
            ).toEqual(['İkisi aynı hayvan (ırk ya da cinsiyet farklı): Boncuk (E-vet 3) olarak tek hasta say', 'İkisi aynı hayvan (ırk ya da cinsiyet farklı): Boncuk (E-vet 4) olarak tek hasta say']);
        });

        it('sıfır sorunda "Her şey hazır"; atlanan ve aktarılamayan bölümü çıkmaz', () => {
            const el = render(
                ready({
                    summary: { ...batch.summary, pets: { ...zero, total: 4, valid: 4, willCreate: 4 }, vaccinations: { ...zero, total: 6, valid: 6, willCreate: 6 } },
                    unmappedValues: [],
                    issueCounts: [],
                    notImportedReasons: []
                })
            );

            expect(text(q(el, 'import-review-title'))).toBe('Her şey hazır');
            expect(text(q(el, 'import-review-summary'))).toContain('10 satırın tamamı aktarılacak');
            expect(q(el, 'import-skipped')).toBeNull();
            expect(q(el, 'import-errors')).toBeNull();
            expect(q(el, 'import-required-values')).toBeNull();
        });

        it('dosya düzeyi engel sonuç kutusunda nedeni ve yapılacak işiyle gösterilir', () => {
            const el = render(ready({ status: 'ValidationFailed', canCommit: false, blockers: ['Imports.PetLinkUnavailable'] }));

            expect(text(q(el, 'import-review-title'))).toBe('Bu dosya bu hâliyle aktarılamıyor');
            expect(text(q(el, 'import-blockers'))).toContain('Eşleme adımında hasta no sütununu seçin.');
            expect(q(el, 'import-review-summary')?.getAttribute('role')).toBe('alert');
        });

        it('hatırlatma tek not: kapalı gelir; sayılar isteyene açılır', () => {
            const el = render(
                ready({
                    summary: { ...batch.summary, vaccinations: { ...zero, total: 5, valid: 5, willCreate: 5 }, appointments: { ...zero, total: 2, valid: 2, willCreate: 2 } },
                    reminderImpact: { ...preview.reminderImpact, vaccinationsWithFutureDueDate: 947, vaccinationsWithPastDueDate: 4790, emailsWithinReminderWindow: 2, futureAppointments: 57, tenantRemindersEnabled: false }
                })
            );
            const note = q(el, 'import-reminders')!;

            expect(text(note)).toContain('Hatırlatmalar kapalı gelir');
            expect(note.querySelector('details')?.open).toBe(false);
            expect(text(note)).toContain('947 ileri tarihli aşının');
            expect(text(note)).toContain('57 gelecek randevunun');
            expect(text(note)).toContain('Kliniğinizde aşı hatırlatması kapalı');
        });
    });
});
