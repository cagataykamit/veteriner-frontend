import { Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink, convertToParamMap } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    HOSPITALIZATIONS_CREATE_CLAIM,
    LAB_RESULTS_CREATE_CLAIM,
    PRESCRIPTIONS_CREATE_CLAIM,
    TREATMENTS_CREATE_CLAIM,
    VACCINATIONS_CREATE_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import type { ExaminationDetailVm, ExaminationRelatedSummaryVm } from '@/app/features/examinations/models/examination-vm.model';
import {
    buildProcedureRows,
    PROCEDURE_KINDS,
    PROCEDURE_LABEL,
    PROCEDURE_ROUTE_SEGMENT,
    procedureAddState,
    type ProcedureKind
} from '@/app/features/examinations/utils/examination-procedures.utils';
import { HospitalizationFormComponent } from '@/app/features/hospitalizations/components/hospitalization-form.component';
import { LabResultFormComponent } from '@/app/features/lab-results/components/lab-result-form.component';
import { PrescriptionFormComponent } from '@/app/features/prescriptions/components/prescription-form.component';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { TreatmentFormComponent } from '@/app/features/treatments/components/treatment-form.component';
import { VaccinationFormComponent, type VaccinationSavedEvent } from '@/app/features/vaccinations/components/vaccination-form.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';

const CREATE_CLAIM: Record<ProcedureKind, string> = {
    treatment: TREATMENTS_CREATE_CLAIM,
    prescription: PRESCRIPTIONS_CREATE_CLAIM,
    vaccination: VACCINATIONS_CREATE_CLAIM,
    lab: LAB_RESULTS_CREATE_CLAIM,
    hospitalization: HOSPITALIZATIONS_CREATE_CLAIM
};

const ADD_ICON: Record<ProcedureKind, string> = {
    treatment: 'pi pi-plus',
    prescription: 'pi pi-file-edit',
    vaccination: 'pi pi-shield',
    lab: 'pi pi-chart-bar',
    hospitalization: 'pi pi-building'
};

/**
 * Ziyaret çalışma alanının "İşlemler" bölümü: muayeneye bağlı tedavi, reçete, aşı, lab istemi ve yatış tek listede.
 * "Ekle" yan panelde mevcut form bileşenini açar (müşteri, hayvan, muayene dolu ve kilitli); kayıttan sonra aynı
 * muayenede kalınır, liste `changed` ile yenilenir. Kilitli düğme nedenini görünür söyler (ADR-013).
 */
@Component({
    selector: 'app-examination-procedures-section',
    standalone: true,
    imports: [
        RouterLink,
        ButtonModule,
        DrawerModule,
        AppErrorStateComponent,
        AppStatusTagComponent,
        TreatmentFormComponent,
        PrescriptionFormComponent,
        VaccinationFormComponent,
        LabResultFormComponent,
        HospitalizationFormComponent
    ],
    template: `
        <div class="card" data-testid="procedures-section">
            <h4 class="mt-0 mb-4 text-xl font-semibold">İşlemler</h4>

            @if (canAddAny()) {
                <div class="flex flex-wrap items-center gap-2 mb-2" data-testid="procedure-add-bar">
                    <span class="text-sm text-muted-color">+ Ekle:</span>
                    @for (kind of visibleKinds(); track kind) {
                        <p-button
                            size="small"
                            severity="secondary"
                            [outlined]="true"
                            [label]="label(kind)"
                            [icon]="icon(kind)"
                            [disabled]="state(kind).disabled"
                            [attr.data-testid]="'procedure-add-' + kind"
                            (onClick)="open(kind)"
                        />
                    }
                </div>
                @for (reason of lockReasons(); track reason) {
                    <p class="text-sm text-muted-color mt-0 mb-1" role="note" data-testid="procedure-lock-reason">
                        <i class="pi pi-lock text-xs mr-1"></i>{{ reason }}
                    </p>
                }
                @for (note of addNotes(); track note) {
                    <p class="text-sm text-muted-color mt-0 mb-1" role="note">{{ note }}</p>
                }
            }

            @if (notice()) {
                <p class="text-sm mt-2 mb-0" [class.text-amber-700]="noticeIsWarning()" role="status" data-testid="procedure-notice">{{ notice() }}</p>
            }

            <div class="mt-4">
                @if (error()) {
                    <app-error-state [detail]="error()!" (retry)="retry.emit()" />
                } @else if (loading() && rows().length === 0) {
                    <p class="text-muted-color text-sm m-0">Yükleniyor…</p>
                } @else if (rows().length === 0) {
                    <p class="text-muted-color text-sm m-0" data-testid="procedure-empty">Gösterilecek işlem kaydı yok.</p>
                } @else {
                    <ul class="list-none m-0 p-0" data-testid="procedure-list">
                        @for (row of rows(); track row.kind + row.id) {
                            <li
                                class="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 border-b border-surface-200 dark:border-surface-700 last:border-b-0"
                                [class.opacity-60]="row.cancelled"
                                [attr.data-cancelled]="row.cancelled ? 'true' : null"
                            >
                                <app-status-tag [label]="label(row.kind)" severity="info" />
                                <span class="font-medium min-w-0 break-words flex-1" [class.line-through]="row.cancelled">{{ row.title }}</span>
                                @if (row.stateLabel) {
                                    <app-status-tag [label]="row.stateLabel" [severity]="row.cancelled ? 'secondary' : 'warn'" />
                                }
                                @if (row.detail) {
                                    <span class="text-sm text-muted-color">{{ row.detail }}</span>
                                }
                                <span class="text-sm text-muted-color">{{ formatDt(row.atUtc) }}</span>
                                <a [routerLink]="['/panel', routeSegment(row.kind), row.id]" class="text-primary font-medium no-underline text-sm">Detay →</a>
                            </li>
                        }
                    </ul>
                }
            </div>
        </div>

        <p-drawer [(visible)]="drawerVisible" position="right" [header]="drawerTitle()" [style]="{ width: 'min(44rem, 100vw)' }" [dismissible]="false">
            @if (activeKind(); as kind) {
                <p class="text-sm text-muted-color mt-0 mb-4" data-testid="procedure-drawer-context">
                    {{ exam().petName }} · {{ exam().clientName }} — müşteri, hasta ve muayene bu kayda otomatik bağlanır.
                </p>
                @switch (kind) {
                    @case ('treatment') {
                        <app-treatment-form [embedded]="true" [contextParams]="contextParams()" (saved)="onSaved(kind)" (cancelled)="close()" />
                    }
                    @case ('prescription') {
                        <app-prescription-form [embedded]="true" [contextParams]="contextParams()" (saved)="onSaved(kind)" (cancelled)="close()" />
                    }
                    @case ('vaccination') {
                        <app-vaccination-form [embedded]="true" [contextParams]="contextParams()" (saved)="onVaccinationSaved($event)" (cancelled)="close()" />
                    }
                    @case ('lab') {
                        <app-lab-result-form [embedded]="true" [contextParams]="contextParams()" (saved)="onSaved(kind)" (cancelled)="close()" />
                    }
                    @case ('hospitalization') {
                        <app-hospitalization-form [embedded]="true" [contextParams]="contextParams()" (saved)="onSaved(kind)" (cancelled)="close()" />
                    }
                }
            }
        </p-drawer>
    `
})
export class ExaminationProceduresSectionComponent {
    readonly exam = input.required<ExaminationDetailVm>();
    readonly summary = input<ExaminationRelatedSummaryVm | null>(null);
    readonly loading = input(false);
    readonly error = input<string | null>(null);
    /** Bir kayıt eklendi; üst sayfa özeti yeniler. */
    readonly changed = output<void>();
    readonly retry = output<void>();

