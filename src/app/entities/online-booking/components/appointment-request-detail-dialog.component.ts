import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import type { Observable } from 'rxjs';
import { ClientSearchComponent } from '@/app/entities/client/components/client-search.component';
import {
    AppointmentRequestEmailKind,
    AppointmentRequestStatus,
    REJECTION_REASON_MAX,
    REJECTION_REASON_MIN,
    type AppointmentRequestDetailVm,
    type EmailMessageVm,
    type StaffAvailabilityDayVm
} from '@/app/entities/online-booking/models/online-booking.model';
import { AppointmentRequestsService, OnlineBookingService } from '@/app/entities/online-booking/services/online-booking.service';
import {
    appointmentRequestActorLabel,
    appointmentRequestSourceLabel,
    appointmentRequestStatusLabel,
    appointmentRequestStatusSeverity
} from '@/app/entities/online-booking/utils/appointment-request-labels.utils';
import { OnlineBookingError } from '@/app/entities/online-booking/utils/online-booking-error.utils';
import { PetSearchComponent } from '@/app/entities/pet/components/pet-search.component';
import { VisitQuickRegistrationComponent } from '@/app/entities/visit/components/visit-quick-registration.component';
import type { PetSuggestion, VeterinarianVm } from '@/app/entities/visit/models/visit-vm.model';
import { VisitsService } from '@/app/entities/visit/services/visits.service';
import { formatDateTimeDisplay, formatTimeDisplay, toIstanbulDateInputValue } from '@/app/shared/utils/date.utils';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';

type Mode = 'view' | 'approve' | 'reject';

/**
 * Talep detayı (APPT-011; ADR-042 K4/K5): bilgiler, geçmiş ve karar. Onayda müşteri/hayvan eşleştirilir (portal talebinde bağın
 * müşterisi sabittir; bağlantı talebinde mevcut müşteri seçilir ya da hızlı kayıtla oluşturulur), istenen saat korunur ya da
 * müsait saatlerden farklı saat seçilir (yeniden planlama), hekim seçilir ya da boş uygun hekim otomatik atanır. Sahibe gidecek
 * e-posta önizlenip düzenlenebilir. Red gerekçesi zorunludur.
 */
