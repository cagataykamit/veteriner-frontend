import type { MockedObject } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ImportCommitStepComponent } from '@/app/features/imports/components/import-commit-step.component';
import type { ImportBatchDto, ImportCommitProgressDto, ImportPreviewDto, ImportTableSummaryDto } from '@/app/features/imports/models/import-api.model';
import { ImportsService } from '@/app/features/imports/services/imports.service';

const zero: ImportTableSummaryDto = { total: 0, valid: 0, warning: 0, error: 0, willCreate: 0, willMatch: 0, willSkip: 0, created: 0, matched: 0, skipped: 0, failed: 0 };
const customers: ImportTableSummaryDto = { ...zero, total: 5, valid: 5, willCreate: 5 };

const batch = (status: ImportBatchDto['status']): ImportBatchDto => ({
    id: 'b1',
    status,
    name: null,
    clinicId: null,
    validationId: 'v1',
    createdAtUtc: '2026-10-14T08:00:00Z',
    updatedAtUtc: null,
    validatedAtUtc: null,
    committedAtUtc: null,
    rolledBackAtUtc: null,
    remindersReleasedAtUtc: null,
    payloadPurgedAtUtc: null,
    summary: { customers, pets: zero, vaccinations: zero }
});

const preview = { validationId: 'v1', canCommit: true, blockers: [] } as unknown as ImportPreviewDto;
const committedPreview = {
    validationId: 'v1',
    canCommit: false,
    blockers: [],
    summary: { customers, pets: zero, vaccinations: { ...zero, total: 4 } },
    reminderImpact: { emailsWithinReminderWindow: 5, reminderWindowDays: 30, tenantRemindersEnabled: true },
    issueCounts: [{ code: 'Imports.MatchedAtCommit', severity: 'Info', rowCount: 2 }]
} as unknown as ImportPreviewDto;
const committed = (): ImportBatchDto => ({ ...batch('Committed'), committedAtUtc: '2026-10-14T09:00:00Z' });

