import { ChangeDetectionStrategy, Component, computed, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { APPOINTMENT_TYPE_WRITE_OPTIONS } from '@/app/entities/appointment/utils/appointment-type.utils';
import { ClientSearchComponent } from '@/app/entities/client/components/client-search.component';
import { PetSearchComponent } from '@/app/entities/pet/components/pet-search.component';
import type { VeterinarianVm } from '@/app/entities/visit/models/visit-vm.model';
import { WAITLIST_LIMITS, type WaitlistEntryDto, type WaitlistWeekday } from '@/app/entities/waitlist/models/waitlist.model';
import { WaitlistService } from '@/app/entities/waitlist/services/waitlist.service';
import { WAITLIST_WEEKDAYS, waitlistBlockerLabel, waitlistDaysBody } from '@/app/entities/waitlist/utils/waitlist-labels.utils';
import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

/** `yyyy-MM-dd` (yerel takvim günü). */
function localDate(offsetDays = 0): string {
    const d = new Date();

    d.setDate(d.getDate() + offsetDays);

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Bekleme listesine ekleme (TIER-018; sözleşme §2 `POST /waitlist-entries`): hasta sahibi ve hayvan, istenen hekim (isteğe bağlı), randevu
 * türü, tarih aralığı, uygun gün ve saat tercihi, not. Kurallar backend'dedir; burada yalnız zorunlu seçimler denetlenir. Kayıt
 * eklendikten sonra teklif gidemeyecekse (e-posta yok, hatırlatma kapalı) uyarı gösterilir.
 */
@Component({
    selector: 'app-waitlist-entry-dialog',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ButtonModule, CheckboxModule, DialogModule, MessageModule, SelectModule, TextareaModule, ClientSearchComponent, PetSearchComponent, DateInputComponent],
    template: `
        <p-dialog header="Bekleme listesine ekle" [(visible)]="visible" [modal]="true" [style]="{ width: '40rem' }" [breakpoints]="{ '640px': '95vw' }" (onHide)="reset()">
            <form class="flex flex-col gap-3" (ngSubmit)="save()">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="flex flex-col gap-1">
                        <label for="wlClient" class="text-sm font-medium">Müşteri</label>
                        <app-client-search inputId="wlClient" name="wlClient" [ngModel]="clientId()" (ngModelChange)="selectClient($event)" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label for="wlPet" class="text-sm font-medium">Hayvan</label>
                        <app-pet-search inputId="wlPet" name="wlPet" [clientId]="clientId()" [activeOnly]="true" [ngModel]="petId()" (ngModelChange)="petId.set($event || '')" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label for="wlVet" class="text-sm font-medium">İstenen hekim</label>
                        <p-select inputId="wlVet" name="wlVet" [options]="veterinarians()" optionLabel="name" optionValue="userId" [ngModel]="vetId()" (ngModelChange)="vetId.set($event ?? null)" [showClear]="true" placeholder="Fark etmez" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label for="wlType" class="text-sm font-medium">Randevu türü</label>
                        <p-select inputId="wlType" name="wlType" [options]="typeOptions" optionLabel="label" optionValue="value" [ngModel]="appointmentType()" (ngModelChange)="appointmentType.set($event)" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label for="wlFrom" class="text-sm font-medium">En erken tarih</label>
                        <app-date-input inputId="wlFrom" name="wlFrom" type="date" [min]="today" [ngModel]="earliestDate()" (ngModelChange)="earliestDate.set($event ?? '')" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label for="wlTo" class="text-sm font-medium">En geç tarih</label>
                        <app-date-input inputId="wlTo" name="wlTo" type="date" [min]="earliestDate() || today" [ngModel]="latestDate()" (ngModelChange)="latestDate.set($event ?? '')" />
                    </div>
                </div>

                <fieldset class="m-0 p-0 border-0 flex flex-col gap-1">
                    <legend class="text-sm font-medium mb-1">Uygun günler</legend>
                    <div class="flex flex-wrap gap-3">
                        @for (d of weekdays; track d.value) {
                            <span class="flex items-center gap-1">
                                <p-checkbox [inputId]="'wlDay' + d.value" [name]="'wlDay' + d.value" [binary]="true" [ngModel]="days().includes(d.value)" (ngModelChange)="toggleDay(d.value, $event)" />
                                <label class="text-sm cursor-pointer" [for]="'wlDay' + d.value">{{ d.short }}</label>
                            </span>
                        }
                    </div>
                    <small class="text-muted-color">Hiçbiri seçilmezse her gün uygundur.</small>
                </fieldset>

                <div class="grid grid-cols-2 gap-3">
                    <div class="flex flex-col gap-1">
                        <label for="wlTimeFrom" class="text-sm font-medium">Saat (en erken)</label>
                        <app-date-input inputId="wlTimeFrom" name="wlTimeFrom" type="time" [ngModel]="fromTime()" (ngModelChange)="fromTime.set($event ?? '')" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label for="wlTimeTo" class="text-sm font-medium">Saat (en geç)</label>
                        <app-date-input inputId="wlTimeTo" name="wlTimeTo" type="time" [ngModel]="toTime()" (ngModelChange)="toTime.set($event ?? '')" />
                    </div>
                </div>

                <div class="flex flex-col gap-1">
                    <label for="wlNote" class="text-sm font-medium">Not</label>
                    <textarea id="wlNote" name="wlNote" pTextarea rows="2" [maxlength]="limits.note" [ngModel]="note()" (ngModelChange)="note.set($event)" placeholder="Örn. erken gelmek istiyor, öğleden sonra uygun"></textarea>
                </div>

                @if (error(); as m) {
                    <p-message severity="error" class="w-full" role="alert" data-testid="wl-form-error">{{ m }}</p-message>
                }

                <div class="flex justify-end gap-2">
                    <button pButton type="button" severity="secondary" [outlined]="true" (click)="visible.set(false)">Vazgeç</button>
                    <button pButton type="submit" [disabled]="!canSave()" data-testid="wl-save"><i class="pi pi-check"></i>Listeye ekle</button>
                </div>
            </form>
        </p-dialog>
    `
})
export class WaitlistEntryDialogComponent {
    private readonly api = inject(WaitlistService);

    readonly visible = model(false);
    readonly clinicId = input.required<string>();
    readonly veterinarians = input<VeterinarianVm[]>([]);
    /** Kayıt eklendi; teklif gidemeyecekse çağıran uyarıyı gösterir. */
    readonly saved = output<{ entry: WaitlistEntryDto; warning: string | null }>();

    protected readonly typeOptions = [...APPOINTMENT_TYPE_WRITE_OPTIONS];
    protected readonly weekdays = WAITLIST_WEEKDAYS;
    protected readonly limits = WAITLIST_LIMITS;
    protected readonly today = localDate();

    readonly clientId = signal('');
    readonly petId = signal('');
    readonly vetId = signal<string | null>(null);
    readonly appointmentType = signal<number>(APPOINTMENT_TYPE_WRITE_OPTIONS[0].value);
    readonly earliestDate = signal(localDate());
    readonly latestDate = signal(localDate(30));
    readonly days = signal<WaitlistWeekday[]>([]);
    readonly fromTime = signal('');
    readonly toTime = signal('');
    readonly note = signal('');
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);

    readonly canSave = computed(() => !!this.clientId() && !!this.petId() && !!this.earliestDate() && !!this.latestDate() && !this.saving());

    selectClient(id: string | null): void {
        if ((id ?? '') !== this.clientId()) {
            this.petId.set('');
        }

        this.clientId.set(id ?? '');
    }

    toggleDay(day: WaitlistWeekday, on: boolean): void {
        this.days.update((list) => (on ? [...list.filter((d) => d !== day), day] : list.filter((d) => d !== day)));
    }

    save(): void {
        if (!this.canSave()) {
            return;
        }

        this.error.set(null);
        this.saving.set(true);
        this.api
            .create({
                clinicId: this.clinicId(),
                clientId: this.clientId(),
                petId: this.petId(),
                preferredVeterinarianUserId: this.vetId(),
                appointmentType: this.appointmentType(),
                reasonId: null,
                durationMinutes: null,
                earliestDate: this.earliestDate(),
                latestDate: this.latestDate(),
                preferredDays: waitlistDaysBody(this.days()),
                // Sunucu `TimeOnly`: saniyeyle gönderilir.
                preferredFromTime: this.fromTime() ? `${this.fromTime()}:00` : null,
                preferredToTime: this.toTime() ? `${this.toTime()}:00` : null,
                note: this.note().trim() || null
            })
            .subscribe({
                next: (entry) => {
                    this.saving.set(false);
                    this.saved.emit({ entry, warning: waitlistBlockerLabel(entry.offerBlocker) });
                    this.visible.set(false);
                },
                error: (err: unknown) => {
                    this.saving.set(false);
                    this.error.set(panelHttpFailureMessage(err, 'Kayıt eklenemedi.'));
                }
            });
    }

    reset(): void {
        this.clientId.set('');
        this.petId.set('');
        this.vetId.set(null);
        this.appointmentType.set(APPOINTMENT_TYPE_WRITE_OPTIONS[0].value);
        this.earliestDate.set(localDate());
        this.latestDate.set(localDate(30));
        this.days.set([]);
        this.fromTime.set('');
        this.toTime.set('');
        this.note.set('');
        this.error.set(null);
    }
}
