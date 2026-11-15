import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { map } from 'rxjs';
import { SelectModule } from 'primeng/select';
import { CLINICS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { type InlineCreateConfig, InlineCreateDirective } from '@/app/shared/forms/inline-create/inline-create.directive';
import { InlineCreateOptionComponent } from '@/app/shared/forms/inline-create/inline-create-option.component';
import type { AppointmentReasonVm } from '@/app/entities/online-booking/models/online-booking.model';
import { AppointmentReasonsService } from '@/app/entities/online-booking/services/online-booking.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { findVeterinarianUserId } from '@/app/entities/visit/data/visit.mapper';
import type { VeterinarianVm } from '@/app/entities/visit/models/visit-vm.model';
import { VisitsService } from '@/app/entities/visit/services/visits.service';

const INLINE_REASON_DURATION_MINUTES = 30;

/**
 * Randevu formunda neden ve hekim (ADR-042 K2/K3): neden seçilince nedenin süresi önerilir (zorunlu değil, değiştirilebilir).
 * Pasif neden listede yalnız mevcut randevunun nedeniyse görünür. Hekim listesi okunamazsa (yetki) alan gizlenir; seçili değer
 * korunur ki güncelleme onu silmesin.
 */
@Component({
    selector: 'app-appointment-reason-vet-fields',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ReactiveFormsModule, SelectModule, InlineCreateDirective, InlineCreateOptionComponent],
    template: `
        <div class="grid grid-cols-12 gap-4">
            @if (reasonOptions().length > 0 || reasonCreate().canCreate) {
                <div class="col-span-12 md:col-span-6">
                    <label for="appointmentReason" class="block text-sm font-medium text-muted-color mb-2">Randevu nedeni</label>
                    <p-select inputId="appointmentReason" [formControl]="reasonControl()" [options]="reasonOptions()" optionLabel="label" optionValue="value" placeholder="Neden seçin (isteğe bağlı)" [showClear]="true" [filter]="true" filterBy="label" filterPlaceholder="Ara…" [appInlineCreate]="reasonCreate()" class="w-full" (onChange)="onReasonChange($event.value)">
                        <ng-template #emptyfilter><app-inline-create-option /></ng-template>
                        <ng-template #empty><app-inline-create-option emptyText="Henüz randevu nedeni yok." /></ng-template>
                    </p-select>
                    <small class="text-muted-color">Seçilen nedenin süresi randevu süresine önerilir.</small>
                </div>
            }
            @if (vetOptions().length > 0) {
                <div class="col-span-12 md:col-span-6">
                    <label for="appointmentVet" class="block text-sm font-medium text-muted-color mb-2">Hekim</label>
                    <p-select inputId="appointmentVet" [formControl]="vetControl()" [options]="vetOptions()" optionLabel="label" optionValue="value" placeholder="Hekim seçin (isteğe bağlı)" [showClear]="true" class="w-full" />
                </div>
            }
        </div>
    `
})
export class AppointmentReasonVetFieldsComponent {
    readonly clinicId = input<string>('');
    readonly reasonControl = input.required<FormControl<string | null>>();
    readonly vetControl = input.required<FormControl<string | null>>();
    /** Mevcut randevunun nedeni; pasif olsa da seçenek olarak kalır. */
    readonly keepReasonId = input<string | null>(null);
    /** Yeni randevu: hekim boşsa oturumdaki kullanıcı hekim listesindeyse o seçilir (geliş diyaloğundaki kural). */
    readonly preselectSelf = input(false);
    readonly durationSuggested = output<number>();

    private readonly reasonsService = inject(AppointmentReasonsService);
    private readonly visits = inject(VisitsService);
    private readonly auth = inject(AuthService);
    private readonly ro = inject(TenantReadOnlyContextService);

    readonly reasons = signal<AppointmentReasonVm[]>([]);
    readonly vets = signal<VeterinarianVm[]>([]);
    readonly reasonOptions = computed(() =>
        this.reasons()
            .filter((r) => r.isActive || r.id === this.keepReasonId())
            .map((r) => ({ value: r.id, label: `${r.name} (${r.defaultDurationMinutes} dk)${r.isActive ? '' : ' — pasif'}` }))
    );
    /**
     * Aranan neden yoksa adıyla eklenir ve seçilir (O1). Süre neden ekranının varsayılanıdır (30 dk); yerinde eklenen neden
     * online randevuda görünmez, açmak neden ekranından bilinçli yapılır.
     */
    readonly reasonCreate = computed<InlineCreateConfig>(() => {
        const clinicId = this.clinicId()?.trim() ?? '';

        return {
            canCreate: !!clinicId && this.auth.hasOperationClaim(CLINICS_UPDATE_CLAIM) && !this.ro.mutationBlocked(),
            create: (name) =>
                this.reasonsService.create(clinicId, { name: name.trim(), defaultDurationMinutes: INLINE_REASON_DURATION_MINUTES, isOnlineBookable: false, sortOrder: null, veterinarianUserIds: [] }).pipe(
                    map((reason) => {
                        this.reasons.update((r) => [...r, reason]);
                        this.durationSuggested.emit(reason.defaultDurationMinutes);

                        return reason.id;
                    })
                )
        };
    });
    readonly vetOptions = computed(() => this.vets().map((v) => ({ value: v.userId, label: v.name })));

    constructor() {
        effect(() => {
            const clinicId = this.clinicId()?.trim();

            if (!clinicId) {
                return;
            }

            this.reasonsService.list(clinicId).subscribe({ next: (r) => this.reasons.set(r), error: () => this.reasons.set([]) });
            this.visits.getVeterinarians(clinicId).subscribe({ next: (v) => this.onVetsLoaded(v), error: () => this.vets.set([]) });
        });
    }

    private onVetsLoaded(vets: VeterinarianVm[]): void {
        this.vets.set(vets);
        const control = this.vetControl();

        if (this.preselectSelf() && !control.value) {
            const self = findVeterinarianUserId(vets, this.auth.getUserId());

            if (self) {
                control.setValue(self);
            }
        }
    }

    onReasonChange(reasonId: string | null): void {
        const reason = this.reasons().find((r) => r.id === reasonId);

        if (reason) {
            this.durationSuggested.emit(reason.defaultDurationMinutes);
        }
    }
}
