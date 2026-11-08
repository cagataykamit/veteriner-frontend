import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import {
    CUSTOM_DEVELOPMENT_LIMITS,
    type CustomDevelopmentRequestStatus
} from '@/app/entities/custom-development/models/custom-development-request.model';
import {
    CUSTOM_DEVELOPMENT_STATUS_LABELS,
    customDevelopmentPriorityLabel,
    customDevelopmentStatusLabel,
    customDevelopmentStatusSeverity,
    customDevelopmentTargetLabel
} from '@/app/entities/custom-development/utils/custom-development-labels.utils';
import {
    CustomDevelopmentAdminService,
    type AdminCustomDevelopmentFilter,
    type AdminCustomDevelopmentRequestDto,
    type AdminCustomDevelopmentRequestPage
} from '@/app/features/custom-development-admin/services/custom-development-admin.service';
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';

const FILTER_OPTIONS: ReadonlyArray<{ value: AdminCustomDevelopmentFilter; label: string }> = [
    { value: 'open', label: 'Açık talepler' },
    { value: 'all', label: 'Tümü' },
    ...(Object.keys(CUSTOM_DEVELOPMENT_STATUS_LABELS) as CustomDevelopmentRequestStatus[]).map((value) => ({
        value,
        label: CUSTOM_DEVELOPMENT_STATUS_LABELS[value]
    }))
];

/**
 * Platform yöneticisi: tüm kiracıların size özel geliştirme talepleri (TIER-010, sözleşme §4). Durum akışı backend'dedir; satırdaki
 * `nextStatuses` dışındaki geçiş sunulmaz. Kapsam dışı kararında kliniğe görünecek gerekçe zorunlu; not isteğe bağlıdır ve kliniğe görünür.
 * Değişiklik denetim kaydına yazılır (metinler maskeli).
 */
