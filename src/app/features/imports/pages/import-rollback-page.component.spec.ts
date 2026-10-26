import type { MockedObject } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { ImportRollbackPageComponent } from '@/app/features/imports/pages/import-rollback-page.component';
import type { ImportBatchDto, ImportRollbackPreviewDto, ImportTableSummaryDto } from '@/app/features/imports/models/import-api.model';
import { ImportsService } from '@/app/features/imports/services/imports.service';

const zero: ImportTableSummaryDto = { total: 0, valid: 0, warning: 0, error: 0, willCreate: 0, willMatch: 0, willSkip: 0, created: 0, matched: 0, skipped: 0, failed: 0 };

const batch = (status: ImportBatchDto['status']): ImportBatchDto => ({
    id: 'b1',
    status,
    name: 'Eski sistem',
    clinicId: null,
    validationId: 'v1',
    createdAtUtc: '2026-10-14T08:00:00Z',
    updatedAtUtc: null,
    validatedAtUtc: null,
    committedAtUtc: null,
    rolledBackAtUtc: null,
    remindersReleasedAtUtc: null,
    payloadPurgedAtUtc: null,
    summary: { customers: zero, pets: zero, vaccinations: zero }
});

const preview = (over: Partial<ImportRollbackPreviewDto> = {}): ImportRollbackPreviewDto => ({
    status: 'Committed',
    canRollback: false,
    canDeleteUnblockedOnly: true,
    deletable: { clients: 10, pets: 12, vaccinations: 30 },
    blocked: { clients: 1, pets: 1, vaccinations: 0 },
    blockedItems: [{ entity: 'Pet', id: 'pet-guid-1', table: 'pets', rowNumber: 12, reasons: ['HasVisits', 'HasCharges'] }],
    blockedItemsTruncated: false,
    kept: { matchedClients: 3, matchedPets: 2 },
    rolledBack: { clients: 0, pets: 0, vaccinations: 0 },
    remindersAlreadyReleased: false,
    warnings: ['Imports.PetEditsNotTracked'],
    ...over
});

