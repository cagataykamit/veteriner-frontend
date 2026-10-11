import { NgTemplateOutlet } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { PetSummaryVm } from '@/app/features/pets/models/pet-summary-vm.model';
import { careStatusLabel } from '@/app/features/visits/utils/visit-status.utils';
import type { VisitCareStatus } from '@/app/features/visits/models/visit-vm.model';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { formatUtcIsoAsLocalDateDisplay, formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';

const KNOWN_CARE_STATUSES: ReadonlySet<string> = new Set(['Waiting', 'InProgress', 'Completed']);

/**
 * Hasta özet kartı (`GET /pets/{id}/summary`). Her bölüm kendi durumunu gösterir:
 * "kayıt yok" (Empty), "yetki yok" (Forbidden) ve "veri alınamadı" (Unavailable) birbirinden ayrıdır.
 */
@Component({
    selector: 'app-pet-summary-card',
    standalone: true,
    imports: [NgTemplateOutlet, RouterLink, ButtonModule, AppLoadingStateComponent],
    template: `
        <ng-template #notOk let-state let-label="label">
            @switch (state) {
                @case ('Empty') {
                    <p class="m-0 text-muted-color" data-testid="state-empty">Kayıt yok</p>
                }
                @case ('Forbidden') {
                    <p class="m-0 text-muted-color" data-testid="state-forbidden">
                        <i class="pi pi-lock mr-1" aria-hidden="true"></i>Bu bilgiyi görme yetkiniz yok
                    </p>
                }
                @default {
                    <p class="m-0 text-orange-600 dark:text-orange-400" data-testid="state-unavailable">
                        <i class="pi pi-exclamation-triangle mr-1" aria-hidden="true"></i>{{ label }} alınamadı
                    </p>
                }
            }
        </ng-template>

        <div class="card mb-4" role="region" aria-label="Hasta özeti">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h5 class="mt-0 mb-0">Hasta özeti</h5>
                <a [routerLink]="['/panel/pets', petId(), 'timeline']" class="text-primary font-medium no-underline text-sm">Zaman çizelgesi →</a>
            </div>

            @if (loading()) {
                <app-loading-state message="Hasta özeti yükleniyor…" />
            } @else if (error()) {
                <div class="flex flex-wrap items-center gap-3" data-testid="summary-error">
                    <p class="m-0 text-orange-600 dark:text-orange-400">
                        <i class="pi pi-exclamation-triangle mr-1" aria-hidden="true"></i>{{ error() }}
                    </p>
                    <button pButton type="button" size="small" label="Tekrar dene" icon="pi pi-refresh" class="p-button-secondary" (click)="retry.emit()"></button>
                </div>
            } @else if (summary(); as s) {
                <dl class="m-0 grid grid-cols-12 gap-x-4 gap-y-4">
                    <div class="col-span-12 md:col-span-6 lg:col-span-4" data-testid="section-hospitalization">
                        <dt class="text-muted-color text-sm mb-1">Aktif yatış</dt>
                        <dd class="m-0">
                            @if (s.activeHospitalization.data; as h) {
                                <a [routerLink]="['/panel/hospitalizations', h.id]" class="text-primary font-medium no-underline">
                                    {{ h.reason ?? 'Yatış' }}
                                </a>
                                <div class="text-muted-color text-sm">
                                    Yatış: {{ formatDt(h.admittedAtUtc) }}
                                    @if (h.plannedDischargeAtUtc) {
                                        · Planlanan çıkış: {{ formatDt(h.plannedDischargeAtUtc) }}
                                    }
                                </div>
                                @if (h.clinicName) {
                                    <div class="text-muted-color text-sm">{{ h.clinicName }}</div>
                                }
                            } @else if (s.activeHospitalization.state === 'Empty') {
                                <p class="m-0 text-muted-color" data-testid="state-empty">Aktif yatış yok</p>
                            } @else {
                                <ng-container *ngTemplateOutlet="notOk; context: { $implicit: s.activeHospitalization.state, label: 'Yatış bilgisi' }" />
                            }
                        </dd>
                    </div>

                    <div class="col-span-12 md:col-span-6 lg:col-span-4" data-testid="section-vaccinations">
                        <dt class="text-muted-color text-sm mb-1">Aşılar</dt>
                        <dd class="m-0">
                            @if (s.vaccinations.data; as v) {
                                <div>
                                    Son uygulanan:
                                    @if (v.lastApplied; as a) {
                                        <a [routerLink]="['/panel/vaccinations', a.id]" class="text-primary font-medium no-underline">{{ a.vaccineName }}</a>
                                        <span class="text-muted-color text-sm"> · {{ formatDate(a.appliedAtUtc) }}</span>
                                    } @else {
                                        <span class="text-muted-color">yok</span>
                                    }
                                </div>
                                <div>
                                    Sıradaki:
                                    @if (v.nextDue; as d) {
                                        <a [routerLink]="['/panel/vaccinations', d.id]" class="text-primary font-medium no-underline">{{ d.vaccineName }}</a>
                                        <span class="text-muted-color text-sm"> · {{ formatDate(d.dueAtUtc) }}</span>
                                        @if (d.isOverdue) {
                                            <span class="text-red-600 dark:text-red-400 font-medium text-sm" data-testid="vaccine-overdue"> · Gecikmiş</span>
                                        }
                                    } @else {
                                        <span class="text-muted-color">planlanmış aşı yok</span>
                                    }
                                </div>
                            } @else if (s.vaccinations.state === 'Empty') {
                                <p class="m-0 text-muted-color" data-testid="state-empty">Aşı kaydı yok</p>
                            } @else {
                                <ng-container *ngTemplateOutlet="notOk; context: { $implicit: s.vaccinations.state, label: 'Aşı bilgisi' }" />
                            }
                        </dd>
                    </div>

                    <div class="col-span-12 md:col-span-6 lg:col-span-4" data-testid="section-weight">
                        <dt class="text-muted-color text-sm mb-1">Son kilo (muayeneden)</dt>
                        <dd class="m-0">
                            @if (s.latestWeight.data; as w) {
                                <span class="font-medium">{{ w.weightKg }} kg</span>
                                <span class="text-muted-color text-sm"> · {{ formatDt(w.measuredAtUtc) }}</span>
                                @if (w.examinationId) {
                                    <a [routerLink]="['/panel/examinations', w.examinationId]" class="text-primary no-underline text-sm ml-2">Muayene →</a>
                                }
                            } @else if (s.latestWeight.state === 'Empty') {
                                <p class="m-0 text-muted-color" data-testid="state-empty">Muayenede kilo ölçülmemiş</p>
                            } @else {
                                <ng-container *ngTemplateOutlet="notOk; context: { $implicit: s.latestWeight.state, label: 'Kilo bilgisi' }" />
                            }
                            @if (s.profileWeightKg !== null) {
                                <div class="text-muted-color text-sm" data-testid="profile-weight">Profil kilosu: {{ s.profileWeightKg }} kg (tarihsiz)</div>
                            }
                        </dd>
                    </div>

                    <div class="col-span-12 md:col-span-6 lg:col-span-4" data-testid="section-visit">
                        <dt class="text-muted-color text-sm mb-1">Son geliş</dt>
                        <dd class="m-0">
                            @if (s.lastVisit.data; as v) {
                                <span class="font-medium">{{ formatDt(v.arrivedAtUtc) }}</span>
                                @if (careLabel(v.careStatus); as label) {
                                    <span class="text-muted-color text-sm"> · {{ label }}</span>
                                }
                                @if (v.clinicName) {
                                    <div class="text-muted-color text-sm">{{ v.clinicName }}</div>
                                }
                            } @else if (s.lastVisit.state === 'Empty') {
                                <p class="m-0 text-muted-color" data-testid="state-empty">Geliş kaydı yok</p>
                            } @else {
                                <ng-container *ngTemplateOutlet="notOk; context: { $implicit: s.lastVisit.state, label: 'Geliş bilgisi' }" />
                            }
                        </dd>
                    </div>

                    <div class="col-span-12 md:col-span-6 lg:col-span-4" data-testid="section-examination">
                        <dt class="text-muted-color text-sm mb-1">Son muayene</dt>
                        <dd class="m-0">
                            @if (s.lastExamination.data; as e) {
                                <a [routerLink]="['/panel/examinations', e.id]" class="text-primary font-medium no-underline">{{ e.visitReason ?? 'Muayene' }}</a>
                                <div class="text-muted-color text-sm">{{ formatDt(e.examinedAtUtc) }}</div>
                                @if (e.clinicName) {
                                    <div class="text-muted-color text-sm">{{ e.clinicName }}</div>
                                }
                            } @else if (s.lastExamination.state === 'Empty') {
                                <p class="m-0 text-muted-color" data-testid="state-empty">Muayene kaydı yok</p>
                            } @else {
                                <ng-container *ngTemplateOutlet="notOk; context: { $implicit: s.lastExamination.state, label: 'Muayene bilgisi' }" />
                            }
                        </dd>
                    </div>
                </dl>
            }
        </div>
    `
})
export class PetSummaryCardComponent {
    readonly petId = input.required<string>();
    readonly summary = input<PetSummaryVm | null>(null);
    readonly loading = input(false);
    /** Özet ucunun tamamı başarısız olduysa mesaj (bölüm bazlı `Unavailable` ayrıdır). */
    readonly error = input<string | null>(null);
    readonly retry = output<void>();

    readonly formatDt = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);
    readonly formatDate = (v: string | null) => formatUtcIsoAsLocalDateDisplay(v);

    careLabel(status: string | null): string | null {
        return status && KNOWN_CARE_STATUSES.has(status) ? careStatusLabel(status as VisitCareStatus) : null;
    }
}

