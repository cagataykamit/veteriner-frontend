import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { LEGAL_ACCEPTANCE_CODE_MESSAGES, LEGAL_VERSION_OUTDATED_CODE } from '@/app/features/legal-acceptance/utils/legal-acceptance-error.utils';
import { mapPublicInviteDetailsDtoToVm } from '@/app/features/public/data/public-invite.mapper';
import type { PublicInviteVm } from '@/app/features/public/models/public-invite-vm.model';
import { PublicInviteService } from '@/app/features/public/services/public-invite.service';
import { JoinInvitePageComponent } from './join-invite-page.component';

const invite = (overrides: Partial<PublicInviteVm> = {}): PublicInviteVm => ({
    inviteToken: 'tok',
    tenantName: 'Pati',
    clinicName: 'Pati Klinik',
    email: 'yeni@example.com',
    expiresAtUtc: null,
    isExpired: false,
    canJoin: true,
    requiresLogin: false,
    requiresSignup: true,
    requiredLegalDocuments: [
        { documentType: 'Terms', version: '0.1' },
        { documentType: 'Privacy', version: '0.1' }
    ],
    ...overrides
});

describe('JoinInvitePageComponent hukuki onay (ADR-029)', () => {
    let fixture: ComponentFixture<JoinInvitePageComponent>;
    let cmp: JoinInvitePageComponent;
    let invites: jasmine.SpyObj<PublicInviteService>;

    const host = (): HTMLElement => fixture.nativeElement as HTMLElement;
    const submitButton = (): HTMLButtonElement | undefined =>
        Array.from(host().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes('Hesap oluştur ve katıl'));

    function create(vm: PublicInviteVm): void {
        invites.getInviteByToken.and.returnValue(of(vm));
        fixture = TestBed.createComponent(JoinInvitePageComponent);
        cmp = fixture.componentInstance;
        fixture.detectChanges();
        cmp.invitePassword = 'Abc12345!';
    }

    beforeEach(async () => {
        invites = jasmine.createSpyObj<PublicInviteService>('PublicInviteService', ['getInviteByToken', 'signupAndAccept', 'acceptInvite']);
        const auth = jasmine.createSpyObj<AuthService>('AuthService', ['isAuthenticated', 'logout']);

        auth.isAuthenticated.and.returnValue(false);
        await TestBed.configureTestingModule({
            imports: [JoinInvitePageComponent],
            providers: [
                provideRouter([]),
                { provide: PublicInviteService, useValue: invites },
                { provide: AuthService, useValue: auth },
                { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ token: 'tok' })) } }
            ]
        }).compileComponents();
    });

    it('davetteki role gereken belgelere bağlantılı onay kutusu gösterir', () => {
        create(invite());

        const hrefs = Array.from(host().querySelectorAll('.legal-consent a')).map((a) => a.getAttribute('href'));

        expect(hrefs).toEqual(['/kullanim-sartlari', '/gizlilik']);
    });

    it('kutu işaretlenmeden gönderim pasif; işaretlenince belgeler gövdeye eklenir', () => {
        create(invite());
        invites.signupAndAccept.and.returnValue(of(undefined));

        expect(submitButton()?.disabled).toBeTrue();
        cmp.onSignupAndAccept(cmp.vm()!);
        expect(invites.signupAndAccept).not.toHaveBeenCalled();
        expect(cmp.actionError()).toBe(LEGAL_ACCEPTANCE_CODE_MESSAGES['LegalAcceptances.Required']);

        cmp.legalConsent.set(true);
        fixture.detectChanges();
        expect(submitButton()?.disabled).toBeFalse();

        cmp.onSignupAndAccept(cmp.vm()!);

        expect(invites.signupAndAccept).toHaveBeenCalledWith('tok', {
            password: 'Abc12345!',
            acceptedLegalDocuments: invite().requiredLegalDocuments
        });
        expect(cmp.successMode()).toBe('signup');
    });

    it('409 VersionOutdated: daveti yeniden okur, onayı kaldırır, şifre korunur', () => {
        create(invite());
        const newer = invite({ requiredLegalDocuments: [{ documentType: 'Terms', version: '1.0' }, { documentType: 'Privacy', version: '0.1' }] });
        const outdated = new HttpErrorResponse({ status: 409, error: { status: 409, extensions: { code: LEGAL_VERSION_OUTDATED_CODE } } });

        invites.signupAndAccept.and.returnValue(throwError(() => outdated));
        invites.getInviteByToken.and.returnValue(of(newer));
        cmp.legalConsent.set(true);
        cmp.onSignupAndAccept(cmp.vm()!);

        expect(cmp.actionError()).toBe(LEGAL_ACCEPTANCE_CODE_MESSAGES[LEGAL_VERSION_OUTDATED_CODE]);
        expect(cmp.legalConsent()).toBeFalse();
        expect(cmp.vm()?.requiredLegalDocuments[0].version).toBe('1.0');
        expect(cmp.invitePassword).toBe('Abc12345!');
    });

    it('eşleyici requiredLegalDocuments alanını okur, tanınmayan türleri atar', () => {
        const vm = mapPublicInviteDetailsDtoToVm(
            {
                requiredLegalDocuments: [
                    { documentType: 'Terms', version: '0.1' },
                    { documentType: 'Cookies', version: '0.1' },
                    { documentType: 'DataProcessing', version: ' 0.1 ' }
                ]
            },
            'tok'
        );

        expect(vm?.requiredLegalDocuments).toEqual([
            { documentType: 'Terms', version: '0.1' },
            { documentType: 'DataProcessing', version: '0.1' }
        ]);
        expect(mapPublicInviteDetailsDtoToVm({}, 'tok')?.requiredLegalDocuments).toEqual([]);
    });
});