@Component({
    selector: 'app-appointment-request-detail-dialog',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        FormsModule,
        NgTemplateOutlet,
        RouterLink,
        ButtonModule,
        DialogModule,
        InputTextModule,
        MessageModule,
        RadioButtonModule,
        SelectModule,
        TextareaModule,
        ClientSearchComponent,
        PetSearchComponent,
        VisitQuickRegistrationComponent,
        AppStatusTagComponent
    ],
    template: `
        <p-dialog header="Randevu talebi" [modal]="true" [visible]="visible()" (visibleChange)="onVisibleChange($event)" [style]="{ width: 'min(46rem, 96vw)' }" [draggable]="false">
            @if (loading()) {
                <p class="text-muted-color m-0"><i class="pi pi-spin pi-spinner mr-2"></i>Yükleniyor…</p>
            } @else if (loadError()) {
                <p-message severity="error" class="w-full">{{ loadError() }}</p-message>
            } @else if (detail(); as d) {
                <div class="flex flex-col gap-4" data-testid="request-detail">
                    <div class="flex flex-wrap items-center gap-2">
                        <app-status-tag [label]="statusLabel(d.summary.status)" [severity]="statusSeverity(d.summary.status)" />
                        <span class="text-sm text-muted-color">{{ sourceLabel(d.summary.source) }} · {{ d.summary.reasonName }} · {{ d.summary.durationMinutes }} dk</span>
                    </div>

                    <dl class="grid grid-cols-12 gap-x-4 gap-y-2 m-0 text-sm">
                        <dt class="col-span-4 text-muted-color">İstenen saat</dt>
                        <dd class="col-span-8 m-0 font-medium">{{ fmt(d.summary.requestedStartUtc) }}</dd>
                        <dt class="col-span-4 text-muted-color">Sahip</dt>
                        <dd class="col-span-8 m-0">
                            {{ d.summary.contactName }} · {{ d.summary.contactPhone ?? '—' }} · {{ d.summary.contactEmail }}
                            <!-- Portal talebi kayıtlı müşteriden gelir: kartı yeni sekmede açılır, talep penceresi kaybolmaz. -->
                            @if (d.summary.clientId) {
                                <a class="block font-medium" [routerLink]="['/panel/clients', d.summary.clientId]" target="_blank" data-testid="request-client-link"
                                    ><i class="pi pi-user mr-1" aria-hidden="true"></i>Müşteri kartı: {{ d.summary.clientName ?? d.summary.contactName }} <i class="pi pi-external-link text-xs" aria-hidden="true"></i
                                ></a>
                            } @else {
                                <span class="block text-muted-color">Kayıtlı müşteri değil; onaylarken eşleştirilir ya da yeni müşteri açılır.</span>
                            }
                        </dd>
                        <dt class="col-span-4 text-muted-color">Hayvan</dt>
                        <dd class="col-span-8 m-0">
                            {{ d.summary.petName ?? '—' }}
                            @if (d.summary.petId) {
                                <a class="block font-medium" [routerLink]="['/panel/pets', d.summary.petId]" target="_blank" data-testid="request-pet-link"
                                    ><i class="pi pi-heart mr-1" aria-hidden="true"></i>Hasta kartı <i class="pi pi-external-link text-xs" aria-hidden="true"></i
                                ></a>
                            } @else {
                                <span class="text-muted-color">({{ petExtra(d) }}kayıtlı değil)</span>
                            }
                        </dd>
                        @if (d.ownerNote) {
                            <dt class="col-span-4 text-muted-color">Sahip notu</dt>
                            <dd class="col-span-8 m-0 whitespace-pre-wrap">{{ d.ownerNote }}</dd>
                        }
                        @if (d.approvedStartUtc) {
                            <dt class="col-span-4 text-muted-color">Onaylanan saat</dt>
                            <dd class="col-span-8 m-0">{{ fmt(d.approvedStartUtc) }} @if (d.wasRescheduled) {<span class="text-amber-700 dark:text-amber-300">(saat değiştirildi)</span>}</dd>
                        }
                        @if (d.rejectionReason) {
                            <dt class="col-span-4 text-muted-color">Red gerekçesi</dt>
                            <dd class="col-span-8 m-0">{{ d.rejectionReason }}</dd>
                        }
                    </dl>

                    @if (isPending() && !d.requestedSlotFree) {
                        <p-message severity="warn" class="w-full">İstenen saat şu an dolu görünüyor; onaylarken farklı saat seçin.</p-message>
                    }

                    @if (actionError()) {
                        <p-message severity="error" class="w-full" role="alert">{{ actionError() }}</p-message>
                    }

                    @if (mode() === 'approve') {
                        <section class="flex flex-col gap-3 rounded-lg border border-surface-200 dark:border-surface-700 p-3" aria-label="Onay">
                            <h6 class="m-0">Müşteri ve hayvan</h6>
                            @if (d.summary.clientId) {
                                <p class="m-0 text-sm">Müşteri: <span class="font-medium">{{ d.summary.clientName ?? 'Portal müşterisi' }}</span> (portal bağı)</p>
                            } @else if (!registering()) {
                                @if (d.clientMatches.length > 0) {
                                    <div class="flex flex-col gap-2">
                                        <span class="text-sm text-muted-color">Aynı e-posta ya da telefonla kayıtlı müşteri:</span>
                                        @for (m of d.clientMatches; track m.clientId) {
                                            <div class="flex items-center gap-2">
                                                <p-radiobutton [inputId]="'match-' + m.clientId" name="clientMatch" [value]="m.clientId" [ngModel]="clientId()" (ngModelChange)="selectClient($event)" />
                                                <label [for]="'match-' + m.clientId" class="text-sm">{{ m.fullName }} · {{ m.phone ?? '—' }}</label>
                                            </div>
                                        }
                                    </div>
                                }
                                <div class="flex flex-col gap-1">
                                    <label for="approveClient" class="text-sm text-muted-color">Başka müşteri ara</label>
                                    <app-client-search inputId="approveClient" [ngModel]="clientId()" (ngModelChange)="selectClient($event)" />
                                </div>
                            }
                            @if (d.summary.petId) {
                                <p class="m-0 text-sm">Hayvan: <span class="font-medium">{{ d.summary.petName }}</span></p>
                            } @else if (!registering()) {
                                <div class="flex flex-col gap-1">
                                    <label for="approvePet" class="text-sm text-muted-color">Hayvan</label>
                                    <app-pet-search inputId="approvePet" [clientId]="clientId() ?? ''" [ngModel]="petId()" (ngModelChange)="petId.set($event || null)" />
                                </div>
                                <div>
                                    <button pButton type="button" class="p-button-text p-0" (click)="registering.set(true)"><i class="pi pi-user-plus"></i>{{ clientId() ? 'Bu müşteriye yeni hasta ekle' : 'Yeni müşteri ve hasta ekle' }}</button>
                                </div>
                            }
                            @if (registering()) {
                                <app-visit-quick-registration [searchTerm]="d.summary.contactPhone ?? d.summary.contactName" [existingOwner]="registrationOwner()" (registered)="onRegistered($event)" (cancelled)="registering.set(false)" />
                            }

                            <h6 class="m-0 mt-2">Saat ve hekim</h6>
                            <div class="flex flex-wrap items-center gap-3">
                                <div class="flex items-center gap-2">
                                    <p-radiobutton inputId="timeRequested" name="timeChoice" value="requested" [ngModel]="timeChoice()" (ngModelChange)="setTimeChoice($event)" />
                                    <label for="timeRequested" class="text-sm">İstenen saat ({{ fmt(d.summary.requestedStartUtc) }})</label>
                                </div>
                                <div class="flex items-center gap-2">
                                    <p-radiobutton inputId="timeOther" name="timeChoice" value="other" [ngModel]="timeChoice()" (ngModelChange)="setTimeChoice($event)" />
                                    <label for="timeOther" class="text-sm">Farklı saat (yeniden planla)</label>
                                </div>
                            </div>
                            @if (timeChoice() === 'other') {
                                <div class="flex flex-col gap-2">
                                    <div class="flex items-center gap-2">
                                        <label for="slotDay" class="text-sm text-muted-color">Gün</label>
                                        <input id="slotDay" pInputText type="date" [ngModel]="slotDay()" (ngModelChange)="loadSlots($event)" />
                                    </div>
                                    @if (slotsLoading()) {
                                        <small class="text-muted-color">Müsait saatler yükleniyor…</small>
                                    } @else if (slotsForDay().length === 0) {
                                        <small class="text-muted-color">Bu gün müsait saat yok.</small>
                                    } @else {
                                        <div class="flex flex-wrap gap-2" role="listbox" aria-label="Müsait saatler">
                                            @for (s of slotsForDay(); track s.startUtc) {
                                                <button pButton type="button" size="small" [outlined]="otherStartUtc() !== s.startUtc" (click)="pickSlot(s.startUtc, s.freeVeterinarianUserIds)">{{ time(s.startUtc) }}</button>
                                            }
                                        </div>
                                    }
                                </div>
                            }
                            <div class="flex flex-col gap-1">
                                <label for="approveVet" class="text-sm text-muted-color">Hekim</label>
                                <p-select inputId="approveVet" [options]="vetOptions()" optionLabel="label" optionValue="value" [ngModel]="vetId()" (ngModelChange)="vetId.set($event)" class="w-full md:max-w-sm" />
                            </div>

                            <ng-container [ngTemplateOutlet]="emailEditor" />

                            <div class="flex flex-wrap justify-end gap-2">
                                <button pButton type="button" severity="secondary" [disabled]="submitting()" (click)="mode.set('view')">Vazgeç</button>
                                <button pButton type="button" [disabled]="!canApprove() || submitting()" (click)="approve()" data-testid="approve-submit"><i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>Onayla ve randevu oluştur</button>
                            </div>
                        </section>
                    }

                    @if (mode() === 'reject') {
                        <section class="flex flex-col gap-3 rounded-lg border border-surface-200 dark:border-surface-700 p-3" aria-label="Red">
                            <div class="flex flex-col gap-1">
                                <label for="rejectReason" class="text-sm text-muted-color">Red gerekçesi * (sahibe gider)</label>
                                <textarea id="rejectReason" pTextarea rows="3" [maxlength]="rejectMax" [ngModel]="rejectReason()" (ngModelChange)="rejectReason.set($event)" class="w-full"></textarea>
                            </div>
                            <ng-container [ngTemplateOutlet]="emailEditor" />
                            <div class="flex flex-wrap justify-end gap-2">
                                <button pButton type="button" severity="secondary" [disabled]="submitting()" (click)="mode.set('view')">Vazgeç</button>
                                <button pButton type="button" severity="danger" [disabled]="!canReject() || submitting()" (click)="reject()" data-testid="reject-submit">Reddet</button>
                            </div>
                        </section>
                    }

                    <ng-template #emailEditor>
                        <div class="flex flex-col gap-2">
                            <div class="flex items-center gap-2">
                                <button pButton type="button" class="p-button-text p-0" (click)="toggleEmailEdit()"><i class="pi pi-envelope"></i>{{ emailEditing() ? 'Şablonu kullan' : 'E-postayı gör ve düzenle' }}</button>
                            </div>
                            @if (emailEditing()) {
                                <input pInputText aria-label="E-posta konusu" [ngModel]="emailSubject()" (ngModelChange)="emailSubject.set($event)" class="w-full" />
                                <textarea pTextarea rows="7" aria-label="E-posta metni" [ngModel]="emailBody()" (ngModelChange)="emailBody.set($event)" class="w-full text-sm"></textarea>
                            }
                        </div>
                    </ng-template>

                    @if (mode() === 'view' && isPending() && canDecide()) {
                        <div class="flex flex-wrap justify-end gap-2">
                            <button pButton type="button" severity="danger" [outlined]="true" (click)="startReject()" data-testid="reject-start">Reddet</button>
                            <button pButton type="button" (click)="startApprove()" data-testid="approve-start"><i class="pi pi-check"></i>Onayla</button>
                        </div>
                    }

                    <details class="text-sm">
                        <summary class="cursor-pointer text-muted-color">Geçmiş ({{ d.history.length }})</summary>
                        <ul class="list-none p-0 m-0 mt-2 flex flex-col gap-1">
                            @for (h of d.history; track $index) {
                                <li>{{ fmt(h.atUtc) }} · {{ statusLabel(h.toStatus) }} · {{ actor(h.actorKind, h.actorName) }} @if (h.note) {— {{ h.note }}}</li>
                            }
                        </ul>
                    </details>
                </div>
            }
        </p-dialog>
    `
})
export class AppointmentRequestDetailDialogComponent {
    readonly rejectMax = REJECTION_REASON_MAX;