@Component({
    selector: 'app-custom-development-admin-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        FormsModule,
        ButtonModule,
        DialogModule,
        MessageModule,
        SelectModule,
        TextareaModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppEmptyStateComponent,
        AppStatusTagComponent
    ],
    template: `
        <app-page-header
            title="Özel geliştirme talepleri"
            description="Kurumsal kliniklerin Vetinity içindeki ekran, rapor ve çıktılar için açtığı talepler. Gerekçe ve not kliniğe görünür. Yalnız Vetinity platform yöneticisi görür."
        />

        <div class="card">
            <div class="flex flex-wrap items-end gap-3 mb-4">
                <div class="flex flex-col gap-1 w-full sm:w-64">
                    <label for="cdaFilter" class="text-sm font-medium text-muted-color">Filtre</label>
                    <p-select inputId="cdaFilter" [options]="filterOptions" optionLabel="label" optionValue="value" [ngModel]="filter()" (ngModelChange)="onFilterChange($event)" class="w-full" data-testid="cda-filter" />
                </div>
                @if (data(); as d) {
                    <small class="text-muted-color pb-2" data-testid="cda-total">{{ d.totalItems }} talep</small>
                }
            </div>

            @if (message(); as m) {
                <p-message severity="success" class="w-full mb-3" role="status" data-testid="cda-message">{{ m }}</p-message>
            }

            @if (loading()) {
                <app-loading-state message="Talepler yükleniyor…" />
            } @else if (error(); as err) {
                <app-error-state [detail]="err" (retry)="load()" />
            } @else if (data(); as d) {
                @if (d.items.length === 0) {
                    <app-empty-state message="Bu filtrede talep yok." />
                } @else {
                    <ul class="list-none m-0 p-0 flex flex-col gap-3">
                        @for (row of d.items; track row.request.id) {
                            <li class="border border-surface-200 dark:border-surface-700 rounded-border p-3" data-testid="cda-row">
                                <div class="flex flex-wrap items-start justify-between gap-2">
                                    <div class="min-w-0">
                                        <div class="text-sm text-muted-color">{{ row.tenantName || row.tenantId }}</div>
                                        <div class="font-medium break-words">{{ row.request.requestTitle }}</div>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <app-status-tag [label]="statusLabel(row.request.status)" [severity]="statusSeverity(row.request.status)" />
                                        @if (row.nextStatuses.length > 0) {
                                            <button pButton type="button" size="small" severity="secondary" [outlined]="true" (click)="openChange(row)" data-testid="cda-change">
                                                <i class="pi pi-arrow-right"></i>Durumu değiştir
                                            </button>
                                        }
                                    </div>
                                </div>
                                <small class="block text-muted-color mt-1">{{ meta(row) }}</small>
                                <p class="mt-2 mb-0 text-sm whitespace-pre-line break-words">{{ row.request.requestText }}</p>
                                @if (row.request.decisionReason) {
                                    <div class="mt-2 text-sm"><span class="font-medium">Gerekçe:</span> <span class="whitespace-pre-line">{{ row.request.decisionReason }}</span></div>
                                }
                                @if (row.request.responseNote) {
                                    <div class="mt-2 text-sm"><span class="font-medium">Not:</span> <span class="whitespace-pre-line">{{ row.request.responseNote }}</span></div>
                                }
                            </li>
                        }
                    </ul>
                    @if (d.totalPages > 1) {
                        <div class="flex items-center justify-end gap-2 mt-4">
                            <button pButton type="button" size="small" severity="secondary" [outlined]="true" [disabled]="page() <= 1" (click)="goTo(page() - 1)" data-testid="cda-prev"><i class="pi pi-chevron-left"></i>Önceki</button>
                            <small class="text-muted-color">{{ page() }} / {{ d.totalPages }}</small>
                            <button pButton type="button" size="small" severity="secondary" [outlined]="true" [disabled]="page() >= d.totalPages" (click)="goTo(page() + 1)" data-testid="cda-next">Sonraki<i class="pi pi-chevron-right"></i></button>
                        </div>
                    }
                }
            }
        </div>

        <p-dialog header="Durumu değiştir" [modal]="true" [closable]="!saving()" [dismissableMask]="!saving()" [style]="{ width: 'min(520px, 95vw)' }" [visible]="editing() !== null" (visibleChange)="onDialogVisible($event)">
            @if (editing(); as row) {
                <form class="flex flex-col gap-3" (ngSubmit)="save()">
                    <p class="m-0 text-sm"><span class="text-muted-color">{{ row.tenantName || row.tenantId }}</span> · {{ row.request.requestTitle }}</p>
                    <div class="flex flex-col gap-1">
                        <label for="cdaStatus" class="text-sm font-medium">Yeni durum</label>
                        <p-select inputId="cdaStatus" name="cdaStatus" [options]="nextOptions()" optionLabel="label" optionValue="value" [ngModel]="target()" (ngModelChange)="target.set($event)" class="w-full" appendTo="body" data-testid="cda-status" />
                    </div>
                    @if (target() === 'OutOfScope') {
                        <div class="flex flex-col gap-1">
                            <label for="cdaReason" class="text-sm font-medium">Kapsam dışı gerekçesi</label>
                            <textarea id="cdaReason" name="cdaReason" pTextarea rows="3" [maxlength]="limits.reason" [ngModel]="reason()" (ngModelChange)="reason.set($event)" data-testid="cda-reason"></textarea>
                            <small class="text-muted-color">Zorunlu; kliniğe görünür.</small>
                        </div>
                    }
                    <div class="flex flex-col gap-1">
                        <label for="cdaNote" class="text-sm font-medium">Not</label>
                        <textarea id="cdaNote" name="cdaNote" pTextarea rows="3" [maxlength]="limits.note" [ngModel]="note()" (ngModelChange)="note.set($event)" placeholder="Örn. Aralık sürümünde" data-testid="cda-note"></textarea>
                        <small class="text-muted-color">İsteğe bağlı; kliniğe görünür. Boş bırakılırsa önceki not kalır.</small>
                    </div>
                    @if (dialogError(); as m) {
                        <p-message severity="error" class="w-full" role="alert" data-testid="cda-error">{{ m }}</p-message>
                    }
                    <div class="flex justify-end gap-2">
                        <button pButton type="button" severity="secondary" [disabled]="saving()" (click)="closeChange()">Vazgeç</button>
                        <button pButton type="submit" [disabled]="!canSave()" data-testid="cda-save"><i class="p-button-icon" [class]="saving() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>Kaydet</button>
                    </div>
                </form>
            }
        </p-dialog>
    `
})
export class CustomDevelopmentAdminPageComponent implements OnInit {
    private readonly service = inject(CustomDevelopmentAdminService);

