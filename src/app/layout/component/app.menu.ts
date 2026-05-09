import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    APPOINTMENTS_READ_CLAIM,
    CLIENTS_READ_CLAIM,
    CLINICS_READ_CLAIM,
    EXAMINATIONS_READ_CLAIM,
    HOSPITALIZATIONS_READ_CLAIM,
    LAB_RESULTS_READ_CLAIM,
    PAYMENTS_READ_CLAIM,
    PRODUCTS_READ_CLAIM,
    PETS_READ_CLAIM,
    PRESCRIPTIONS_READ_CLAIM,
    REMINDERS_MANAGE_CLAIM,
    REMINDERS_READ_CLAIM,
    SUBSCRIPTIONS_MANAGE_CLAIM,
    SUBSCRIPTIONS_READ_CLAIM,
    TENANT_MANAGEMENT_CLAIM,
    TREATMENTS_READ_CLAIM,
    VACCINATIONS_READ_CLAIM
} from '@/app/core/auth/operation-claims.constants';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `<ul class="layout-menu">
        @for (item of model; track item.label) {
            @if (!item.separator) {
                <li app-menuitem [item]="item" [root]="true"></li>
            } @else {
                <li class="menu-separator"></li>
            }
        }
    </ul> `,
})
export class AppMenu {
    private readonly auth = inject(AuthService);
    model: MenuItem[] = [];

