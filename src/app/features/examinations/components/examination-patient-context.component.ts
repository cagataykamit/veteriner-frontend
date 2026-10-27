import { Component, computed, effect, inject, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Observable } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { EXAMINATIONS_READ_CLAIM, TREATMENTS_READ_CLAIM, VACCINATIONS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { ExaminationListItemVm } from '@/app/entities/examination/models/examination-vm.model';
import { contextWeight } from '@/app/features/examinations/utils/examination-patient-context.utils';
import type { PetSummaryVm } from '@/app/entities/pet/models/pet-summary-vm.model';
import { PetsService } from '@/app/entities/pet/services/pets.service';
import type { TreatmentListItemVm } from '@/app/features/treatments/models/treatment-vm.model';
import { TreatmentsService } from '@/app/features/treatments/services/treatments.service';
import type { VaccinationListItemVm } from '@/app/features/vaccinations/models/vaccination-vm.model';
import { VaccinationsService } from '@/app/features/vaccinations/services/vaccinations.service';
import { DetailRelatedSummariesService } from '@/app/features/patients/services/detail-related-summaries.service';
import { TrDatePipe } from '@/app/shared/pipes/tr-date.pipe';

/** Bölüm yükleme durumu; `null` = bölüm bu kullanıcıya gösterilmez (okuma izni yok). */
type Section<T> = { state: 'loading' } | { state: 'ok'; data: T } | { state: 'error' } | null;

const OVERDUE_LIMIT = 3;
const RECENT_EXAM_LIMIT = 3;
const TREATMENT_FETCH_SIZE = 20;

interface OverdueVaccinations {
    items: VaccinationListItemVm[];
    total: number;
}

/**
 * Muayene çalışma alanında hasta bağlamı (ADR-020 karar 4): kilo, gecikmiş aşı, aktif tedavi/yatış, son muayeneler.
 * Sayfa değiştirmeden okunur; her bölüm kendi ucundan bağımsız yüklenir, biri hata verirse diğerleri görünür.
 * Dar ekranda başlıktan açılıp kapanır (varsayılan kapalı), geniş ekranda hep açıktır.
 */
@Component({
    selector: 'app-examination-patient-context',
    standalone: true,
    imports: [RouterLink, TrDatePipe],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <section class="card mb-0 p-4" aria-label="Hasta bağlamı" data-testid="patient-context">
            <button
                type="button"
                class="w-full flex items-center justify-between gap-2 bg-transparent border-0 p-0 text-left cursor-pointer xl:cursor-default text-color"
                [attr.aria-expanded]="expanded()"
                data-testid="patient-context-toggle"
                (click)="expanded.set(!expanded())"
            >
                <h5 class="m-0">Hasta bağlamı</h5>
                <i class="pi xl:hidden text-muted-color" [class.pi-chevron-down]="!expanded()" [class.pi-chevron-up]="expanded()" aria-hidden="true"></i>
            </button>

            <dl class="m-0 mt-3 xl:block space-y-3 text-sm" [class.hidden]="!expanded()" data-testid="patient-context-body">
                <div data-testid="ctx-weight">
                    <dt class="text-muted-color">Kilo</dt>
                    <dd class="m-0">
                        @switch (summary()?.state) {
                            @case ('ok') {
                                @if (weight(); as w) {
                                    <span class="font-medium">{{ w.weightKg }} kg</span>
                                    <span class="text-muted-color">
                                        @if (w.source === 'examination') {
                                            · {{ w.measuredAtUtc | trDate }}
                                        } @else {
                                            · profil kaydı
                                        }
                                    </span>
                                } @else {
                                    <span class="text-muted-color">Kayıt yok</span>
                                }
                            }
                            @case ('error') {
                                <span class="text-orange-600 dark:text-orange-400">Alınamadı</span>
                            }
                            @default {
                                <span class="text-muted-color">…</span>
                            }
                        }
                    </dd>
                </div>

                @if (overdue(); as s) {
                    <div data-testid="ctx-overdue">
                        <dt class="text-muted-color">Gecikmiş aşı</dt>
                        <dd class="m-0">
                            @switch (s.state) {
                                @case ('ok') {
                                    @if (overdueData(); as o) {
                                        @if (o.total === 0) {
                                            <span class="text-muted-color">Yok</span>
                                        } @else {
                                            <ul class="list-none m-0 p-0">
                                                @for (v of o.items; track v.id) {
                                                    <li class="text-orange-700 dark:text-orange-300" data-testid="ctx-overdue-item">
                                                        <a [routerLink]="['/panel/vaccinations', v.id]" class="text-inherit no-underline font-medium">{{ v.vaccineName }}</a>
                                                        · {{ v.dueAtUtc | trDate }}
                                                    </li>
                                                }
                                            </ul>
                                            @if (o.total > o.items.length) {
                                                <a [routerLink]="['/panel/pets', petId()]" class="text-primary no-underline">+{{ o.total - o.items.length }} daha (hasta kartı)</a>
                                            }
                                        }
                                    }
                                }
                                @case ('error') {
                                    <span class="text-orange-600 dark:text-orange-400">Alınamadı</span>
                                }
                                @default {
                                    <span class="text-muted-color">…</span>
                                }
                            }
                        </dd>
                    </div>
                }

                <div data-testid="ctx-active">
                    <dt class="text-muted-color">Aktif tedavi / yatış</dt>
                    <dd class="m-0">
                        @if (activeHospitalization(); as h) {
                            <a [routerLink]="['/panel/hospitalizations', h.id]" class="text-primary no-underline font-medium block" data-testid="ctx-hospitalization"> Yatışta: {{ h.reason ?? 'Yatış' }} </a>
                        }
                        @if (treatments(); as s) {
                            @switch (s.state) {
                                @case ('ok') {
                                    @for (t of activeTreatments(); track t.id) {
                                        <a [routerLink]="['/panel/treatments', t.id]" class="text-primary no-underline block" data-testid="ctx-treatment">
                                            {{ t.title }} <span class="text-muted-color">· takip {{ t.followUpDateUtc | trDate }}</span>
                                        </a>
                                    }
                                }
                                @case ('error') {
                                    <span class="text-orange-600 dark:text-orange-400 block">Tedaviler alınamadı</span>
                                }
                            }
                        }
                        @if (noActiveCare()) {
                            <span class="text-muted-color">Yok</span>
                        }
                    </dd>
                </div>

                @if (recentExams(); as s) {
                    <div data-testid="ctx-recent-exams">
                        <dt class="flex items-baseline justify-between gap-2">
                            <span class="text-muted-color">Son muayeneler</span>
                            <a routerLink="/panel/examinations" [queryParams]="{ petId: petId() }" class="text-primary no-underline">Tümü →</a>
                        </dt>
                        <dd class="m-0">
                            @switch (s.state) {
                                @case ('ok') {
                                    @if (recentExamItems().length === 0) {
                                        <span class="text-muted-color">Önceki muayene yok</span>
                                    } @else {
                                        <ul class="list-none m-0 p-0 space-y-1">
                                            @for (e of recentExamItems(); track e.id) {
                                                <li data-testid="ctx-recent-exam">
                                                    <a [routerLink]="['/panel/examinations', e.id]" class="text-primary no-underline">{{ e.examinedAtUtc | trDate }}</a>
                                                    <span class="block break-words">{{ e.visitReason }}</span>
                                                </li>
                                            }
                                        </ul>
                                    }
                                }
                                @case ('error') {
                                    <span class="text-orange-600 dark:text-orange-400">Alınamadı</span>
                                }
                                @default {
                                    <span class="text-muted-color">…</span>
                                }
                            }
                        </dd>
                    </div>
                }
            </dl>
        </section>
    `
})
export class ExaminationPatientContextComponent {
    private readonly petsService = inject(PetsService);
    private readonly vaccinationsService = inject(VaccinationsService);
    private readonly treatmentsService = inject(TreatmentsService);
    private readonly related = inject(DetailRelatedSummariesService);
    private readonly auth = inject(AuthService);

    readonly petId = input<string | null>(null);
    /** Son muayeneler listesinden çıkarılacak açık muayene. */
    readonly excludeExaminationId = input<string | null>(null);

    /** Dar ekranda bölüm gövdesi; geniş ekranda CSS ile hep açık. */
    readonly expanded = signal(false);

    readonly summary = signal<Section<PetSummaryVm>>(null);
    readonly overdue = signal<Section<OverdueVaccinations>>(null);
    readonly treatments = signal<Section<TreatmentListItemVm[]>>(null);
    readonly recentExams = signal<Section<ExaminationListItemVm[]>>(null);

    private readonly canReadVaccinations = this.auth.hasOperationClaim(VACCINATIONS_READ_CLAIM);
    private readonly canReadTreatments = this.auth.hasOperationClaim(TREATMENTS_READ_CLAIM);
    private readonly canReadExaminations = this.auth.hasOperationClaim(EXAMINATIONS_READ_CLAIM);
    private seq = 0;

    readonly weight = computed(() => contextWeight(okData(this.summary())));
    readonly activeHospitalization = computed(() => okData(this.summary())?.activeHospitalization.data ?? null);
    readonly overdueData = computed(() => okData(this.overdue()));
    /** Aktif tedavi kuralı (ADR-025) sunucudadır (`active=true`, en yakın takip önce); burada süzülmez. */
    readonly activeTreatments = computed(() => okData(this.treatments()) ?? []);
    readonly recentExamItems = computed(() => (okData(this.recentExams()) ?? []).slice(0, RECENT_EXAM_LIMIT));
    readonly noActiveCare = computed(() => !this.activeHospitalization() && this.treatments()?.state !== 'error' && this.activeTreatments().length === 0 && this.summary()?.state !== 'loading');

    constructor() {
        effect(() => {
            const petId = this.petId()?.trim() ?? '';
            const excludeId = this.excludeExaminationId()?.trim() ?? '';
            const seq = ++this.seq;

            this.summary.set(null);
            this.overdue.set(null);
            this.treatments.set(null);
            this.recentExams.set(null);

            if (!petId) {
                return;
            }

            this.load(seq, this.summary, this.petsService.getPetSummary(petId));

            if (this.canReadVaccinations) {
                this.load(seq, this.overdue, this.vaccinationsService.getVaccinations({ petId, onlyOverdue: true, page: 1, pageSize: OVERDUE_LIMIT }), (r) => ({ items: r.items, total: r.totalItems }));
            }

            if (this.canReadTreatments) {
                this.load(seq, this.treatments, this.treatmentsService.getTreatments({ petId, active: true, page: 1, pageSize: TREATMENT_FETCH_SIZE }), (r) => r.items);
            }

            if (this.canReadExaminations) {
                this.load(seq, this.recentExams, this.related.loadSiblingExaminationsForPet(petId, excludeId));
            }
        });
    }

    private load<R, T = R>(seq: number, target: { set(v: Section<T>): void }, source: Observable<R>, project: (r: R) => T = (r) => r as unknown as T): void {
        target.set({ state: 'loading' });
        source.subscribe({
            next: (r) => {
                if (seq === this.seq) {
                    target.set({ state: 'ok', data: project(r) });
                }
            },
            error: () => {
                if (seq === this.seq) {
                    target.set({ state: 'error' });
                }
            }
        });
    }
}

function okData<T>(s: Section<T>): T | null {
    return s?.state === 'ok' ? s.data : null;
}
