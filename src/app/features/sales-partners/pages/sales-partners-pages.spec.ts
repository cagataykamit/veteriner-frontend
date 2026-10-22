import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router, UrlTree } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { platformAdminGuard } from '@/app/core/auth/platform-admin.guard';
import type {
    DiscountRedemptionRowDto,
    SalesPartnerDetailDto,
    SalesPartnerDto,
    SalesPartnerSummaryDto
} from '@/app/features/sales-partners/models/sales-partner.model';
import { SalesPartnersService } from '@/app/features/sales-partners/services/sales-partners.service';
import { SalesPartnerDetailPageComponent } from './sales-partner-detail-page.component';
import { SalesPartnersListPageComponent } from './sales-partners-list-page.component';

const SUMMARY: SalesPartnerSummaryDto = {
    redemptionCount: 3,
    trialCustomerCount: 2,
    paidCustomerCount: 1,
    revenueNetMinor: 89_910,
    commissionEarnedMinor: 17_982,
    commissionPaidMinor: 0,
    commissionPendingMinor: 17_982,
    commissionClawbackMinor: 0
};

const PARTNER: SalesPartnerDto = {
    id: 'p1',
    name: 'Ali Ortak',
    email: 'ali@example.com',
    phone: null,
    linkedTenantId: null,
    isActive: true,
    createdAtUtc: '2026-10-22T09:00:00Z',
    codeCount: 1,
    summary: SUMMARY
};

const DETAIL: SalesPartnerDetailDto = {
    partner: PARTNER,
    codes: [
        {
            id: 'c1',
            salesPartnerId: 'p1',
            code: 'ISIK10',
            discountPercent: 10,
            commissionPercent: 20,
            validFromUtc: null,
            validUntilUtc: null,
            maxRedemptions: null,
            redemptionCount: 3,
            isActive: true,
            createdAtUtc: '2026-10-22T09:00:00Z',
            deactivatedAtUtc: null
        }
    ]
};

const REDEMPTIONS: DiscountRedemptionRowDto[] = [
    {
        redemptionId: 'r1',
        tenantId: 't1',
        tenantName: 'Pati Klinik',
        code: 'ISIK10',
        discountPercent: 10,
        commissionPercent: 20,
        redeemedAtUtc: '2026-10-22T09:00:00Z',
        windowStartsAtUtc: '2026-11-05T09:00:00Z',
        windowEndsAtUtc: '2027-11-05T09:00:00Z',
        customerStatus: 'Paid',
        collections: [
            {
                id: 'x1',
                checkoutSessionId: 's1',
                billingPeriod: 'Monthly',
                collectedAtUtc: '2026-11-05T09:00:00Z',
                grossAmountMinor: 99_900,
                discountAmountMinor: 9_990,
                netAmountMinor: 89_910,
                commissionAmountMinor: 17_982,
                status: 'Accrued',
                paidAtUtc: null,
                paidNote: null,
                cancelledAtUtc: null,
                cancelReason: null
            }
        ]
    }
];

describe('Satış ortakları ekranları (ADR-037)', () => {
    let service: jasmine.SpyObj<SalesPartnersService>;

    beforeEach(() => {
        service = jasmine.createSpyObj<SalesPartnersService>('SalesPartnersService', [
            'list',
            'get',
            'redemptions',
            'markPaid',
            'setCodeActive',
            'exportCsv',
            'cancelCollection'
        ]);
        service.list.and.returnValue(of([PARTNER]));
        service.get.and.returnValue(of(DETAIL));
        service.redemptions.and.returnValue(of(REDEMPTIONS));
        service.markPaid.and.returnValue(of(1));
    });

    describe('platformAdminGuard', () => {
        const run = (isPlatformAdmin: boolean): boolean | UrlTree => {
            TestBed.configureTestingModule({
                providers: [provideRouter([]), { provide: AuthService, useValue: { isPlatformAdmin: () => isPlatformAdmin } }]
            });

            return TestBed.runInInjectionContext(() => platformAdminGuard({} as never, {} as never)) as boolean | UrlTree;
        };

        it('platform yöneticisine izin verir', () => expect(run(true)).toBeTrue());

        it('klinik kullanıcısını bulunamadı sayfasına gönderir', () => {
            const result = run(false);

            expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/notfound');
        });
    });

    describe('liste', () => {
        let fixture: ComponentFixture<SalesPartnersListPageComponent>;

        beforeEach(async () => {
            await TestBed.configureTestingModule({
                imports: [SalesPartnersListPageComponent],
                providers: [provideRouter([]), { provide: SalesPartnersService, useValue: service }]
            }).compileComponents();
            fixture = TestBed.createComponent(SalesPartnersListPageComponent);
            fixture.detectChanges();
        });

        it('ortak başına özeti ve simge düğmelerini gösterir', () => {
            const row = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="sp-row"]')!;

            expect(row.textContent).toContain('Ali Ortak');
            expect(row.textContent).toContain('2 / 1');
            expect(row.textContent).toContain('899,10');
            expect(row.querySelector('[aria-label="Detay"]')).not.toBeNull();
            expect(row.querySelector('[aria-label="Düzenle"]')).not.toBeNull();
        });
    });

    describe('detay', () => {
        let fixture: ComponentFixture<SalesPartnerDetailPageComponent>;
        let cmp: SalesPartnerDetailPageComponent;

        beforeEach(async () => {
            await TestBed.configureTestingModule({
                imports: [SalesPartnerDetailPageComponent],
                providers: [
                    provideRouter([]),
                    { provide: SalesPartnersService, useValue: service },
                    { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'p1' }) } } }
                ]
            }).compileComponents();
            fixture = TestBed.createComponent(SalesPartnerDetailPageComponent);
            cmp = fixture.componentInstance;
            fixture.detectChanges();
        });

        it('kodları, kullanım satırını ve tahsilatı gösterir', () => {
            const host = fixture.nativeElement as HTMLElement;

            expect(host.querySelector('[data-testid="sp-code-row"]')?.textContent).toContain('ISIK10');
            expect(host.querySelector('[data-testid="sp-redemption"]')?.textContent).toContain('Pati Klinik');
            expect(host.querySelector('[data-testid="sp-collection-row"]')?.textContent).toContain('Tahakkuk');
            expect(host.querySelector<HTMLButtonElement>('[data-testid="sp-mark-paid"] button')?.disabled).toBeTrue();
        });

        it('seçilen tahakkuk satırlarını tarih ve notla ödendi işaretler', () => {
            cmp.toggle('x1', true);
            cmp.openMarkPaid();
            cmp.paidOn = '2026-11-30';
            cmp.paidNote = ' Havale ';
            cmp.markPaid();

            expect(cmp.selectedIds()).withContext('yeniden yüklemede seçim temizlenir').toEqual([]);
            const [partnerId, ids, paidAtUtc, note] = service.markPaid.calls.mostRecent().args;

            expect(partnerId).toBe('p1');
            expect(ids).toEqual(['x1']);
            expect(paidAtUtc).toBe('2026-11-30T09:00:00.000Z');
            expect(note).toBe('Havale');
            expect(service.get).toHaveBeenCalledTimes(2);
        });
    });
});
