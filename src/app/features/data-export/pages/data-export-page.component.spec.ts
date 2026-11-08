import { HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { DataExportJobDto, DataExportOverviewDto } from '@/app/entities/data-export/models/data-export.model';
import { DataExportsService } from '@/app/entities/data-export/services/data-exports.service';
import { DataExportPageComponent } from './data-export-page.component';

const job = (over: Partial<DataExportJobDto> = {}): DataExportJobDto => ({
    id: 'j1',
    status: 'Ready',
    requestedAtUtc: '2026-11-08T10:00:00Z',
    requestedByName: 'Ayşe',
    startedAtUtc: '2026-11-08T10:00:05Z',
    completedAtUtc: '2026-11-08T10:01:00Z',
    expiresAtUtc: '2026-11-15T10:01:00Z',
    fileSizeBytes: 2048,
    canDownload: true,
    ...over
});

const overview = (items: DataExportJobDto[], over: Partial<DataExportOverviewDto> = {}): DataExportOverviewDto => ({
    items,
    retentionDays: 7,
    maxRequestsPerWindow: 3,
    windowHours: 24,
    remainingRequests: 2,
    hasOpenJob: false,
    ...over
});

describe('DataExportPageComponent', () => {
    let fixture: ComponentFixture<DataExportPageComponent>;
    let service: { overview: ReturnType<typeof vi.fn>; request: ReturnType<typeof vi.fn>; download: ReturnType<typeof vi.fn> };
    let el: HTMLElement;

    async function create(): Promise<void> {
        await TestBed.configureTestingModule({
            imports: [DataExportPageComponent],
            providers: [provideRouter([]), { provide: DataExportsService, useValue: service }, { provide: AuthService, useValue: { hasOperationClaim: () => true } }]
        }).compileComponents();
        fixture = TestBed.createComponent(DataExportPageComponent);
        el = fixture.nativeElement;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    const requestButton = () => el.querySelector('[data-testid="data-export-request"]') as HTMLButtonElement;

    beforeEach(() => {
        service = {
            overview: vi.fn().mockReturnValue(of(overview([job(), job({ id: 'j0', status: 'Expired', canDownload: false, fileSizeBytes: null })]))),
            request: vi.fn().mockReturnValue(of(job({ id: 'j2', status: 'Queued', canDownload: false }))),
            download: vi.fn()
        };
    });

    afterEach(() => vi.restoreAllMocks());

    it('kapsam, saklama süresi ve kalan talep sunucudan gelir; son işler durum ve indirme düğmesiyle listelenir', async () => {
        await create();

        expect(el.querySelector('[data-testid="data-export-scope"]')?.textContent).toContain('muayeneler');
        expect(el.textContent).toContain('7 gün saklanır');
        expect(el.querySelector('[data-testid="data-export-limit"]')?.textContent).toContain('Son 24 saatte en çok 3 dışa aktarma; kalan 2');
        expect(el.textContent).toContain('Parolalar');

        const rows = el.querySelectorAll('[data-testid="data-export-row"]');

        expect(rows.length).toBe(2);
        expect(rows[0].textContent).toContain('Hazır');
        expect(rows[0].textContent).toContain('2 KB');
        expect(rows[1].textContent).toContain('Süresi doldu');
        expect(rows[0].querySelector('[data-testid="data-export-download"]')).not.toBeNull();
        expect(rows[1].querySelector('[data-testid="data-export-download"]')).toBeNull();
        expect(requestButton().disabled).toBe(false);
    });

    it('talep sıraya alınır, başarı iletisi çıkar ve liste yenilenir', async () => {
        await create();
        requestButton().click();
        fixture.detectChanges();

        expect(service.request).toHaveBeenCalledTimes(1);
        expect(service.overview).toHaveBeenCalledTimes(2);
        expect(el.textContent).toContain('Dışa aktarma sıraya alındı');
    });

    it('açık iş varken ya da hak dolunca talep düğmesi kapalıdır ve nedeni yazılır', async () => {
        service.overview.mockReturnValue(of(overview([job({ status: 'Running', canDownload: false, completedAtUtc: null, expiresAtUtc: null })], { hasOpenJob: true })));
        await create();

        expect(requestButton().disabled).toBe(true);
        expect(el.querySelector('[data-testid="data-export-blocked"]')?.textContent).toContain('Hazırlanan bir dışa aktarma var');

        fixture.destroy();
        TestBed.resetTestingModule();
        service.overview.mockReturnValue(of(overview([], { remainingRequests: 0 })));
        await create();

        expect(requestButton().disabled).toBe(true);
        expect(el.querySelector('[data-testid="data-export-blocked"]')?.textContent).toContain('hakkı doldu');
        expect(el.querySelector('[data-testid="data-export-empty"]')).not.toBeNull();
    });

    it('sunucu talebi reddederse (409) iletisi gösterilir', async () => {
        service.request.mockReturnValue(
            throwError(() => new HttpErrorResponse({ status: 409, error: { code: 'DataExports.AnotherJobRunning', detail: 'Hazırlanan bir dışa aktarma var; bitince yenisini isteyebilirsiniz.' } }))
        );
        await create();
        requestButton().click();
        fixture.detectChanges();

        expect(el.querySelector('p-message')?.textContent).toContain('Hazırlanan bir dışa aktarma var');
    });

    it('indirme kimlikli istekle blob alır ve sunucunun dosya adıyla kaydeder', async () => {
        let savedAs: string | null = null;

        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
            savedAs = this.download;
        });
        const blob = new Blob(['zip']);

        service.download.mockReturnValue(
            of(new HttpResponse({ body: blob, headers: new HttpHeaders({ 'Content-Disposition': 'attachment; filename=vetinity-veri-20261108-1301.zip' }) }))
        );
        await create();
        (el.querySelector('[data-testid="data-export-download"]') as HTMLButtonElement).click();

        expect(service.download).toHaveBeenCalledWith('j1');
        expect(savedAs).toBe('vetinity-veri-20261108-1301.zip');
    });
});
