import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, output, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { ExaminationDetailVm } from '@/app/entities/examination/models/examination-vm.model';
import type { PetSummaryVm } from '@/app/entities/pet/models/pet-summary-vm.model';
import { examinationAssessmentText, examinationVitalsLine, type PetCardSection } from '@/app/entities/patient/utils/pet-card.utils';
import type { TreatmentListItemVm } from '@/app/entities/treatment/models/treatment-vm.model';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { TrDatePipe, TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';

/** Kartta gösterilen takipli tedavi sayısı. */
const FOLLOW_UP_LIMIT = 3;

/**
 * Klinik özet (ADR-020 karar 2d): kilo, vital, son tanı/değerlendirme, aktif yatış ve takipli tedavi, aşı, son muayene.
 * Özet ucu (`GET /pets/{id}/summary`) bölüm bazlıdır: "kayıt yok" (Empty), "yetki yok" (Forbidden) ve "veri alınamadı" (Unavailable) ayrıdır.
 * Vital ve değerlendirme son muayenenin detayından, takipli tedavi tedavi listesinden gelir; veri yoksa değer uydurulmaz.
 */
@Component({
    selector: 'app-pet-summary-card',
    standalone: true,
    imports: [NgTemplateOutlet, RouterLink, ButtonModule, AppLoadingStateComponent, TrDatePipe, TrDateTimePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <ng-template #notOk let-state let-label="label">
            @switch (state) {
                @case ('Empty') {
                    <p class="m-0 text-muted-color" data-testid="state-empty">Kayıt yok</p>
                }
                @case ('Forbidden') {
                    <p class="m-0 text-muted-color" data-testid="state-forbidden"><i class="pi pi-lock mr-1" aria-hidden="true"></i>Bu bilgiyi görme yetkiniz yok</p>
                }
                @default {
                    <p class="m-0 text-orange-600 dark:text-orange-400" data-testid="state-unavailable"><i class="pi pi-exclamation-triangle mr-1" aria-hidden="true"></i>{{ label }} alınamadı</p>
                }
            }
        </ng-template>

        <section class="card mb-0 h-full" aria-labelledby="pet-clinical-summary-title">
            <h5 id="pet-clinical-summary-title" class="mt-0 mb-4">Klinik özet</h5>

            @if (loading()) {
                <app-loading-state message="Klinik özet yükleniyor…" />
            } @else if (error()) {
                <div class="flex flex-wrap items-center gap-3" data-testid="summary-error">
                    <p class="m-0 text-orange-600 dark:text-orange-400"><i class="pi pi-exclamation-triangle mr-1" aria-hidden="true"></i>{{ error() }}</p>
                    <button pButton type="button" size="small" class="p-button-secondary" (click)="retry.emit()"><i class="pi pi-refresh"></i>Tekrar dene</button>
                </div>
            } @else if (summary(); as s) {
                <dl class="m-0 grid grid-cols-12 gap-x-4 gap-y-4">
                    <div class="col-span-12 md:col-span-6" data-testid="section-weight">
                        <dt class="text-muted-color text-sm mb-1">Son kilo (muayeneden)</dt>
                        <dd class="m-0">
                            @if (s.latestWeight.data; as w) {
                                <span class="font-medium">{{ w.weightKg }} kg</span>
                                <span class="text-muted-color text-sm"> · {{ w.measuredAtUtc | trDateTime }}</span>
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

                    <div class="col-span-12 md:col-span-6" data-testid="section-vitals">
                        <dt class="text-muted-color text-sm mb-1">Vital (son muayene)</dt>
                        <dd class="m-0">
                            @if (s.lastExamination.state !== 'Ok') {
                                <ng-container *ngTemplateOutlet="notOk; context: { $implicit: s.lastExamination.state, label: 'Vital bilgisi' }" />
                            } @else {
                                @switch (lastExamination()?.state) {
                                    @case ('ok') {
                                        @if (vitals(); as v) {
                                            <span class="font-medium">{{ v }}</span>
                                        } @else {
                                            <p class="m-0 text-muted-color" data-testid="state-empty">Son muayenede vital ölçülmemiş</p>
                                        }
                                    }
                                    @case ('error') {
                                        <ng-container *ngTemplateOutlet="notOk; context: { $implicit: 'Unavailable', label: 'Vital bilgisi' }" />
                                    }
                                    @default {
                                        <span class="text-muted-color text-sm">Yükleniyor…</span>
                                    }
                                }
                            }
                        </dd>
                    </div>

                    <div class="col-span-12 md:col-span-6" data-testid="section-assessment">
                        <dt class="text-muted-color text-sm mb-1">Son tanı / değerlendirme</dt>
                        <dd class="m-0">
                            @if (s.lastExamination.state !== 'Ok') {
                                <ng-container *ngTemplateOutlet="notOk; context: { $implicit: s.lastExamination.state, label: 'Değerlendirme' }" />
                            } @else {
                                @switch (lastExamination()?.state) {
                                    @case ('ok') {
                                        @if (assessment(); as a) {
                                            <span class="whitespace-pre-wrap line-clamp-3">{{ a }}</span>
                                        } @else {
                                            <p class="m-0 text-muted-color" data-testid="state-empty">Son muayenede değerlendirme yazılmamış</p>
                                        }
                                    }
                                    @case ('error') {
                                        <ng-container *ngTemplateOutlet="notOk; context: { $implicit: 'Unavailable', label: 'Değerlendirme' }" />
                                    }
                                    @default {
                                        <span class="text-muted-color text-sm">Yükleniyor…</span>
                                    }
                                }
                            }
                        </dd>
                    </div>

                    <div class="col-span-12 md:col-span-6" data-testid="section-active-care">
                        <dt class="text-muted-color text-sm mb-1">Aktif yatış ve takipli tedavi</dt>
                        <dd class="m-0">
                            @if (s.activeHospitalization.data; as h) {
                                <div>
                                    <i class="pi pi-building text-sm mr-1" aria-hidden="true"></i>
                                    <a [routerLink]="['/panel/hospitalizations', h.id]" class="text-primary font-medium no-underline">{{ h.reason ?? 'Yatış' }}</a>
                                    <span class="text-muted-color text-sm"> · yatış {{ h.admittedAtUtc | trDateTime }}</span>
                                </div>
                            } @else if (s.activeHospitalization.state !== 'Empty') {
                                <ng-container *ngTemplateOutlet="notOk; context: { $implicit: s.activeHospitalization.state, label: 'Yatış bilgisi' }" />
                            }
                            @switch (followUps()?.state) {
                                @case ('ok') {
                                    @for (t of followUpRows(); track t.id) {
                                        <div data-testid="follow-up">
                                            <i class="pi pi-wrench text-sm mr-1" aria-hidden="true"></i>
                                            <a [routerLink]="['/panel/treatments', t.id]" class="text-primary no-underline">{{ t.title }}</a>
                                            <span class="text-muted-color text-sm"> · takip {{ t.followUpDateUtc | trDate }}</span>
                                        </div>
                                    }
                                }
                                @case ('error') {
                                    <ng-container *ngTemplateOutlet="notOk; context: { $implicit: 'Unavailable', label: 'Tedavi bilgisi' }" />
                                }
                                @case ('loading') {
                                    <span class="text-muted-color text-sm">Yükleniyor…</span>
                                }
                            }
                            @if (noActiveCare()) {
                                <p class="m-0 text-muted-color" data-testid="state-empty">Aktif yatış veya takip tarihi gelmemiş tedavi yok</p>
                            }
                        </dd>
                    </div>

                    <div class="col-span-12 md:col-span-6" data-testid="section-vaccinations">
                        <dt class="text-muted-color text-sm mb-1">Aşılar</dt>
                        <dd class="m-0">
                            @if (s.vaccinations.data; as v) {
                                <div>
                                    Son uygulanan:
                                    @if (v.lastApplied; as a) {
                                        <a [routerLink]="['/panel/vaccinations', a.id]" class="text-primary font-medium no-underline">{{ a.vaccineName }}</a>
                                        <span class="text-muted-color text-sm"> · {{ a.appliedAtUtc | trDate }}</span>
                                    } @else {
                                        <span class="text-muted-color">yok</span>
                                    }
                                </div>
                                <div>
                                    Sıradaki:
                                    @if (v.nextDue; as d) {
                                        <a [routerLink]="['/panel/vaccinations', d.id]" class="text-primary font-medium no-underline">{{ d.vaccineName }}</a>
                                        <span class="text-muted-color text-sm"> · {{ d.dueAtUtc | trDate }}</span>
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

                    <div class="col-span-12 md:col-span-6" data-testid="section-examination">
                        <dt class="text-muted-color text-sm mb-1">Son muayene</dt>
                        <dd class="m-0">
                            @if (s.lastExamination.data; as e) {
                                <a [routerLink]="['/panel/examinations', e.id]" class="text-primary font-medium no-underline">{{ e.visitReason ?? 'Muayene' }}</a>
                                <div class="text-muted-color text-sm">{{ e.examinedAtUtc | trDateTime }}</div>
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
        </section>
    `
})
export class PetSummaryCardComponent {
    readonly summary = input<PetSummaryVm | null>(null);
    readonly loading = input(false);
    /** Özet ucunun tamamı başarısız olduysa mesaj (bölüm bazlı `Unavailable` ayrıdır). */
    readonly error = input<string | null>(null);
    /** Son muayenenin detayı (vital, değerlendirme); `null` = muayene yok veya okuma yetkisi yok. */
    readonly lastExamination = input<PetCardSection<ExaminationDetailVm>>(null);
    /** Takip tarihi gelmemiş tedaviler (sıralı); `null` = tedavi okuma yetkisi yok. */
    readonly followUps = input<PetCardSection<TreatmentListItemVm[]>>(null);
    readonly retry = output<void>();

    private readonly exam = computed(() => {
        const e = this.lastExamination();

        return e?.state === 'ok' ? e.data : null;
    });
    readonly vitals = computed(() => {
        const e = this.exam();

        return e ? examinationVitalsLine(e) : null;
    });
    readonly assessment = computed(() => {
        const e = this.exam();

        return e ? examinationAssessmentText(e) : null;
    });
    readonly followUpRows = computed(() => {
        const f = this.followUps();

        return f?.state === 'ok' ? f.data.slice(0, FOLLOW_UP_LIMIT) : [];
    });
    readonly noActiveCare = computed(() => {
        const f = this.followUps();
        const hospitalization = this.summary()?.activeHospitalization.state;

        return hospitalization === 'Empty' && (f === null || (f.state === 'ok' && f.data.length === 0));
    });
}
