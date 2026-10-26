import type { MockedObject } from 'vitest';
import { HttpErrorResponse, provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import type { ImportBatchDto, ImportCommitProgressDto, ImportPreviewDto, ImportTableSummaryDto } from '@/app/features/imports/models/import-api.model';
import { ImportWizardPageComponent } from '@/app/features/imports/pages/import-wizard-page.component';
import { ImportsService } from '@/app/features/imports/services/imports.service';
import { IMPORT_JOB_STALL_MS, IMPORT_PROGRESS_MAX_FAILURES, IMPORT_PROGRESS_POLL_MS } from '@/app/features/imports/utils/import-progress-poll.utils';

const zero: ImportTableSummaryDto = { total: 0, valid: 0, warning: 0, error: 0, willCreate: 0, willMatch: 0, willSkip: 0, created: 0, matched: 0, skipped: 0, failed: 0 };
const customers: ImportTableSummaryDto = { ...zero, total: 120, valid: 120, willCreate: 120 };

const batch = (status: ImportBatchDto['status'], validationId: string | null = null): ImportBatchDto => ({
    id: 'b1',
    status,
    name: 'Eski sistem',
    clinicId: null,
    validationId,
    createdAtUtc: '2026-10-14T08:00:00Z',
    updatedAtUtc: null,
    validatedAtUtc: null,
    committedAtUtc: null,
    rolledBackAtUtc: null,
    remindersReleasedAtUtc: null,
    payloadPurgedAtUtc: null,
    summary: { customers, pets: zero, vaccinations: zero },
    tables: []
});

const progress = (status: ImportBatchDto['status'], processed = 0, leaseActive = true): ImportCommitProgressDto => ({
    id: 'b1',
    status,
    phase: status === 'Validating' || status === 'Committing' ? status : null,
    processed,
    total: 120,
    updatedAtUtc: null,
    committedAtUtc: null,
    leaseActive
});

const preview = (over: Partial<ImportPreviewDto> = {}): ImportPreviewDto => ({
    validationId: 'v-new',
    status: 'Validated',
    summary: { customers, pets: zero, vaccinations: zero },
    unmappedValues: [],
    reminderImpact: {
        vaccinationsWithDueDate: 0,
        vaccinationsWithFutureDueDate: 0,
        vaccinationsWithPastDueDate: 0,
        clientsWithEmail: 0,
        emailsWithinReminderWindow: 0,
        reminderWindowDays: 3,
        tenantRemindersEnabled: false,
        excludedByDefault: true
    },
    issueCounts: [],
    canCommit: true,
    blockers: [],
    payloadPurged: false,
    ...over
});

describe('ImportWizardPageComponent (K13 arka plan doğrulama)', () => {
    let fixture: ComponentFixture<ImportWizardPageComponent>;
    let imports: MockedObject<ImportsService>;

    function create(initial: ImportBatchDto): HTMLElement {
        imports.getBatch.mockReturnValue(of(initial));
        TestBed.configureTestingModule({
            imports: [ImportWizardPageComponent],
            providers: [
                provideRouter([]),
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: 'http://api.test' },
                { provide: ImportsService, useValue: imports },
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'b1' } } } }
            ]
        });
        fixture = TestBed.createComponent(ImportWizardPageComponent);
        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    }

    /** Yoklama zamanlayıcısını ilerletir ve görünümü günceller. */
    function advance(ms: number): void {
        vi.advanceTimersByTime(ms);
        fixture.detectChanges();
    }

    const text = (el: HTMLElement) => el.textContent ?? '';

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-15T09:00:00Z'));
        imports = {
            getBatch: vi.fn().mockName('ImportsService.getBatch'),
            getPreview: vi.fn().mockName('ImportsService.getPreview'),
            getRows: vi.fn().mockName('ImportsService.getRows'),
            saveMapping: vi.fn().mockName('ImportsService.saveMapping'),
            validate: vi.fn().mockName('ImportsService.validate'),
            getProgress: vi.fn().mockName('ImportsService.getProgress')
        } as unknown as MockedObject<ImportsService>;
        imports.getRows.mockReturnValue(of({ items: [], page: 1, pageSize: 25, totalItems: 0, totalPages: 0 }));
        imports.getPreview.mockReturnValue(of(preview()));
    });

    afterEach(() => {
        fixture?.destroy();
        vi.useRealTimers();
    });

    it('Doğrula: istek hemen döner, ilerleme gösterilir; Validated olunca parti ve önizleme okunur, validationId oradan gelir', () => {
        const el = create(batch('Mapped'));

        imports.saveMapping.mockReturnValue(of(batch('Mapped')));
        imports.validate.mockReturnValue(of(batch('Validating')));
        imports.getProgress.mockReturnValueOnce(of(progress('Validating', 30))).mockReturnValueOnce(of(progress('Validated')));

        fixture.componentInstance.saveAndValidate();
        imports.getBatch.mockReturnValue(of(batch('Validated', 'v-new')));
        advance(0);

        expect(imports.validate).toHaveBeenCalledWith('b1');
        expect(fixture.componentInstance.step()).toBe(3);
        expect(text(el)).toContain('Satırlar doğrulanıyor');
        expect(text(el)).toContain('30 / 120 satır işlendi');
        expect(imports.getPreview).not.toHaveBeenCalled();
        expect(fixture.componentInstance.canGoTo(2)).toBe(false);

        advance(IMPORT_PROGRESS_POLL_MS);

        expect(imports.getBatch).toHaveBeenCalledTimes(2);
        expect(imports.getPreview).toHaveBeenCalledWith('b1');
        expect(fixture.componentInstance.batch()?.validationId).toBe('v-new');
        expect(fixture.componentInstance.step()).toBe(3);
        expect(text(el)).not.toContain('Satırlar doğrulanıyor');
        expect(text(el)).toContain('Doğrulama tamamlandı');

        advance(IMPORT_PROGRESS_POLL_MS * 3);
        expect(imports.getProgress).toHaveBeenCalledTimes(2);
    });

    it('ValidationFailed: anlaşılır hata gösterir; "Yeniden doğrula" eşlemeyi yeniden kaydetmeden doğrular', () => {
        const el = create(batch('Validating'));

        imports.getProgress.mockReturnValue(of(progress('ValidationFailed')));
        imports.getPreview.mockReturnValue(of(preview({ status: 'ValidationFailed', validationId: null, canCommit: false })));
        imports.getBatch.mockReturnValue(of(batch('ValidationFailed')));
        advance(0);

        expect(text(el)).toContain('beklenmeyen bir sorun');
        const retry = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Yeniden doğrula'));

        expect(retry).toBeDefined();

        imports.validate.mockReturnValue(of(batch('Validating')));
        imports.getProgress.mockReturnValue(of(progress('Validating', 0, true)));
        retry!.click();
        advance(0);

        expect(imports.saveMapping).not.toHaveBeenCalled();
        expect(imports.validate).toHaveBeenCalledWith('b1');
        expect(text(el)).toContain('Satırlar doğrulanıyor');
    });

    it('geri dönüş: parti Validating ise ilerleme ekranı yoklamayla kendiliğinden sürer; eylemler kapalıdır', () => {
        imports.getProgress.mockReturnValue(of(progress('Validating', 60)));
        const el = create(batch('Validating'));

        advance(0);

        expect(imports.getProgress).toHaveBeenCalledWith('b1');
        expect(fixture.componentInstance.step()).toBe(3);
        expect(text(el)).toContain('60 / 120 satır işlendi');
        expect(text(el)).toContain('eşleme değiştirilemez, içe aktarma silinemez ve aktarma başlatılamaz');
        expect(imports.getPreview).not.toHaveBeenCalled();
        expect([2, 3, 4].some((n) => fixture.componentInstance.canGoTo(n))).toBe(false);
    });

    it('409 InvalidState (başka sekmede doğrulama başlamış): mesajı gösterir, partiyi yeniden okuyup yoklamaya geçer', () => {
        create(batch('Mapped'));
        imports.saveMapping.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { code: 'Imports.InvalidState' } })));
        imports.getBatch.mockReturnValue(of(batch('Validating')));
        imports.getProgress.mockReturnValue(of(progress('Validating', 10)));

        fixture.componentInstance.saveAndValidate();
        advance(0);

        expect(fixture.componentInstance.error()).toContain('şu anki durumunda yapılamaz');
        expect(fixture.componentInstance.batch()?.status).toBe('Validating');
        expect(fixture.componentInstance.step()).toBe(3);
        expect(imports.getProgress).toHaveBeenCalledWith('b1');
    });

    it('ağ hatası: tek hata yutulur, art arda hatalarda "Bağlantı sorunu" ve yeniden dene gösterilir', () => {
        imports.getProgress.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
        const el = create(batch('Validating'));

        advance(0);
        expect(fixture.componentInstance.pollError()).toBeNull();

        advance(IMPORT_PROGRESS_POLL_MS * (IMPORT_PROGRESS_MAX_FAILURES - 1));
        expect(text(el)).toContain('Bağlantı sorunu');

        imports.getProgress.mockReturnValue(of(progress('Validating', 90)));
        const retry = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Yeniden dene'));

        retry!.click();
        advance(0);

        expect(text(el)).not.toContain('Bağlantı sorunu');
        expect(text(el)).toContain('90 / 120 satır işlendi');
    });

    it('kira uzun süre boşsa "beklenenden uzun sürüyor" notu gösterir', () => {
        imports.getProgress.mockReturnValue(of(progress('Validating', 0, false)));
        const el = create(batch('Validating'));

        advance(0);
        expect(text(el)).toContain('İşlem sırada');
        expect(text(el)).not.toContain('beklenenden uzun sürüyor');

        advance(IMPORT_JOB_STALL_MS);
        expect(text(el)).toContain('beklenenden uzun sürüyor');
    });

    it('uygulama sürerken aynı yoklayıcıyla onay adımında ilerler', () => {
        imports.getProgress.mockReturnValue(of(progress('Committing', 40)));
        const el = create(batch('Committing', 'v1'));

        advance(0);
        expect(fixture.componentInstance.step()).toBe(4);
        expect(text(el)).toContain('40 / 120 satır işlendi');
    });
});