    private readonly auth = inject(AuthService);
    private readonly ro = inject(TenantReadOnlyContextService);

    readonly drawerVisible = signal(false);
    readonly activeKind = signal<ProcedureKind | null>(null);
    readonly notice = signal<string | null>(null);
    readonly noticeIsWarning = signal(false);
    readonly rows = computed(() => buildProcedureRows(this.summary()));
    readonly visibleKinds = computed(() => PROCEDURE_KINDS.filter((k) => this.auth.hasOperationClaim(CREATE_CLAIM[k])));
    readonly canAddAny = computed(() => this.visibleKinds().length > 0);
    readonly drawerTitle = computed(() => {
        const kind = this.activeKind();

        return kind ? `${PROCEDURE_LABEL[kind]} ekle` : '';
    });
    readonly contextParams = computed(() => {
        const e = this.exam();

        return convertToParamMap({ clientId: e.clientId ?? '', petId: e.petId ?? '', examinationId: e.id });
    });
    /** Yalnız bağlamı olan (müşteri ve hayvanı bilinen) muayenede ekleme açılır. */
    private readonly hasContext = computed(() => !!this.exam().clientId?.trim() && !!this.exam().petId?.trim());

    readonly lockReasons = computed(() => {
        const reasons = this.visibleKinds().map((k) => this.state(k).reason);

        return [...new Set(reasons.filter((r): r is string => !!r))];
    });
    readonly addNotes = computed(() => {
        const notes = this.visibleKinds().map((k) => this.state(k).note);

        return [...new Set(notes.filter((n): n is string => !!n))];
    });

    readonly label = (kind: ProcedureKind) => PROCEDURE_LABEL[kind];
    readonly icon = (kind: ProcedureKind) => ADD_ICON[kind];
    readonly routeSegment = (kind: ProcedureKind) => PROCEDURE_ROUTE_SEGMENT[kind];
    readonly formatDt = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);

    state(kind: ProcedureKind) {
        const base = procedureAddState(kind, { finalized: this.exam().status === 'Finalized', mutationBlocked: this.ro.mutationBlocked() });

        return !this.hasContext() && !base.disabled
            ? { disabled: true, reason: 'Muayenede müşteri veya hasta bilgisi yok; işlem eklenemez.', note: null }
            : base;
    }

    open(kind: ProcedureKind): void {
        if (this.state(kind).disabled) {
            return;
        }

        this.activeKind.set(kind);
        this.drawerVisible.set(true);
    }

    close(): void {
        this.drawerVisible.set(false);
        this.activeKind.set(null);
    }

    onSaved(kind: ProcedureKind): void {
        this.close();
        this.setNotice(`${PROCEDURE_LABEL[kind]} kaydedildi.`, false);
        this.changed.emit();
    }

    onVaccinationSaved(event: VaccinationSavedEvent): void {
        this.close();
        const notice = event.stockNotice;

        this.setNotice(notice ? notice.text : 'Aşı kaydedildi.', notice?.warn ?? false);
        this.changed.emit();
    }

    private setNotice(text: string, warn: boolean): void {
        this.notice.set(text);
        this.noticeIsWarning.set(warn);
    }
}