    readonly requestId = input<string | null>(null);
    readonly canDecide = input(false);
    readonly closed = output<boolean>();

    private readonly requests = inject(AppointmentRequestsService);
    private readonly booking = inject(OnlineBookingService);
    private readonly visits = inject(VisitsService);

    readonly visible = signal(false);
    readonly loading = signal(false);
    readonly loadError = signal<string | null>(null);
    readonly detail = signal<AppointmentRequestDetailVm | null>(null);
    readonly mode = signal<Mode>('view');
    readonly actionError = signal<string | null>(null);
    readonly submitting = signal(false);
    private changed = false;

    readonly clientId = signal<string | null>(null);
    readonly clientName = signal<string | null>(null);
    readonly petId = signal<string | null>(null);
    readonly registering = signal(false);
    readonly timeChoice = signal<'requested' | 'other'>('requested');
    readonly slotDay = signal('');
    readonly days = signal<StaffAvailabilityDayVm[]>([]);
    readonly slotsLoading = signal(false);
    readonly otherStartUtc = signal<string | null>(null);
    readonly veterinarians = signal<VeterinarianVm[]>([]);
    readonly suggestedVetIds = signal<string[]>([]);
    readonly vetId = signal<string | null>(null);
    readonly rejectReason = signal('');
    readonly emailEditing = signal(false);
    readonly emailSubject = signal('');
    readonly emailBody = signal('');

