import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { CustomDevelopmentRequestDto, MigrationSupportOverviewDto } from '@/app/entities/custom-development/models/custom-development-request.model';
import { CustomDevelopmentRequestsService } from '@/app/entities/custom-development/services/custom-development-requests.service';
import type { ImportSourceProfileDto } from '@/app/features/imports/models/import-api.model';
import { ImportsService } from '@/app/features/imports/services/imports.service';
import { MigrationSupportPageComponent } from './migration-support-page.component';

const profiles: ImportSourceProfileDto[] = [
    { code: 'Generic', displayName: 'Genel Excel / CSV', note: 'Genel', verified: false, mappings: [] },
    { code: 'Kolayvet', displayName: 'Kolayvet', note: 'Kaynak yok', verified: false, mappings: [] },
    { code: 'EVet', displayName: 'E-vet', note: 'Rakip incelemesi', verified: false, mappings: [] }
];

const request = (over: Partial<CustomDevelopmentRequestDto> = {}): CustomDevelopmentRequestDto => ({
    id: 'm1',
    requestTitle: 'Geçiş desteği ve kurulum görüşmesi',
    requestText: '',
    targetKind: 'Migration',
    requestTarget: 'Kolayvet',
    priority: 'Normal',
    status: 'Planned',
    isOpen: true,
    createdByUserId: 'u1',
    createdByName: 'Ayşe',
    createdAtUtc: '2026-11-09T10:00:00Z',
    statusChangedAtUtc: null,
    decisionReason: null,
    responseNote: 'Görüşme Salı 10.00',
    migration: { sourceProgram: 'Kolayvet', recordVolume: 'UpTo1000', meetingDays: 'Tuesday', meetingTimes: 'Morning', fee: 'Quoted', meetingDurationMinutes: 60 },
    ...over
});

const overview = (over: Partial<MigrationSupportOverviewDto> = {}): MigrationSupportOverviewDto => ({
    items: [],
    openCount: 0,
    maxOpen: 1,
    fee: 'Quoted',
    meetingDurationMinutes: 60,
    ...over
});

describe('MigrationSupportPageComponent', () => {
    let fixture: ComponentFixture<MigrationSupportPageComponent>;
    let service: { getMigrationSupport: ReturnType<typeof vi.fn>; createMigrationSupport: ReturnType<typeof vi.fn> };
    let el: HTMLElement;

    async function create(): Promise<void> {
        await TestBed.configureTestingModule({
            imports: [MigrationSupportPageComponent],
            providers: [
                provideRouter([]),
                { provide: CustomDevelopmentRequestsService, useValue: service },
                { provide: ImportsService, useValue: { getSourceProfiles: () => of(profiles) } },
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(MigrationSupportPageComponent);
        el = fixture.nativeElement;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    beforeEach(() => {
        service = {
            getMigrationSupport: vi.fn().mockReturnValue(of(overview())),
            createMigrationSupport: vi.fn().mockReturnValue(of(request({ status: 'Received', responseNote: null })))
        };
    });

    it('ücret, 1 saatlik görüşme, kapsam ve KVKK metni ekranda yazar', async () => {
        await create();

        expect(el.querySelector('[data-testid="ms-fee"]')?.textContent).toContain('Ücretli; fiyat size bildirilecek');
        expect(el.querySelector('[data-testid="ms-duration"]')?.textContent).toContain('1 saat');
        const scope = el.querySelector('[data-testid="ms-scope"]')?.textContent ?? '';

        expect(scope).toContain('müşteri, hasta ve aşı geçmişidir');
        expect(scope).toContain('Muayene ve ödeme geçmişi bu kapsamda yoktur');
        const kvkk = el.querySelector('[data-testid="ms-kvkk"]')?.textContent ?? '';

        expect(kvkk).toContain('e-postayla göndermeyin');
        expect(kvkk).toContain('ekran paylaşımında');
        expect(kvkk).toContain('30 gün');
    });

    it('Kurumsal pakette ücretsiz yazar', async () => {
        service.getMigrationSupport.mockReturnValue(of(overview({ fee: 'Free' })));
        await create();

        expect(el.querySelector('[data-testid="ms-fee"]')?.textContent).toContain('Ücretsiz');
    });

    it('program listesi sunucudan gelir, genel seçenek sonda; gün ve saat seçilmeden gönderilmez, gövde bayrak listesiyle gider', async () => {
        await create();
        const p = fixture.componentInstance;

        expect(p.programOptions().map((o) => o.value)).toEqual(['Kolayvet', 'EVet', 'Generic']);

        p.program.set('Generic');
        p.otherName.set('  VetSoft  ');
        p.volume.set('UpTo5000');
        expect(p.canSubmit()).toBe(false);

        p.toggle(p.days, 'Thursday', true);
        p.toggle(p.days, 'Monday', true);
        p.toggle(p.times, 'Afternoon', true);
        p.note.set('  İki şube  ');
        expect(p.canSubmit()).toBe(true);

        p.create();
        fixture.detectChanges();

        expect(service.createMigrationSupport).toHaveBeenCalledWith({
            sourceProgram: 'Generic',
            otherProgramName: 'VetSoft',
            recordVolume: 'UpTo5000',
            meetingDays: 'Monday, Thursday',
            meetingTimes: 'Afternoon',
            note: 'İki şube'
        });
        expect(service.getMigrationSupport).toHaveBeenCalledTimes(2);
        expect(el.querySelector('[data-testid="ms-list-message"]')?.textContent).toContain('Talebiniz alındı');
    });

    it('listedeki program için diğer ad gönderilmez', async () => {
        await create();
        const p = fixture.componentInstance;

        p.program.set('EVet');
        p.otherName.set('kalmış');
        p.volume.set('Unknown');
        p.toggle(p.days, 'Friday', true);
        p.toggle(p.times, 'Morning', true);
        p.create();

        expect(service.createMigrationSupport.mock.calls[0][0]).toMatchObject({ sourceProgram: 'EVet', otherProgramName: null, note: null });
    });

    it('açık talep varsa form yerine bilgi, listede Vetinity notu ve özet görünür', async () => {
        service.getMigrationSupport.mockReturnValue(of(overview({ items: [request()], openCount: 1 })));
        await create();

        expect(el.querySelector('[data-testid="ms-submit"]')).toBeNull();
        expect(el.querySelector('[data-testid="ms-open"]')).not.toBeNull();
        const row = el.querySelector('[data-testid="ms-row"]')?.textContent ?? '';

        expect(row).toContain('Kolayvet');
        expect(row).toContain('Planlandı');
        expect(row).toContain('Salı');
        expect(el.querySelector('[data-testid="ms-response"]')?.textContent).toContain('Görüşme Salı 10.00');
    });

    it('409 gelirse hata gösterilir ve liste yenilenir', async () => {
        service.createMigrationSupport.mockReturnValue(
            throwError(() => new HttpErrorResponse({ status: 409, error: { detail: 'Açık bir geçiş desteği talebiniz var.', extensions: { code: 'CustomDevelopment.MigrationAlreadyOpen' } } }))
        );
        await create();
        const p = fixture.componentInstance;

        p.program.set('Kolayvet');
        p.volume.set('UpTo1000');
        p.toggle(p.days, 'Monday', true);
        p.toggle(p.times, 'Morning', true);
        p.create();
        fixture.detectChanges();

        expect(p.formError()).toBeTruthy();
        expect(service.getMigrationSupport).toHaveBeenCalledTimes(2);
    });
});
