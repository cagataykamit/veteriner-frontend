import type { MockedObject } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { MyLegalAcceptanceStatusDto } from '@/app/entities/legal-document/models/legal-acceptance.model';
import { LegalAcceptanceService } from '@/app/features/legal-acceptance/services/legal-acceptance.service';
import { LEGAL_ACCEPTANCE_CODE_MESSAGES, LEGAL_VERSION_OUTDATED_CODE } from '@/app/entities/legal-document/utils/legal-acceptance-error.utils';
import { LegalAcceptanceGateComponent } from './legal-acceptance-gate.component';

const pendingStatus: MyLegalAcceptanceStatusDto = {
    requiresAcceptance: true,
    pendingDocuments: [
        { documentType: 'Terms', version: '0.1' },
        { documentType: 'Privacy', version: '0.1' }
    ]
};

const doneStatus: MyLegalAcceptanceStatusDto = { requiresAcceptance: false, pendingDocuments: [] };

describe('LegalAcceptanceGateComponent', () => {
    let fixture: ComponentFixture<LegalAcceptanceGateComponent>;
    let cmp: LegalAcceptanceGateComponent;
    let legal: MockedObject<LegalAcceptanceService>;
    let auth: MockedObject<AuthService>;

    const dialog = (): HTMLElement | null => document.querySelector('.legal-acceptance-gate');
    const buttons = (): HTMLButtonElement[] => Array.from(document.querySelectorAll<HTMLButtonElement>('.legal-acceptance-gate button'));
    const acceptButton = (): HTMLButtonElement | undefined => buttons().find((b) => b.textContent?.includes('Kabul et ve devam et'));

    function create(status: MyLegalAcceptanceStatusDto): void {
        legal.getMyStatus.mockReturnValue(of(status));
        fixture = TestBed.createComponent(LegalAcceptanceGateComponent);
        cmp = fixture.componentInstance;
        fixture.detectChanges();
    }

    beforeEach(async () => {
        legal = {
            getMyStatus: vi.fn().mockName('LegalAcceptanceService.getMyStatus'),
            accept: vi.fn().mockName('LegalAcceptanceService.accept')
        } as unknown as MockedObject<LegalAcceptanceService>;
        auth = {
            logoutCurrentSession: vi.fn().mockName('AuthService.logoutCurrentSession'),
            logout: vi.fn().mockName('AuthService.logout')
        } as unknown as MockedObject<AuthService>;
        await TestBed.configureTestingModule({
            imports: [LegalAcceptanceGateComponent],
            providers: [provideRouter([]), { provide: LegalAcceptanceService, useValue: legal }, { provide: AuthService, useValue: auth }]
        }).compileComponents();
    });

    afterEach(() => fixture?.destroy());

    it('bekleyen kabul yoksa pencere açılmaz', () => {
        create(doneStatus);

        expect(dialog()).toBeNull();
    });

    it('bekleyen belgeleri sürümleriyle ve bağlantılarıyla gösterir; kapatma düğmesi yoktur', () => {
        create(pendingStatus);

        const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.legal-acceptance-gate-documents a'));

        expect(links.map((a) => a.getAttribute('href'))).toEqual(['/kullanim-sartlari', '/gizlilik']);
        expect(links.every((a) => a.target === '_blank')).toBe(true);
        expect(dialog()?.textContent).toContain('Sürüm 0.1 (taslak)');
        expect(document.querySelector('.legal-acceptance-gate .p-dialog-close-button')).toBeNull();
        expect(buttons().some((b) => b.textContent?.includes('Çıkış yap'))).toBe(true);
    });

    it('onay kutusu işaretlenmeden kabul düğmesi pasiftir', () => {
        create(pendingStatus);

        expect(acceptButton()?.disabled).toBe(true);

        cmp.consent.set(true);
        fixture.detectChanges();

        expect(acceptButton()?.disabled).toBe(false);
    });

    it('kabul gösterilen sürümleri gönderir ve pencereyi kapatır', () => {
        create(pendingStatus);
        legal.accept.mockReturnValue(of(doneStatus));

        cmp.consent.set(true);
        cmp.accept();
        fixture.detectChanges();

        expect(legal.accept).toHaveBeenCalledWith(pendingStatus.pendingDocuments);
        expect(cmp.pending()).toEqual([]);
        // Kapanış animasyonu sürerken öğe DOM'da kalabilir; görünürlük bekleyen listeye bağlıdır.
        expect(dialog()?.classList.contains('p-dialog-leave-active') ?? true).toBe(true);
    });

    it('409 VersionOutdated: durumu yeniden okur, yeni sürümü gösterir ve onayı sıfırlar', () => {
        create(pendingStatus);
        const outdated = new HttpErrorResponse({ status: 409, error: { status: 409, extensions: { code: LEGAL_VERSION_OUTDATED_CODE } } });
        const newer: MyLegalAcceptanceStatusDto = { requiresAcceptance: true, pendingDocuments: [{ documentType: 'Terms', version: '1.0' }] };

        legal.accept.mockReturnValue(throwError(() => outdated));
        legal.getMyStatus.mockReturnValue(of(newer));
        cmp.consent.set(true);
        cmp.accept();
        fixture.detectChanges();

        expect(legal.getMyStatus).toHaveBeenCalledTimes(2);
        expect(cmp.pending()).toEqual(newer.pendingDocuments);
        expect(cmp.consent()).toBe(false);
        expect(document.querySelector('.legal-acceptance-gate-error')?.textContent?.trim()).toBe(LEGAL_ACCEPTANCE_CODE_MESSAGES[LEGAL_VERSION_OUTDATED_CODE]);
        expect(dialog()?.textContent).toContain('Sürüm 1.0');
        expect(dialog()?.textContent).not.toContain('(taslak)');
    });

    it('durum okunamazsa paneli engellemez', () => {
        legal.getMyStatus.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
        fixture = TestBed.createComponent(LegalAcceptanceGateComponent);
        fixture.detectChanges();

        expect(dialog()).toBeNull();
    });

    it('çıkış yap oturumu kapatır ve girişe yönlendirir', () => {
        create(pendingStatus);
        const router = TestBed.inject(Router);

        vi.spyOn(router, 'navigate').mockResolvedValue(true);
        auth.logoutCurrentSession.mockReturnValue(of({ success: true }));

        cmp.logout();

        expect(auth.logoutCurrentSession).toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], { replaceUrl: true });
    });
});
