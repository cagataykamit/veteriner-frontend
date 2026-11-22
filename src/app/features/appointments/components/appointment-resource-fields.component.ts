import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import type { AppointmentResourceType, AppointmentResourceVm } from '@/app/entities/appointment-resource/models/appointment-resource.model';
import { AppointmentResourcesService } from '@/app/entities/appointment-resource/services/appointment-resources.service';

/**
 * Randevu formunda oda ve cihaz (ADR-053 K3): ikisi de isteğe bağlı. Klinikte o türden aktif kaynak yoksa alan hiç görünmez (küçük
 * klinik sade kalır). Pasif kaynak listede yalnız mevcut randevunun kaynağıysa görünür. Aynı kaynağa kapasitesinden fazla randevu
 * sunucuda reddedilir (409 `Appointments.ResourceTimeConflict`); form hatayı kaydette gösterir.
 */
@Component({
    selector: 'app-appointment-resource-fields',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ReactiveFormsModule, SelectModule],
    template: `
        @if (roomOptions().length > 0 || equipmentOptions().length > 0) {
            <div class="grid grid-cols-12 gap-4" data-testid="appointment-resource-fields">
                @if (roomOptions().length > 0) {
                    <div class="col-span-12 md:col-span-6">
                        <label for="appointmentRoom" class="block text-sm font-medium text-muted-color mb-2">Oda</label>
                        <p-select inputId="appointmentRoom" [formControl]="roomControl()" [options]="roomOptions()" optionLabel="label" optionValue="value" placeholder="Oda seçin (isteğe bağlı)" [showClear]="true" class="w-full" />
                    </div>
                }
                @if (equipmentOptions().length > 0) {
                    <div class="col-span-12 md:col-span-6">
                        <label for="appointmentEquipment" class="block text-sm font-medium text-muted-color mb-2">Cihaz</label>
                        <p-select inputId="appointmentEquipment" [formControl]="equipmentControl()" [options]="equipmentOptions()" optionLabel="label" optionValue="value" placeholder="Cihaz seçin (isteğe bağlı)" [showClear]="true" class="w-full" />
                    </div>
                }
            </div>
        }
    `
})
export class AppointmentResourceFieldsComponent {
    readonly clinicId = input<string>('');
    readonly roomControl = input.required<FormControl<string | null>>();
    readonly equipmentControl = input.required<FormControl<string | null>>();
    /** Mevcut randevunun kaynakları; pasif olsa da seçenek olarak kalır. */
    readonly keepIds = input<readonly (string | null)[]>([]);

    private readonly service = inject(AppointmentResourcesService);

    readonly resources = signal<AppointmentResourceVm[]>([]);
    readonly roomOptions = computed(() => this.optionsOf('Room'));
    readonly equipmentOptions = computed(() => this.optionsOf('Equipment'));

    constructor() {
        effect(() => {
            const clinicId = this.clinicId()?.trim();

            if (!clinicId) {
                return;
            }

            // Okunamazsa (yetki) alanlar gizlenir; seçili değer korunur ki güncelleme onu silmesin.
            this.service.list(clinicId).subscribe({ next: (list) => this.resources.set(list), error: () => this.resources.set([]) });
        });
    }

    private optionsOf(type: AppointmentResourceType): { value: string; label: string }[] {
        const keep = this.keepIds();

        return this.resources()
            .filter((r) => r.type === type && (r.isActive || keep.includes(r.id)))
            .map((r) => ({ value: r.id, label: r.isActive ? r.name : `${r.name} — pasif` }));
    }
}
