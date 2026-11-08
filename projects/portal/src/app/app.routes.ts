import { Routes } from '@angular/router';
import { environment } from '@portal/environments/environment';
import { portalAuthGuard, portalClinicGuard, portalGuestGuard } from './core/auth/portal-auth.guards';
import { portalAcceptanceGuard } from './features/legal/portal-acceptance.guard';

/** Davet bağlantısı yolu (sözleşme §4.2: `{PortalBaseUrl}/invite?token=…`). */
const INVITE_ROUTE = environment.invitePath.replace(/^\/+/, '');

const title = (page: string) => `${page} · Vetinity`;

export const portalRoutes: Routes = [
    {
        path: INVITE_ROUTE,
        title: title('Davet'),
        loadComponent: () => import('./features/invite/portal-invite.component').then((m) => m.PortalInviteComponent)
    },
    {
        // Kliniğe özel online randevu bağlantısı (ADR-042 K1): kimliksiz, kabuk dışında.
        path: 'randevu/:bookingCode',
        title: title('Online randevu'),
        loadComponent: () => import('./features/booking/portal-public-booking.component').then((m) => m.PortalPublicBookingComponent)
    },
    {
        // Hatırlatmadaki "onayla / iptal et" bağlantısı (TIER-019): kimliksiz, kabuk dışında; açmak bir şey değiştirmez.
        path: 'randevu-yanit',
        title: title('Randevu'),
        loadComponent: () => import('./features/appointment-link/portal-appointment-link.component').then((m) => m.PortalAppointmentLinkComponent)
    },
    {
        // Bekleme listesi teklifi (TIER-018): kimliksiz, kabuk dışında; açmak bir şey değiştirmez, kabul ve ret düğmeyle.
        path: 'bekleme-teklifi',
        title: title('Boşalan randevu saati'),
        loadComponent: () => import('./features/waitlist-offer/portal-waitlist-offer.component').then((m) => m.PortalWaitlistOfferComponent)
    },
    {
        path: 'ticari-ileti-ret',
        title: title('Ticari ileti'),
        loadComponent: () => import('./features/marketing-opt-out/portal-marketing-opt-out.component').then((m) => m.PortalMarketingOptOutComponent)
    },
    {
        path: 'login',
        title: title('Giriş'),
        canActivate: [portalGuestGuard],
        loadComponent: () => import('./features/auth/portal-login.component').then((m) => m.PortalLoginComponent)
    },
    {
        path: 'password-reset',
        title: title('Parola sıfırlama'),
        canActivate: [portalGuestGuard],
        loadComponent: () => import('./features/auth/portal-password-reset.component').then((m) => m.PortalPasswordResetComponent)
    },
    {
        path: 'legal/terms',
        title: title('Kullanım Şartları'),
        data: { documentType: 'PortalTerms' },
        loadComponent: () => import('./features/legal/portal-legal-page.component').then((m) => m.PortalLegalPageComponent)
    },
    {
        path: 'legal/privacy',
        title: title('Gizlilik Politikası'),
        data: { documentType: 'PortalPrivacy' },
        loadComponent: () => import('./features/legal/portal-legal-page.component').then((m) => m.PortalLegalPageComponent)
    },
    {
        path: 'offline',
        title: title('Çevrimdışı'),
        loadComponent: () => import('./features/offline/portal-offline.component').then((m) => m.PortalOfflineComponent)
    },
    {
        path: 'accept',
        title: title('Onaylar'),
        canActivate: [portalAuthGuard],
        loadComponent: () => import('./features/legal/portal-acceptance.component').then((m) => m.PortalAcceptanceComponent)
    },
    {
        path: 'clinics',
        title: title('Klinik seçimi'),
        canActivate: [portalAuthGuard, portalAcceptanceGuard],
        loadComponent: () => import('./features/clinics/portal-clinic-select.component').then((m) => m.PortalClinicSelectComponent)
    },
    {
        path: '',
        canActivate: [portalAuthGuard, portalAcceptanceGuard, portalClinicGuard],
        loadComponent: () => import('./layout/portal-shell.component').then((m) => m.PortalShell),
        children: [
            {
                path: '',
                title: title('Ana sayfa'),
                loadComponent: () => import('./features/home/portal-home.component').then((m) => m.PortalHomeComponent)
            },
            {
                path: 'pets',
                title: title('Hayvanlarım'),
                loadComponent: () => import('./features/pets/portal-pets.component').then((m) => m.PortalPetsComponent)
            },
            {
                path: 'pets/:petId',
                title: title('Hayvan bilgileri'),
                loadComponent: () => import('./features/pets/portal-pet-detail.component').then((m) => m.PortalPetDetailComponent)
            },
            {
                path: 'appointments',
                title: title('Randevularım'),
                loadComponent: () => import('./features/appointments/portal-appointments.component').then((m) => m.PortalAppointmentsComponent)
            },
            {
                path: 'appointments/requests',
                title: title('Randevu taleplerim'),
                loadComponent: () => import('./features/booking/portal-appointment-requests.component').then((m) => m.PortalAppointmentRequestsComponent)
            },
            {
                path: 'appointments/requests/new',
                title: title('Randevu talebi'),
                loadComponent: () => import('./features/booking/portal-appointment-request.component').then((m) => m.PortalAppointmentRequestComponent)
            },
            {
                path: 'balance',
                title: title('Bakiye ve ödemeler'),
                loadComponent: () => import('./features/balance/portal-balance.component').then((m) => m.PortalBalanceComponent)
            },
            {
                path: 'clinic',
                title: title('Klinik bilgileri'),
                loadComponent: () => import('./features/clinic/portal-clinic.component').then((m) => m.PortalClinicComponent)
            },
            {
                path: 'account',
                title: title('Hesabım'),
                loadComponent: () => import('./features/account/portal-account.component').then((m) => m.PortalAccountComponent)
            },
            {
                path: 'account/data-requests',
                title: title('Verilerimle ilgili talep'),
                loadComponent: () => import('./features/data-requests/portal-data-requests.component').then((m) => m.PortalDataRequestsComponent)
            },
            {
                path: 'account/delete',
                title: title('Hesabı sil'),
                loadComponent: () => import('./features/account/portal-account-deletion.component').then((m) => m.PortalAccountDeletionComponent)
            }
        ]
    },
    { path: '**', redirectTo: '' }
];
