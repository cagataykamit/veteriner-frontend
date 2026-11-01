import { Component, computed, HostListener, inject, input, output, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, convertToParamMap } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Drawer, DrawerModule } from 'primeng/drawer';
import { ZIndexUtils } from 'primeng/utils';
import { AuthService } from '@/app/core/auth/auth.service';
import { HOSPITALIZATIONS_CREATE_CLAIM, IMAGING_CREATE_CLAIM, LAB_RESULTS_CREATE_CLAIM, PRESCRIPTIONS_CREATE_CLAIM, TREATMENTS_CREATE_CLAIM, VACCINATIONS_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { ExaminationDetailVm, ExaminationRelatedSummaryVm } from '@/app/entities/examination/models/examination-vm.model';
import { buildProcedureRows, FINALIZED_LOCK_MESSAGE, PROCEDURE_KINDS, PROCEDURE_LABEL, PROCEDURE_ROUTE_SEGMENT, procedureAddState, type ProcedureKind } from '@/app/features/examinations/utils/examination-procedures.utils';
import { HospitalizationFormComponent } from '@/app/entities/procedure/components/hospitalization-form.component';
import { ImagingRecordFormComponent } from '@/app/entities/procedure/components/imaging-record-form.component';
import { IMAGING_ADDED_AFTER_FINALIZATION_LABEL } from '@/app/entities/imaging/utils/imaging.utils';
import { LabResultFormComponent } from '@/app/entities/procedure/components/lab-result-form.component';
import { PrescriptionFormComponent } from '@/app/entities/procedure/components/prescription-form.component';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { TreatmentFormComponent } from '@/app/entities/procedure/components/treatment-form.component';
import { VaccinationFormComponent, type VaccinationSavedEvent } from '@/app/entities/procedure/components/vaccination-form.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';
import { closeWithUnsavedChangesCheck, HAS_UNSAVED_CHANGES } from '@/app/shared/ui/unsaved-changes/unsaved-changes';

const CREATE_CLAIM: Record<ProcedureKind, string> = {
    treatment: TREATMENTS_CREATE_CLAIM,
    prescription: PRESCRIPTIONS_CREATE_CLAIM,
    vaccination: VACCINATIONS_CREATE_CLAIM,
    lab: LAB_RESULTS_CREATE_CLAIM,
    imaging: IMAGING_CREATE_CLAIM,
    hospitalization: HOSPITALIZATIONS_CREATE_CLAIM
};

const ADD_ICON: Record<ProcedureKind, string> = {
    treatment: 'pi pi-plus',
    prescription: 'pi pi-file-edit',
    vaccination: 'pi pi-shield',
    lab: 'pi pi-chart-bar',
    imaging: 'pi pi-image',
    hospitalization: 'pi pi-building'
};

/**
 * Ziyaret çalışma alanının "İşlemler" bölümü: muayeneye bağlı tedavi, reçete, aşı, lab istemi, görüntüleme ve yatış tek listede.
 * "Ekle" yan panelde mevcut form bileşenini açar (müşteri, hayvan, muayene dolu ve kilitli); kayıttan sonra aynı
 * muayenede kalınır, liste `changed` ile yenilenir. Kilitli düğme nedenini görünür söyler (ADR-013).
 * Görüntüleme kayıtları özet ucunun `imaging` bloğundan gelir; iptaller aşı gibi silik gösterilir, kesinleştirmeden sonra ekleneni rozetlidir.
 */
@Component({
    selector: 'app-examination-procedures-section',
    standalone: true,
    providers: [ConfirmationService],
    imports: [
        RouterLink,
        ButtonModule,
        DrawerModule,
        ConfirmDialogModule,
        AppErrorStateComponent,
        AppStatusTagComponent,
        TreatmentFormComponent,
        PrescriptionFormComponent,
        VaccinationFormComponent,
        LabResultFormComponent,
        ImagingRecordFormComponent,
        HospitalizationFormComponent,
        TrDateTimePipe
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="card mb-0" data-testid="procedures-section">
            <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-2">
                <h5 class="mt-0 mb-0">İşlemler</h5>
                @if (canAddAny()) {
                    <!-- Kesinleşince eklenemeyen türlerin düğmesi çizilmez; neden tek not satırında. -->
                    <div class="flex flex-wrap items-center gap-2" data-testid="procedure-add-bar">
                        @for (kind of shownKinds(); track kind) {
                            <button pButton type="button" size="small" severity="secondary" [outlined]="true" [disabled]="state(kind).disabled" [attr.data-testid]="'procedure-add-' + kind" (click)="open(kind)"><i class="p-button-icon" [class]="icon(kind)"></i>{{ label(kind) }}</button>
                        }
                    </div>
                }
            </div>
            @if (canAddAny() && addHint(); as hint) {
                <p class="text-sm text-muted-color mt-0 mb-1" role="note" [attr.data-testid]="lockReasons().length > 0 ? 'procedure-lock-reason' : 'procedure-add-note'">
                    @if (lockReasons().length > 0) {
                        <i class="pi pi-lock text-xs mr-1"></i>
                    }
                    {{ hint }}
                </p>
            }

            @if (notice()) {
                <p class="text-sm mt-2 mb-0" [class]="noticeIsWarning() ? 'text-amber-700 dark:text-amber-300' : ''" role="status" data-testid="procedure-notice">{{ notice() }}</p>
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
                            <li class="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 border-b border-surface-200 dark:border-surface-700 last:border-b-0" [class.opacity-60]="row.cancelled" [attr.data-cancelled]="row.cancelled ? 'true' : null">
                                <app-status-tag [label]="label(row.kind)" severity="info" />
                                <span class="font-medium min-w-0 break-words flex-1" [class.line-through]="row.cancelled">{{ row.title }}</span>
                                @if (row.stateLabel) {
                                    <app-status-tag [label]="row.stateLabel" [severity]="row.cancelled ? 'secondary' : 'warn'" />
                                }
                                @if (row.addedAfterFinalization) {
                                    <app-status-tag [label]="lateEntryLabel" severity="warn" data-testid="procedure-late-entry" />
                                }
                                @if (row.detail) {
                                    <span class="text-sm text-muted-color">{{ row.detail }}</span>
                                }
                                <span class="text-sm text-muted-color">{{ row.atUtc | trDateTime }}</span>
                                <a [routerLink]="['/panel', routeSegment(row.kind), row.id]" class="text-primary font-medium no-underline text-sm">Detay →</a>
                            </li>
                        }
                    </ul>
                }
            </div>
        </div>

        <!-- Panelin kendi kapatıcıları kapalı: dışarı tıklama, Esc, çarpı ve İptal hepsi requestClose() üzerinden tek kurala (kaydedilmemiş değişiklik onayı) bağlanır. -->
        <p-drawer [(visible)]="drawerVisible" position="right" [style]="{ width: 'min(44rem, 100vw)' }" [dismissible]="false" [closeOnEscape]="false" [showCloseIcon]="false">
            <ng-template #header>
                <span class="p-drawer-title">{{ drawerTitle() }}</span>
                <button pButton type="button" class="p-button-text p-button-secondary p-button-rounded" aria-label="Kapat" data-testid="procedure-drawer-close" (click)="requestClose()"><i class="pi pi-times"></i></button>
            </ng-template>
            @if (activeKind(); as kind) {
                <p class="text-sm text-muted-color mt-0 mb-4" data-testid="procedure-drawer-context">{{ exam().petName }} · {{ exam().clientName }} — müşteri, hasta ve muayene bu kayda otomatik bağlanır.</p>
                @switch (kind) {
                    @case ('treatment') {
                        <app-treatment-form [embedded]="true" [contextParams]="contextParams()" (saved)="onSaved(kind)" (cancelled)="requestClose()" />
                    }
                    @case ('prescription') {
                        <app-prescription-form [embedded]="true" [contextParams]="contextParams()" (saved)="onSaved(kind)" (cancelled)="requestClose()" />
                    }
                    @case ('vaccination') {
                        <app-vaccination-form [embedded]="true" [contextParams]="contextParams()" (saved)="onVaccinationSaved($event)" (cancelled)="requestClose()" />
                    }
                    @case ('lab') {
                        <app-lab-result-form [embedded]="true" [contextParams]="contextParams()" (saved)="onSaved(kind)" (cancelled)="requestClose()" />
                    }
                    @case ('imaging') {
                        <app-imaging-record-form [embedded]="true" [contextParams]="contextParams()" (saved)="onSaved(kind)" (cancelled)="requestClose()" />
                    }
                    @case ('hospitalization') {
                        <app-hospitalization-form [embedded]="true" [contextParams]="contextParams()" (saved)="onSaved(kind)" (cancelled)="requestClose()" />
                    }
                }
            }
        </p-drawer>
        <p-confirmdialog [style]="{ width: 'min(450px, 95vw)' }" />
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
    private readonly confirmation = inject(ConfirmationService);

    private readonly drawer = viewChild(Drawer);
    /** Panelde açık olan gömülü form; "kirli mi" bilgisini ortak token üzerinden verir. */
    private readonly activeForm = viewChild(HAS_UNSAVED_CHANGES);

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
    /** Kilit nedeni ve ek notlar tek satırda; ayrı paragraflar bölümü kalabalıklaştırıyordu. */
    readonly addHint = computed(() => [...this.lockReasons(), ...this.addNotes()].join(' '));
    /** Kesinleşme kalıcıdır: o yüzden kapalı kalan türlerin düğmesi çizilmez (salt okunur geçicidir, düğme kilitli kalır). */
    readonly shownKinds = computed(() => this.visibleKinds().filter((k) => this.state(k).reason !== FINALIZED_LOCK_MESSAGE));

    readonly lateEntryLabel = IMAGING_ADDED_AFTER_FINALIZATION_LABEL;
    readonly label = (kind: ProcedureKind) => PROCEDURE_LABEL[kind];
    readonly icon = (kind: ProcedureKind) => ADD_ICON[kind];
    readonly routeSegment = (kind: ProcedureKind) => PROCEDURE_ROUTE_SEGMENT[kind];

    state(kind: ProcedureKind) {
        const base = procedureAddState(kind, { finalized: this.exam().status === 'Finalized', mutationBlocked: this.ro.mutationBlocked() });

        return !this.hasContext() && !base.disabled ? { disabled: true, reason: 'Muayenede müşteri veya hasta bilgisi yok; işlem eklenemez.', note: null } : base;
    }

    open(kind: ProcedureKind): void {
        if (this.state(kind).disabled) {
            return;
        }

        this.activeKind.set(kind);
        this.drawerVisible.set(true);
    }

    /** Kapanış isteği (dışarı tıklama, Esc, çarpı, İptal): değişiklik yoksa kapanır, varsa onay sorulur; "Vazgeç" paneli ve bilgiyi korur. */
    requestClose(): void {
        if (!this.drawerVisible()) {
            return;
        }

        closeWithUnsavedChangesCheck(this.confirmation, this.activeForm()?.hasUnsavedChanges() ?? false, () => this.close());
    }

    /** Dışarı tıklama: panel maskesi gövdeye eklenir, o yüzden belge düzeyinde yakalanır. */
    @HostListener('document:click', ['$event'])
    onDocumentClick(event: Event): void {
        if (this.drawerVisible() && event.target instanceof HTMLElement && event.target.classList.contains('p-drawer-mask')) {
            this.requestClose();
        }
    }

    /** Esc yalnız panel en üstteki katmansa kapatır; açık liste kutusu ya da onay diyaloğu varsa onlara bırakılır. */
    @HostListener('document:keydown.escape')
    onDocumentEscape(): void {
        if (!this.drawerVisible()) {
            return;
        }

        const container = this.drawer()?.container;

        if (container && ZIndexUtils.get(container) !== ZIndexUtils.getCurrent()) {
            return;
        }

        this.requestClose();
    }

    /** Doğrudan kapatma (kayıt sonrası ya da onaydan geçmiş istek). */
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
