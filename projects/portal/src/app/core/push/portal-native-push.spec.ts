import type { Mock } from 'vitest';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { waitFor } from '@portal/app/testing/portal-testing';
import { PORTAL_PUSH_PLUGIN, PortalNativePush, portalPushRoute } from './portal-native-push';
import { PortalPushRegistration } from './portal-push-registration';

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.Eager, template: '' })
class BlankPage {}

describe('portalPushRoute', () => {
    it('bildirim türünü ilgili ekrana eşler, bilinmeyen tür ana sayfa', () => {
        expect(portalPushRoute('AppointmentRequestApproved')).toBe('/appointments/requests');
        expect(portalPushRoute('AppointmentReminder')).toBe('/appointments');
        expect(portalPushRoute('FollowUpReminder')).toBe('/appointments');
        expect(portalPushRoute('VaccinationReminder')).toBe('/pets');
        expect(portalPushRoute('DebtReminder')).toBe('/balance');
        expect(portalPushRoute('DataRequestAnswered')).toBe('/account/data-requests');
        expect(portalPushRoute('Marketing')).toBe('/');
        expect(portalPushRoute(undefined)).toBe('/');
    });
});

describe('PortalNativePush', () => {
    let listeners: Map<string, (event: unknown) => void>;
    let addListener: Mock;
    let sync: Mock;
    const authenticated = signal(false);

    beforeEach(() => {
        listeners = new Map();
        authenticated.set(false);
        addListener = vi.fn((name: string, fn: (event: unknown) => void) => {
            listeners.set(name, fn);

            return Promise.resolve({ remove: () => Promise.resolve() });
        });
        sync = vi.fn(() => of(undefined));

        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    { path: '', component: BlankPage },
                    { path: 'balance', component: BlankPage }
                ]),
                { provide: PORTAL_PUSH_PLUGIN, useValue: { addListener } },
                { provide: PortalSessionService, useValue: { isAuthenticated: authenticated } },
                { provide: PortalPushRegistration, useValue: { syncThisDevice: sync } }
            ]
        });
    });

    it('bildirime dokununca türün ekranını açar; dinleyici bir kez eklenir', async () => {
        const push = TestBed.inject(PortalNativePush);

        push.start();
        push.start();

        expect(addListener).toHaveBeenCalledTimes(1);
        listeners.get('pushNotificationActionPerformed')!({ actionId: 'tap', notification: { data: { type: 'DebtReminder' } } });

        const router = TestBed.inject(Router);

        await waitFor(() => router.url === '/balance');
    });

    it('oturum açılınca cihaz jetonunu eşitler', async () => {
        TestBed.inject(PortalNativePush).start();
        TestBed.tick();
        expect(sync).not.toHaveBeenCalled();

        authenticated.set(true);
        TestBed.tick();

        expect(sync).toHaveBeenCalledTimes(1);
    });
});
