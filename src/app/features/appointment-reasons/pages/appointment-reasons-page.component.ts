import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { DEFINITIONS_ROUTE, ONLINE_BOOKING_SETTINGS_ROUTE } from '@/app/core/routing/panel-navigation';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import { AppointmentReasonsManagerComponent } from '@/app/entities/online-booking/components/appointment-reasons-manager.component';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';

/**
 * Randevu nedenleri (APPT-005/006/007; ADR-042 K2), Tanımlar altında: klinik içi randevu formu nedenden süre önerir; online
 * talepte yalnız aktif ve online'da görünür nedenler listelenir. Yönetim ortak parçadadır (Online randevu sayfası da kullanır).
 * Yazma `Clinics.Update` ve salt okunur kiracı durumuna bağlıdır.
 */
@Component({
    selector: 'app-appointment-reasons-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, RouterLink, SelectModule, AppPageHeaderComponent, AppEmptyStateComponent, AppointmentReasonsManagerComponent],
    template: `
        <app-page-header
            [categoryLink]="definitionsRoute"
            categoryLinkLabel="Tanımlar"
            title="Randevu nedenleri"
            description="Randevu formunda ve online talepte seçilen nedenler. Nedenin süresi randevu süresine önerilir; uygun hekimler müsaitliği belirler."
        />

        @if (ro.mutationBlocked()) {
            <p class="text-amber-700 dark:text-amber-300 text-sm mb-4 m-0" role="status">Abonelik durumu nedeniyle randevu nedeni yönetimi salt okunur.</p>
        } @else if (!canManage) {
            <p class="text-sm text-muted-color mb-4 m-0" role="status">Nedenleri yalnız klinik yönetim yetkisi olan kullanıcı düzenler; liste salt okunurdur.</p>
        }

        <div class="card">
            @if (clinicOptions().length > 1) {
                <div class="flex flex-col gap-1 w-full md:max-w-sm mb-4">
                    <label for="reasonsClinic" class="text-sm font-medium text-muted-color">Klinik</label>
                    <p-select inputId="reasonsClinic" [options]="clinicOptions()" [ngModel]="clinicId()" (ngModelChange)="onClinicChange($event)" optionLabel="label" optionValue="value" class="w-full" />
                </div>
            }

            <p class="text-sm text-muted-color mt-0 mb-3" data-testid="reasons-online-link">
                Online talep ayarları, müşterinin göreceği önizleme ve kurulum kontrolü <a [routerLink]="onlineBookingRoute">Online randevu</a> sayfasındadır.
            </p>

            @if (!clinicId()) {
                <app-empty-state message="Aktif klinik bulunamadı." hint="Klinik seçimi yapıp yeniden deneyin." />
            } @else {
                <app-appointment-reasons-manager [clinicId]="clinicId()" [canWrite]="canWrite()" />
            }
        </div>
    `
})
export class AppointmentReasonsPageComponent implements OnInit {
    readonly definitionsRoute = DEFINITIONS_ROUTE;
    readonly onlineBookingRoute = ONLINE_BOOKING_SETTINGS_ROUTE;

    private readonly clinics = inject(ClinicsService);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canManage = this.auth.hasOperationClaim(CLINICS_UPDATE_CLAIM);
    readonly canWrite = computed(() => this.canManage && !this.ro.mutationBlocked());

    readonly clinicId = signal('');
    readonly clinicOptions = signal<SelectOption[]>([]);

    ngOnInit(): void {
        const active = this.auth.getClinicId()?.trim() ?? '';

        this.clinicId.set(active);
        this.clinicOptions.set(active ? [{ value: active, label: this.auth.getClinicName() ?? active }] : []);
        this.clinics.listClinics().subscribe({
            next: (list) => {
                const options = list.filter((c) => c.isActive !== false || c.id === active).map((c) => ({ value: c.id, label: c.name }));

                if (active && !options.some((o) => o.value === active)) {
                    options.unshift({ value: active, label: this.auth.getClinicName() ?? active });
                }

                this.clinicOptions.set(options);

                if (!this.clinicId() && options.length > 0) {
                    this.onClinicChange(options[0].value);
                }
            },
            error: () => undefined
        });
    }

    onClinicChange(clinicId: string): void {
        this.clinicId.set(clinicId);
    }
}