    ngOnInit() {
        const canReadReminders = this.auth.hasOperationClaim(REMINDERS_READ_CLAIM);
        const canManageReminders = this.auth.hasOperationClaim(REMINDERS_MANAGE_CLAIM);
        const reminderItems: MenuItem[] = [];
        if (canReadReminders || canManageReminders) {
            reminderItems.push({ label: 'Hatırlatmalar', icon: 'pi pi-fw pi-bell', routerLink: ['/panel/settings/reminders'] });
        }
        if (canReadReminders) {
            reminderItems.push({ label: 'Hatırlatma Geçmişi', icon: 'pi pi-fw pi-history', routerLink: ['/panel/settings/reminders/logs'] });
        }

        const canAccessSubscriptionPage =
            this.auth.hasOperationClaim(SUBSCRIPTIONS_READ_CLAIM) ||
            this.auth.hasOperationClaim(SUBSCRIPTIONS_MANAGE_CLAIM);
        const canReadClients = this.auth.hasOperationClaim(CLIENTS_READ_CLAIM);
        const canReadPets = this.auth.hasOperationClaim(PETS_READ_CLAIM);
        const canReadAppointments = this.auth.hasOperationClaim(APPOINTMENTS_READ_CLAIM);
        const canReadExaminations = this.auth.hasOperationClaim(EXAMINATIONS_READ_CLAIM);
        const canReadVaccinations = this.auth.hasOperationClaim(VACCINATIONS_READ_CLAIM);
        const canReadPayments = this.auth.hasOperationClaim(PAYMENTS_READ_CLAIM);
        const canReadProducts = this.auth.hasOperationClaim(PRODUCTS_READ_CLAIM);
        const canReadTreatments = this.auth.hasOperationClaim(TREATMENTS_READ_CLAIM);
        const canReadPrescriptions = this.auth.hasOperationClaim(PRESCRIPTIONS_READ_CLAIM);
        const canReadLabResults = this.auth.hasOperationClaim(LAB_RESULTS_READ_CLAIM);
        const canReadHospitalizations = this.auth.hasOperationClaim(HOSPITALIZATIONS_READ_CLAIM);
        const canReadClinics = this.auth.hasOperationClaim(CLINICS_READ_CLAIM);

        const canManageTenantAccess = this.auth.hasOperationClaim(TENANT_MANAGEMENT_CLAIM);
        const tenantManagementItems: MenuItem[] = [];
        if (canManageTenantAccess) {
            tenantManagementItems.push(
                { label: 'Kurum Bilgileri', icon: 'pi pi-fw pi-id-card', routerLink: ['/panel/settings/organization'] },
                { label: 'Kurum üyeleri', icon: 'pi pi-fw pi-users', routerLink: ['/panel/settings/members'] },
                { label: 'Davetler', icon: 'pi pi-fw pi-list', routerLink: ['/panel/settings/invites/list'] },
                { label: 'Davet oluştur', icon: 'pi pi-fw pi-user-plus', routerLink: ['/panel/settings/invites'] }
            );
        }

        const reportMenuItems: MenuItem[] = [
            ...(canReadPayments
                ? [{ label: 'Ödeme Raporu', icon: 'pi pi-fw pi-file-export', routerLink: ['/panel/reports/payments'] }]
                : []),
            ...(canReadAppointments
                ? [{ label: 'Randevu Raporu', icon: 'pi pi-fw pi-calendar-plus', routerLink: ['/panel/reports/appointments'] }]
                : []),
            ...(canReadExaminations
                ? [{ label: 'Muayene Raporu', icon: 'pi pi-fw pi-file-edit', routerLink: ['/panel/reports/examinations'] }]
                : []),
            ...(canReadVaccinations
                ? [{ label: 'Aşı Raporu', icon: 'pi pi-fw pi-shield', routerLink: ['/panel/reports/vaccinations'] }]
                : [])
        ];
        const canShowReportsGroup = reportMenuItems.length > 0;

        this.model = [
            {
                label: 'Panel',
                items: [{ label: 'Özet', icon: 'pi pi-fw pi-home', routerLink: ['/panel/dashboard'] }]
            },
            {
                label: 'Hasta yönetimi',
                items: [
                    ...(canReadClients ? [{ label: 'Müşteriler', icon: 'pi pi-fw pi-users', routerLink: ['/panel/clients'] }] : []),
                    ...(canReadPets ? [{ label: 'Hayvanlar', icon: 'pi pi-fw pi-heart', routerLink: ['/panel/pets'] }] : []),
                    { label: 'Türler', icon: 'pi pi-fw pi-tags', routerLink: ['/panel/species'] },
                    { label: 'Irklar', icon: 'pi pi-fw pi-sitemap', routerLink: ['/panel/breeds'] },
                    ...(canReadAppointments ? [{ label: 'Randevular', icon: 'pi pi-fw pi-calendar', routerLink: ['/panel/appointments'] }] : []),
                    ...(canReadAppointments
                        ? [{ label: 'Randevu Takvimi', icon: 'pi pi-fw pi-calendar-clock', routerLink: ['/panel/appointments/calendar'] }]
                        : []),
                    ...(canReadExaminations ? [{ label: 'Muayeneler', icon: 'pi pi-fw pi-file-edit', routerLink: ['/panel/examinations'] }] : []),
                    ...(canReadTreatments ? [{ label: 'Tedaviler', icon: 'pi pi-fw pi-briefcase', routerLink: ['/panel/treatments'] }] : []),
                    ...(canReadPrescriptions ? [{ label: 'Reçeteler', icon: 'pi pi-fw pi-file', routerLink: ['/panel/prescriptions'] }] : []),
                    ...(canReadLabResults ? [{ label: 'Lab sonuçları', icon: 'pi pi-fw pi-chart-bar', routerLink: ['/panel/lab-results'] }] : []),
                    ...(canReadHospitalizations ? [{ label: 'Yatışlar', icon: 'pi pi-fw pi-building', routerLink: ['/panel/hospitalizations'] }] : []),
                    ...(canReadVaccinations ? [{ label: 'Aşılar', icon: 'pi pi-fw pi-shield', routerLink: ['/panel/vaccinations'] }] : []),
                    ...(canReadPayments ? [{ label: 'Ödemeler', icon: 'pi pi-fw pi-credit-card', routerLink: ['/panel/payments'] }] : [])
                ]
            },
            ...(canReadProducts
                ? [
                      {
                          label: 'Ürün ve Stok',
                          items: [{ label: 'Ürünler', icon: 'pi pi-fw pi-box', routerLink: ['/panel/products'] }]
                      }
                  ]
                : []),
            ...(canShowReportsGroup ? [{ label: 'Raporlar', items: reportMenuItems }] : []),
            {
                label: 'Hesap',
                items: [
                    ...(canAccessSubscriptionPage
                        ? [{ label: 'Abonelik', icon: 'pi pi-fw pi-wallet', routerLink: ['/panel/settings/subscription'] }]
                        : []),
                    ...(canReadClinics ? [{ label: 'Klinikler', icon: 'pi pi-fw pi-building', routerLink: ['/panel/settings/clinics'] }] : []),
                    ...reminderItems,
                    ...tenantManagementItems,
                    { label: 'Giriş', icon: 'pi pi-fw pi-sign-in', routerLink: ['/auth/login'] }
                ]
            }
        ];
    }
}