    readonly isPending = computed(() => this.detail()?.summary.status === AppointmentRequestStatus.Pending);
    readonly registrationOwner = computed(() => (this.clientId() ? { id: this.clientId()!, name: this.clientName() ?? 'Seçilen müşteri' } : null));
    readonly slotsForDay = computed(() => this.days().find((d) => d.date === this.slotDay())?.slots ?? []);
    readonly vetOptions = computed(() => {
        const suggested = new Set(this.suggestedVetIds());
        const vets = this.veterinarians().map((v) => ({ value: v.userId as string | null, label: suggested.has(v.userId) ? `${v.name} (boş)` : v.name }));

        return [{ value: null as string | null, label: 'Otomatik: o saatte boş uygun hekim' }, ...vets];
    });
    readonly scheduledAtUtc = computed(() => (this.timeChoice() === 'other' ? this.otherStartUtc() : null));
    readonly canApprove = computed(() => {
        const d = this.detail();

        return !!d && !!(d.summary.clientId ?? this.clientId()) && !!(d.summary.petId ?? this.petId()) && (this.timeChoice() === 'requested' || !!this.otherStartUtc());
    });
    readonly canReject = computed(() => this.rejectReason().trim().length >= REJECTION_REASON_MIN);

    constructor() {
        // Yalnız requestId izlenir: open() içindeki senkron akış (sahte servis, eşzamanlı of()) clientId/detail okur ve yazar; izlense
        // efekt kendini sonsuz tetikler (tarayıcı kilitlenir, spec VITEST_BROWSER_CONNECTION_CLOSED verir).
        effect(() => {
            const id = this.requestId();

            untracked(() => {
                if (id) {
                    this.open(id);
                } else {
                    this.visible.set(false);
                }
            });
        });
    }

