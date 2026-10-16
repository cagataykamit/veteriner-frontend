import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { PAYMENTS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { isRightAfterDetail, rowEditActions } from '@/app/shared/ui/row-action-button/row-action-button.testing';
import type { PaymentListItemVm } from '@/app/features/payments/models/payment-vm.model';
import { PaymentsService } from '@/app/features/payments/services/payments.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { PaymentsListPageComponent } from './payments-list-page.component';

const row: PaymentListItemVm = {
    id: 'p1',
    clientId: 'cl1',
    clientName: 'Ali Veli',
    petId: null,
    petName: '',
    amount: 600,
    currency: 'TRY',
    method: 'cash',
    paidAtUtc: '2026-10-10T07:00:00Z'
};

describe('PaymentsListPageComponent — iptal', () => {
    let fixture: ComponentFixture<PaymentsListPageComponent>;
    let payments: jasmine.SpyObj<PaymentsService>;
    let claims: Set<string>;
    let mutationBlocked: boolean;

    const setup = async () => {
        await TestBed.configureTestingModule({
            imports: [PaymentsListPageComponent],
            providers: [
                provideRouter([]),
                { provide: PaymentsService, useValue: payments },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => mutationBlocked } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(PaymentsListPageComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    };

    beforeEach(() => {
        sessionStorage.clear();
        payments = jasmine.createSpyObj<PaymentsService>('PaymentsService', ['getPayments', 'voidPayment']);
        payments.getPayments.and.returnValue(of({ items: [row], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }));
        claims = new Set(['Payments.Read']);
        mutationBlocked = false;
    });

    /** İptal et satır eylemi simge düğmesidir (ADR-026); erişilebilir adıyla aranır. */
    const voidButtons = () => fixture.nativeElement.querySelectorAll('app-row-action-button [aria-label="İptal et"]') as NodeListOf<HTMLElement>;

    it('Payments.Correct yoksa İptal et görünmez', async () => {
        await setup();
        expect(voidButtons().length).toBe(0);
    });

    it('Payments.Correct varsa İptal et görünür (tablo + mobil kart); salt okunur kiracıda gizlenir', async () => {
        claims.add('Payments.Correct');
        await setup();
        expect(voidButtons().length).toBe(2);
        mutationBlocked = true;
        fixture.destroy();
        TestBed.resetTestingModule();
        await setup();
        expect(voidButtons().length).toBe(0);
    });

    it('satırda Detay göz simgesi bağlantısıdır; "Detay" yazısı çizilmez', async () => {
        await setup();
        const details = fixture.nativeElement.querySelectorAll('app-row-action-button a[aria-label="Detay"]') as NodeListOf<HTMLAnchorElement>;

        expect(details.length).toBe(2);
        expect(details[0].querySelector('i')!.classList).toContain('fa-eye');
        expect(fixture.nativeElement.textContent).not.toContain('Detay');
    });

    it('tablo satırında İptal et yalnız simgeyle yer tutar; erişilebilir ad ve ipucu korunur', async () => {
        const iconButton = () => fixture.nativeElement.querySelector('button[aria-label="İptal et"]') as HTMLButtonElement | null;

        await setup();
        expect(iconButton()).toBeNull();
        fixture.destroy();
        TestBed.resetTestingModule();
        claims.add('Payments.Correct');
        await setup();
        expect(iconButton()!.textContent!.trim()).toBe('');
        expect(iconButton()!.closest('app-row-action-button')).not.toBeNull();
        expect(iconButton()!.querySelector('i')!.classList).toContain('fa-ban');
        iconButton()!.click();
        expect(fixture.componentInstance.voidSummary()).toContain('Ali Veli');
    });

    it('uzun müşteri adı tabloda tek satırda kesilir; tam ad ipucunda kalır', async () => {
        const longName = 'Ayşe Gülizar Karamanoğlu Yılmaz';

        payments.getPayments.and.returnValue(of({ items: [{ ...row, clientName: longName }], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }));
        await setup();
        const el = fixture.nativeElement.querySelector(`table [title="${longName}"]`) as HTMLElement;

        expect(el.classList).toContain('truncate');
        expect(el.textContent!.trim()).toBe(longName);
    });

    it('iptal diyaloğu seçili ödemeyi gerekçeyle iptal eder', async () => {
        claims.add('Payments.Correct');
        payments.voidPayment.and.returnValue(of(void 0));
        await setup();
        const cmp = fixture.componentInstance;

        cmp.openVoid(row);
        expect(cmp.voidSummary()).toContain('Ali Veli');
        await firstValueFrom(cmp.voidPayment('Yanlış tutar girildi'));
        expect(payments.voidPayment).toHaveBeenCalledOnceWith('p1', 'Yanlış tutar girildi');
    });

    /** ADR-026 madde 6: Düzenle, detay sayfasındaki Düzenle ile aynı yetki ve salt okunur koşuluyla; sıra Detay, Düzenle, İptal et. */
    it("Payments.Update varsa Düzenle Detay'dan hemen sonra, İptal et'ten önce gelir ve düzenleme sayfasına gider", async () => {
        claims.add(PAYMENTS_UPDATE_CLAIM);
        claims.add('Payments.Correct');
        await setup();
        const edits = rowEditActions(fixture.nativeElement);

        expect(edits.length).withContext('tablo + mobil kart').toBe(2);

        for (const edit of edits) {
            expect(edit.getAttribute('href')).toBe('/panel/payments/p1/edit');
            expect(isRightAfterDetail(edit)).toBeTrue();
            expect(edit.closest('app-row-action-button')!.nextElementSibling!.querySelector('.fa-ban')).not.toBeNull();
        }
    });

    it('Payments.Update yoksa Düzenle görünmez; salt okunur kiracıda pasiftir', async () => {
        await setup();
        expect(rowEditActions(fixture.nativeElement).length).toBe(0);
        fixture.destroy();
        TestBed.resetTestingModule();
        claims.add(PAYMENTS_UPDATE_CLAIM);
        mutationBlocked = true;
        await setup();
        const edits = rowEditActions(fixture.nativeElement);

        expect(edits.length).toBe(2);
        expect(edits.every((e) => e.tagName === 'BUTTON' && e.getAttribute('aria-disabled') === 'true')).toBeTrue();
    });

    it('iptal sonrası liste yeniden okunur', async () => {
        claims.add('Payments.Correct');
        await setup();
        payments.getPayments.calls.reset();
        fixture.componentInstance.afterVoid();
        expect(payments.getPayments).toHaveBeenCalledTimes(1);
    });
});