describe('ImportCommitStepComponent', () => {
    let fixture: ComponentFixture<ImportCommitStepComponent>;
    let imports: MockedObject<ImportsService>;

    function create(
        b: ImportBatchDto,
        opts: {
            preview?: ImportPreviewDto;
            claim?: boolean;
            progress?: ImportCommitProgressDto;
        } = {}
    ): HTMLElement {
        fixture = TestBed.createComponent(ImportCommitStepComponent);
        fixture.componentRef.setInput('batch', b);
        fixture.componentRef.setInput('preview', opts.preview ?? preview);
        fixture.componentRef.setInput('canCommitClaim', opts.claim ?? true);
        fixture.componentRef.setInput('progress', opts.progress ?? null);
        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    }

    beforeEach(() => {
        imports = {
            commit: vi.fn().mockName('ImportsService.commit'),
            releaseReminders: vi.fn().mockName('ImportsService.releaseReminders'),
            downloadErrorReport: vi.fn().mockName('ImportsService.downloadErrorReport')
        } as unknown as MockedObject<ImportsService>;
        TestBed.configureTestingModule({ imports: [ImportCommitStepComponent], providers: [{ provide: ImportsService, useValue: imports }] });
    });

    it('uç yayında değilken (404 gövdesiz) nazik mesaj gösterir ve başarı bildirmez', () => {
        imports.commit.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
        const emitted: ImportBatchDto[] = [];

        create(batch('Validated'));
        fixture.componentInstance.batchChange.subscribe((b) => emitted.push(b));
        const cmp = fixture.componentInstance as unknown as {
            confirmed: boolean;
            commit(): void;
        };

        cmp.confirmed = true;
        cmp.commit();
        fixture.detectChanges();
        expect(imports.commit).toHaveBeenCalledWith('b1', { validationId: 'v1', onErrors: 'SkipErrorRows' });
        expect(emitted).toEqual([]);
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('Uygulama henüz etkin değil');
        expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Aktarma tamamlandı');
    });

    it('gerçek hata kodunu "henüz etkin değil" saymaz', () => {
        imports.commit.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { code: 'Imports.ValidationStale' } })));
        create(batch('Validated'));
        const cmp = fixture.componentInstance as unknown as {
            confirmed: boolean;
            commit(): void;
        };

        cmp.confirmed = true;
        cmp.commit();
        fixture.detectChanges();
        const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

        expect(text).not.toContain('Uygulama henüz etkin değil');
        expect(text).toContain('Yeniden doğrulayın');
    });

    it('onay işaretlenmeden aktarmayı başlatmaz', () => {
        create(batch('Validated'));
        (
            fixture.componentInstance as unknown as {
                commit(): void;
            }
        ).commit();
        expect(imports.commit).not.toHaveBeenCalled();
    });

    it('aktarma sürerken ilerleme gösterir', () => {
        const el = create({ ...batch('Committing'), progress: { phase: 'Committing', processed: 50, total: 200 } });

        expect(el.textContent).toContain('50 / 200');
    });

    it('yoklama yanıtındaki ilerlemeyi ve sırada bekleme notunu gösterir', () => {
        const el = create(batch('Committing'), { progress: { id: 'b1', status: 'Committing', phase: 'Committing', processed: 30, total: 120, updatedAtUtc: null, committedAtUtc: null, leaseActive: false } });

        expect(el.textContent).toContain('30 / 120');
        expect(el.textContent).toContain('Sayfayı kapatabilirsiniz');
    });

    it('409 CommitBlocked engelleri Türkçe listeler ve önizlemenin yenilenmesini ister', () => {
        imports.commit.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { code: 'Imports.CommitBlocked', blockers: ['Imports.OwnerLinkUnavailable'] } })));
        create(batch('Validated'));
        let stale = 0;

        fixture.componentInstance.previewStale.subscribe(() => stale++);
        const cmp = fixture.componentInstance as unknown as {
            confirmed: boolean;
            commit(): void;
        };

        cmp.confirmed = true;
        cmp.commit();
        fixture.detectChanges();
        const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

        expect(text).toContain('başlatılamıyor');
        expect(text).toContain('Hastalar müşterilere bağlanamıyor');
        expect(text).not.toContain('Uygulama henüz etkin değil');
        expect(stale).toBe(1);
    });

    it('403 AccessDenied sade yetki mesajı gösterir', () => {
        imports.commit.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { code: 'Imports.AccessDenied' } })));
        create(batch('Validated'));
        const cmp = fixture.componentInstance as unknown as {
            confirmed: boolean;
            commit(): void;
        };

        cmp.confirmed = true;
        cmp.commit();
        fixture.detectChanges();
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('yetkiniz yok');
    });

    it('commit yetkisi yoksa onay adımı salt okunurdur', () => {
        const el = create(batch('Validated'), { claim: false });

        expect(el.textContent).toContain('aktarma yetkisi gerekir');
        expect(el.querySelector('#importConfirm')).toBeNull();
    });

    it('CommitFailed durumunda nazik hata ve sayıları gösterir', () => {
        const el = create(batch('CommitFailed'));

        expect(el.textContent).toContain('beklenmeyen bir sorun');
        expect(el.textContent).toContain('Oluşturuldu');
    });

    it('tamamlanınca uygulama satır sorunlarını sade metinle gösterir', () => {
        const el = create(committed(), { preview: committedPreview });

        expect(el.textContent).toContain('mevcutla eşleşti');
        expect(el.textContent).toContain('2 satır');
    });

    it('hatırlatma açma: sayı onayıyla gönderir, kiracı notunu gösterir, parti güncellemesini bildirir', () => {
        const released = { ...committed(), remindersReleasedAtUtc: '2026-10-14T09:05:00Z' };

        imports.releaseReminders.mockReturnValue(of({ batch: released, reminderImpact: committedPreview.reminderImpact, alreadyReleased: false, note: 'Ayar kapalı.' }));
        create(committed(), { preview: committedPreview });
        const emitted: ImportBatchDto[] = [];

        fixture.componentInstance.batchChange.subscribe((b) => emitted.push(b));
        const cmp = fixture.componentInstance as unknown as {
            release(p: ImportPreviewDto): void;
        };

        cmp.release(committedPreview);
        expect(imports.releaseReminders).toHaveBeenCalledWith('b1', 5);
        expect(emitted).toEqual([released]);
        fixture.componentRef.setInput('batch', released);
        fixture.detectChanges();
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ayar kapalı.');
    });

    it('sayı tutmazsa 409 sonrası güncel sayıyı gösterip yeniden onay ister', () => {
        imports.releaseReminders
            .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 409, error: { code: 'Imports.ReminderImpactChanged', emailsWithinReminderWindow: 9 } })))
            .mockReturnValueOnce(of({ batch: committed(), reminderImpact: committedPreview.reminderImpact, alreadyReleased: true, note: null }));
        create(committed(), { preview: committedPreview });
        const cmp = fixture.componentInstance as unknown as {
            release(p: ImportPreviewDto): void;
            confirmingRelease: {
                set(v: boolean): void;
            };
        };

        cmp.confirmingRelease.set(true);
        cmp.release(committedPreview);
        fixture.detectChanges();
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('9 aşı için hatırlatma açılsın mı');
        cmp.release(committedPreview);
        expect(vi.mocked(imports.releaseReminders).mock.lastCall).toEqual(['b1', 9]);
    });
});