    statusLabel = appointmentRequestStatusLabel;
    statusSeverity = appointmentRequestStatusSeverity;
    sourceLabel = appointmentRequestSourceLabel;
    actor = appointmentRequestActorLabel;
    fmt = (utc: string | null) => formatDateTimeDisplay(utc);
    time = (utc: string) => formatTimeDisplay(utc);

    onVisibleChange(visible: boolean): void {
        this.visible.set(visible);

        if (!visible) {
            this.closed.emit(this.changed);
        }
    }

    selectClient(id: string | null): void {
        const value = id || null;

        if (value !== this.clientId()) {
            this.clientId.set(value);
            this.clientName.set(this.detail()?.clientMatches.find((m) => m.clientId === value)?.fullName ?? null);
            this.petId.set(null);
        }
    }

    onRegistered(pet: PetSuggestion): void {
        this.registering.set(false);
        this.clientId.set(pet.clientId ?? this.clientId());
        this.clientName.set(pet.clientName);
        this.petId.set(pet.id);
    }

    startApprove(): void {
        const d = this.detail();

        this.mode.set('approve');
        this.actionError.set(null);
        this.emailEditing.set(false);
        this.suggestedVetIds.set(d?.freeVeterinarianUserIds ?? []);
        this.slotDay.set(toIstanbulDateInputValue(d?.summary.requestedStartUtc ?? null));

        if (d && this.veterinarians().length === 0) {
            this.visits.getVeterinarians(d.summary.clinicId).subscribe({ next: (v) => this.veterinarians.set(v), error: () => this.veterinarians.set([]) });
        }
    }

    startReject(): void {
        this.mode.set('reject');
        this.actionError.set(null);
        this.emailEditing.set(false);
    }

    setTimeChoice(choice: 'requested' | 'other'): void {
        this.timeChoice.set(choice);
        this.emailEditing.set(false);

        if (choice === 'other' && this.days().length === 0) {
            this.loadSlots(this.slotDay());
        }

        if (choice === 'requested') {
            this.otherStartUtc.set(null);
            this.suggestedVetIds.set(this.detail()?.freeVeterinarianUserIds ?? []);
        }
    }

    loadSlots(day: string): void {
        const d = this.detail();

        this.slotDay.set(day);

        if (!d || !day || this.days().some((x) => x.date === day)) {
            return;
        }

        this.slotsLoading.set(true);
        this.booking.availability(d.summary.clinicId, d.summary.reasonId, day, 7).subscribe({
            next: (days) => {
                this.days.update((existing) => [...existing.filter((x) => !days.some((n) => n.date === x.date)), ...days]);
                this.slotsLoading.set(false);
            },
            error: (e: unknown) => {
                this.slotsLoading.set(false);
                this.actionError.set(e instanceof Error ? e.message : 'Müsait saatler yüklenemedi.');
            }
        });
    }

