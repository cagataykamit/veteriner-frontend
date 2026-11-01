import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { PORTAL_CLINIC_CLOSED_MESSAGE } from '@portal/app/core/errors/portal-errors';
import { createSessionStub, LINK_MERKEZ, LINK_SAHIL } from '@portal/app/testing/portal-fixtures';
import type { PortalLink } from '@portal/app/core/auth/portal-auth.models';
import { PortalShell } from './portal-shell.component';

@Component({ selector: 'portal-test-page', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, template: '<p data-testid="page">sayfa</p>' })
class TestPage {}

describe('PortalShell (klinik portalı kapalı)', () => {
    async function open(links: readonly PortalLink[], path: string): Promise<HTMLElement> {
        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    {
                        path: '',
                        component: PortalShell,
                        children: [
                            { path: '', component: TestPage },
                            { path: 'pets', component: TestPage },
                            { path: 'account', component: TestPage },
                            { path: 'account/delete', component: TestPage }
                        ]
                    }
                ]),
                { provide: PortalSessionService, useValue: createSessionStub(links) }
            ]
        });
        const harness = await RouterTestingHarness.create();

        await harness.navigateByUrl(path);
        harness.detectChanges();

        return harness.fixture.nativeElement as HTMLElement;
    }

    const closed: PortalLink = { ...LINK_MERKEZ, isClinicPortalEnabled: false };

    it('açık klinikte sayfa içeriği görünür', async () => {
        const el = await open([LINK_MERKEZ], '/pets');

        expect(el.querySelector('[data-testid=page]')).not.toBeNull();
        expect(el.querySelector('[data-testid=clinic-portal-closed]')).toBeNull();
    });

    it('kapalı klinikte bağ kapsamlı sayfanın yerine durum notu çıkar', async () => {
        const el = await open([closed, LINK_SAHIL], '/pets');

        expect(el.querySelector('[data-testid=page]')).toBeNull();
        expect(el.querySelector('[data-testid=clinic-portal-closed]')?.textContent).toContain(PORTAL_CLINIC_CLOSED_MESSAGE);
        expect(el.textContent).toContain('Başka klinik seç');
    });

    it('kapalı klinikte hesap sayfaları açık kalır', async () => {
        const el = await open([closed], '/account');

        expect(el.querySelector('[data-testid=page]')).not.toBeNull();
        expect(el.querySelector('[data-testid=clinic-portal-closed]')).toBeNull();
    });
});