    readonly filterOptions = FILTER_OPTIONS;
    readonly limits = CUSTOM_DEVELOPMENT_LIMITS;

    readonly filter = signal<AdminCustomDevelopmentFilter>('open');
    readonly page = signal(1);
    readonly data = signal<AdminCustomDevelopmentRequestPage | null>(null);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly message = signal<string | null>(null);

    readonly editing = signal<AdminCustomDevelopmentRequestDto | null>(null);
    readonly target = signal<CustomDevelopmentRequestStatus | null>(null);
    readonly reason = signal('');
    readonly note = signal('');
    readonly saving = signal(false);
    readonly dialogError = signal<string | null>(null);

    readonly nextOptions = computed(() => (this.editing()?.nextStatuses ?? []).map((value) => ({ value, label: customDevelopmentStatusLabel(value) })));
    readonly canSave = computed(() => !this.saving() && this.target() !== null && (this.target() !== 'OutOfScope' || this.reason().trim().length > 0));

    statusLabel = customDevelopmentStatusLabel;
    statusSeverity = customDevelopmentStatusSeverity;

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.error.set(null);
        this.service.list(this.filter(), this.page()).subscribe({
            next: (d) => {
                this.data.set(d);
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.error.set(e instanceof Error && e.message ? e.message : 'Talepler yüklenemedi.');
                this.loading.set(false);
            }
        });
    }

    onFilterChange(value: AdminCustomDevelopmentFilter): void {
        this.filter.set(value);
        this.page.set(1);
        this.message.set(null);
        this.load();
    }

    goTo(page: number): void {
        this.page.set(page);
        this.load();
    }

    meta(row: AdminCustomDevelopmentRequestDto): string {
        const r = row.request;
        const parts = [
            `${customDevelopmentTargetLabel(r.targetKind)}: ${r.requestTarget}`,
            `Öncelik ${customDevelopmentPriorityLabel(r.priority).toLocaleLowerCase('tr')}`,
            formatDateTimeDisplay(r.createdAtUtc)
        ];

        if (r.createdByName) {
            parts.push(r.createdByName);
        }

        return parts.join(' · ');
    }

    openChange(row: AdminCustomDevelopmentRequestDto): void {
        this.editing.set(row);
        this.target.set(row.nextStatuses.length === 1 ? row.nextStatuses[0] : null);
        this.reason.set('');
        this.note.set('');
        this.dialogError.set(null);
    }

    onDialogVisible(visible: boolean): void {
        if (!visible) {
            this.closeChange();
        }
    }

    closeChange(): void {
        if (!this.saving()) {
            this.editing.set(null);
        }
    }

    save(): void {
        const row = this.editing();
        const status = this.target();

        if (!row || status === null || !this.canSave()) {
            return;
        }

        this.saving.set(true);
        this.dialogError.set(null);
        this.service
            .changeStatus(row.request.id, {
                status,
                decisionReason: status === 'OutOfScope' ? this.reason().trim() : null,
                responseNote: this.note().trim() || null
            })
            .subscribe({
                next: (updated) => {
                    this.saving.set(false);
                    this.editing.set(null);
                    this.message.set(`"${updated.request.requestTitle}" ${customDevelopmentStatusLabel(updated.request.status).toLocaleLowerCase('tr')} olarak kaydedildi.`);
                    this.load();
                },
                error: (e: unknown) => {
                    this.saving.set(false);
                    this.dialogError.set(e instanceof Error && e.message ? e.message : 'Durum değiştirilemedi.');
                    // Talep başka bir oturumda değişmiş olabilir; liste güncel durumu göstersin.
                    this.load();
                }
            });
    }
}