describe('ImportRollbackPageComponent', () => {
    let fixture: ComponentFixture<ImportRollbackPageComponent>;
    let imports: MockedObject<ImportsService>;

    function create(
        status: ImportBatchDto['status'],
        opts: {
            claim?: boolean;
            preview?: ImportRollbackPreviewDto;
        } = {}
    ): HTMLElement {
        imports.getBatch.mockReturnValue(of(batch(status)));
        imports.getRollbackPreview.mockReturnValue(of(opts.preview ?? preview()));
        TestBed.configureTestingModule({
            imports: [ImportRollbackPageComponent],
            providers: [
                provideRouter([]),
                { provide: ImportsService, useValue: imports },
                { provide: AuthService, useValue: { hasOperationClaim: () => opts.claim ?? true } },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'b1' } } } }
            ]
        });
        fixture = TestBed.createComponent(ImportRollbackPageComponent);
        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    }

    const text = (el: HTMLElement) => el.textContent ?? '';
    const submitButton = (el: HTMLElement) => el.querySelector('p-button[icon="pi pi-undo"] button') as HTMLButtonElement | null;

    function fill(reason: string, ack: boolean): void {
        const c = fixture.componentInstance;

        c.reason.set(reason);
        c.ack.set(ack);
        fixture.detectChanges();
    }

    beforeEach(() => {
        imports = {
            getBatch: vi.fn().mockName('ImportsService.getBatch'),
            getRollbackPreview: vi.fn().mockName('ImportsService.getRollbackPreview'),
            rollback: vi.fn().mockName('ImportsService.rollback'),
            getProgress: vi.fn().mockName('ImportsService.getProgress')
        } as unknown as MockedObject<ImportsService>;
    });

    it('Imports.Commit yoksa önizleme istemez ve eylem göstermez', () => {
        const el = create('Committed', { claim: false });

        expect(imports.getBatch).not.toHaveBeenCalled();
        expect(text(el)).toContain('aktarma yetkisi gerekir');
    });

    it('sayıları, engelli kayıtları sade nedenle ve uyarıyı gösterir; kişisel veri alanı yoktur', () => {
        const el = create('Committed');
        const t = text(el);

        expect(t).toContain('10 müşteri · 12 hasta · 30 aşı');
        expect(t).toContain('Hasta · Hastalar, 12. satır');
        expect(t).toContain('Bağlı geliş (ziyaret) var');
        expect(t).toContain('Bağlı ücret var');
        expect(t).toContain('düzenlemeler izlenemiyor');
    });

    it('varsayılan politika Fail; gerekçe ve onay olmadan gönderilemez', () => {
        const el = create('Committed');

        expect(fixture.componentInstance.policy()).toBe('Fail');
        fill('', true);
        expect(submitButton(el)?.disabled).toBe(true);
        fill('Yanlış dosya', false);
        expect(submitButton(el)?.disabled).toBe(true);
        fill('Yanlış dosya', true);
        expect(submitButton(el)?.disabled).toBe(false);
    });

    it('gerekçeyi kırpıp seçilen politikayla ve form açılışında üretilen tek requestId ile gönderir', () => {
        create('Committed');
        imports.rollback.mockReturnValue(of(batch('RollingBack')));
        imports.getProgress.mockReturnValue(of({ id: 'b1', status: 'RollingBack', phase: 'RollingBack', processed: 1, total: 4, updatedAtUtc: null, committedAtUtc: null, leaseActive: true }));
        fixture.componentInstance.policy.set('DeleteUnblockedOnly');
        fill('  Yanlış dosya  ', true);
        fixture.componentInstance.submit();
        const body = vi.mocked(imports.rollback).mock.lastCall![1];

        expect(body.reason).toBe('Yanlış dosya');
        expect(body.blockedPolicy).toBe('DeleteUnblockedOnly');
        expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/);
        fixture.destroy();
    });

    it('409 RollbackBlocked: hiçbir şey silinmediğini söyler ve engel listesini gösterir', () => {
        const el = create('Committed');
        const err = new HttpErrorResponse({
            status: 409,
            error: { code: 'Imports.RollbackBlocked', extensions: { blocked: { clients: 1, pets: 0, vaccinations: 0 }, blockedItems: [{ entity: 'Client', id: 'c-9', table: 'customers', rowNumber: 3, reasons: ['ClientModified'] }] } }
        });

        imports.rollback.mockReturnValue(throwError(() => err));
        fill('Yanlış dosya', true);
        fixture.componentInstance.submit();
        fixture.detectChanges();
        const t = text(el);

        expect(t).toContain('hiçbir şey silinmedi');
        expect(t).toContain('Müşteri · Müşteriler, 3. satır');
        expect(t).toContain('Müşteri sonradan düzenlenmiş');
    });

    it('409 RequestIdConflict: sade mesaj gösterir ve sonraki gönderimde yeni requestId kullanır', () => {
        create('Committed');
        imports.rollback.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 409, error: { code: 'Imports.RequestIdConflict' } }))).mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));
        fill('Yanlış dosya', true);
        fixture.componentInstance.submit();
        expect(fixture.componentInstance.error()).toContain('farklı bir seçimle');
        fixture.componentInstance.submit();
        const [first, second] = vi.mocked(imports.rollback).mock.calls.map((a) => a[1].requestId);

        expect(first).not.toBe(second);
    });

    it('PartiallyRolledBack: kalanları nedenleriyle gösterir ve yeniden deneme sunar', () => {
        const el = create('PartiallyRolledBack', { preview: preview({ status: 'PartiallyRolledBack', rolledBack: { clients: 5, pets: 5, vaccinations: 9 } }) });
        const t = text(el);

        expect(t).toContain('kısmen tamamlandı');
        expect(t).toContain('5 müşteri · 5 hasta · 9 aşı');
        expect(t).toContain('Bağlı geliş (ziyaret) var');
        expect(t).toContain('Geri almayı yeniden dene');
    });

    it('RolledBack: başarı mesajı gösterir, form göstermez', () => {
        const el = create('RolledBack');

        expect(text(el)).toContain('Geri alma tamamlandı');
        expect(submitButton(el)).toBeNull();
    });

    it('RollingBack: ilerleme yoklar ve formu göstermez', async () => {
        imports.getProgress.mockReturnValue(of({ id: 'b1', status: 'RollingBack', phase: 'RollingBack', processed: 2, total: 8, updatedAtUtc: null, committedAtUtc: null, leaseActive: true }));
        const el = create('RollingBack');

        await new Promise((r) => setTimeout(r, 20));
        fixture.detectChanges();
        expect(imports.getProgress).toHaveBeenCalledWith('b1');
        expect(text(el)).toContain('2 / 8 satır işlendi');
        expect(submitButton(el)).toBeNull();
        fixture.destroy();
    });
});