    pickSlot(startUtc: string, freeVets: string[]): void {
        this.otherStartUtc.set(startUtc);
        this.suggestedVetIds.set(freeVets);
        this.emailEditing.set(false);
    }

    toggleEmailEdit(): void {
        const d = this.detail();

        if (this.emailEditing() || !d) {
            this.emailEditing.set(false);

            return;
        }

        const kind =
            this.mode() === 'reject'
                ? AppointmentRequestEmailKind.Rejected
                : this.scheduledAtUtc() && this.scheduledAtUtc() !== d.summary.requestedStartUtc
                  ? AppointmentRequestEmailKind.Rescheduled
                  : AppointmentRequestEmailKind.Approved;

        this.requests.previewEmail(d.summary.id, kind, this.scheduledAtUtc(), this.mode() === 'reject' ? this.rejectReason() : null).subscribe({
            next: (m) => {
                this.emailSubject.set(m.subject);
                this.emailBody.set(m.body);
                this.emailEditing.set(true);
            },
            error: (e: unknown) => this.actionError.set(e instanceof Error ? e.message : 'E-posta önizlemesi yüklenemedi.')
        });
    }

    approve(): void {
        const d = this.detail();

        if (!d || !this.canApprove() || this.submitting()) {
            return;
        }

        this.decide(
            this.requests.approve(d.summary.id, {
                clientId: d.summary.clientId ? null : this.clientId(),
                petId: d.summary.petId ? null : this.petId(),
                scheduledAtUtc: this.scheduledAtUtc(),
                veterinarianUserId: this.vetId(),
                email: this.editedEmail()
            })
        );
    }

    reject(): void {
        const d = this.detail();

        if (!d || !this.canReject() || this.submitting()) {
            return;
        }

        this.decide(this.requests.reject(d.summary.id, this.rejectReason(), this.editedEmail()));
    }

    petExtra(d: AppointmentRequestDetailVm): string {
        const parts = [d.petSpecies, d.petBreed].filter((x): x is string => !!x?.trim());

        return parts.length > 0 ? `${parts.join(', ')}; ` : '';
    }

    private decide(request: Observable<AppointmentRequestDetailVm>): void {
        this.submitting.set(true);
        this.actionError.set(null);
        request.subscribe({
            next: (updated) => {
                this.submitting.set(false);
                this.changed = true;
                this.detail.set(updated);
                this.mode.set('view');
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                this.actionError.set(e instanceof Error ? e.message : 'İşlem başarısız.');

                if (e instanceof OnlineBookingError && e.isStale) {
                    this.changed = true;
                    this.reloadDetail();
                }
            }
        });
    }

    private editedEmail(): EmailMessageVm | null {
        return this.emailEditing() && this.emailSubject().trim() && this.emailBody().trim() ? { subject: this.emailSubject(), body: this.emailBody() } : null;
    }

    private open(id: string): void {
        this.changed = false;
        this.visible.set(true);
        this.mode.set('view');
        this.actionError.set(null);
        this.clientId.set(null);
        this.clientName.set(null);
        this.petId.set(null);
        this.registering.set(false);
        this.timeChoice.set('requested');
        this.otherStartUtc.set(null);
        this.days.set([]);
        this.vetId.set(null);
        this.rejectReason.set('');
        this.emailEditing.set(false);
        this.reloadDetail(id);
    }

    private reloadDetail(id = this.detail()?.summary.id ?? this.requestId()): void {
        if (!id) {
            return;
        }

        this.loading.set(true);
        this.loadError.set(null);
        this.requests.get(id).subscribe({
            next: (d) => {
                this.detail.set(d);
                this.loading.set(false);

                if (d.clientMatches.length === 1 && !d.summary.clientId) {
                    this.selectClient(d.clientMatches[0].clientId);
                }
            },
            error: (e: unknown) => {
                this.loading.set(false);
                this.loadError.set(e instanceof Error ? e.message : 'Talep yüklenemedi.');
            }
        });
    }
}
