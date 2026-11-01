import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { MenuBadgeFeed } from '@/app/core/routing/menu-badge-feed';
import {
    DATA_REQUEST_RESPONSE_NOTE_MAX,
    type DataRequestStaffStatus,
    type DataRequestStatus,
    type PortalInboxSummaryVm,
    type StaffDataRequestVm
} from '@/app/entities/owner-portal/models/owner-portal.model';
import { PortalInboxService } from '@/app/entities/owner-portal/services/owner-portal.service';
import { PortalInboxError } from '@/app/entities/owner-portal/utils/owner-portal-error.utils';
import {
    DATA_REQUEST_STATUS_FILTER_OPTIONS,
    dataRequestStatusLabel,
    dataRequestStatusSeverity,
    dataRequestTypeLabel,
    isDataRequestOpen
} from '@/app/entities/owner-portal/utils/owner-portal-labels.utils';
import { formatDateDisplay, formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';

const PAGE_SIZE = 20;

/** Kapanış: yanıt notu zorunlu ve hasta sahibine e-postayla gider (§11). */
type ClosingStatus = Extract<DataRequestStaffStatus, 'Completed' | 'Rejected'>;

/**
 * Portal gelen kutusu (PORTAL-009; `PORTAL_API_CONTRACT.md` §11.2), Müşteri ve Hasta > Portal gelen kutusu: hasta sahiplerinin
 * portaldan gönderdiği KVKK veri talepleri; açıklar önce, son yanıt tarihi yakın önce. Talep ele alınır ya da yanıt notuyla
 * kapatılır; silme/düzeltme işlemini sistem yapmaz, klinik süreç belgesine göre elle yapar. Adres `?requestId=` ile talebi açar.
 */
@Component({
    selector: 'app-portal-inbox-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        FormsModule,
        RouterLink,
        ButtonModule,
        DialogModule,
        SelectModule,
        TableModule,
        TextareaModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent
    ],
    template: `
        <app-page-header
            title="Portal gelen kutusu"
            description="Hasta sahiplerinin portaldan gönderdiği veri talepleri (KVKK başvurusu). Klinik en geç 30 gün içinde yanıtlar; yanıt notu sahibine e-postayla gider."
        />

        <div class="card">
            <div class="flex flex-col md:flex-row md:items-end gap-3 mb-4">
                <div class="flex flex-col gap-1 w-full md:max-w-xs">
                    <label for="dataRequestStatus" class="text-sm font-medium text-muted-color">Durum</label>
                    <p-select inputId="dataRequestStatus" [options]="statusOptions" optionLabel="label" optionValue="value" [ngModel]="status()" (ngModelChange)="onStatusChange($event)" class="w-full" data-testid="data-request-status-filter" />
                </div>
                @if (summary(); as s) {
                    <p class="m-0 text-sm text-muted-color md:mb-2" data-testid="portal-inbox-summary">
                        Açık talep: <span class="font-medium text-color">{{ s.openDataRequestCount }}</span>
                        @if (s.overdueDataRequestCount > 0) {
                            · <span class="font-medium text-red-600 dark:text-red-400">Süresi geçen: {{ s.overdueDataRequestCount }}</span>
                        }
                    </p>
                }
            </div>

            @if (actionError(); as message) {
                <p class="text-red-500 text-sm mt-0 mb-3" role="alert">{{ message }}</p>
            }

            @if (loading()) {
                <app-loading-state message="Veri talepleri yükleniyor…" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="load()" />
            } @else if (items().length === 0) {
                <app-empty-state [message]="status() ? 'Bu filtreye uyan talep yok.' : 'Portaldan gelen veri talebi yok.'" [hint]="status() ? '' : 'Hasta sahibi portalda Hesabım > Verilerimle ilgili talep ekranından başvurduğunda burada ve bildirimlerde görünür.'" />
            } @else {
                <div class="overflow-x-auto table-stack-phone">
                    <p-table [value]="items()" [tableStyle]="{ 'min-width': '56rem' }" [rowHover]="true">
                        <ng-template #header>
                            <tr>
                                <th>Müşteri</th>
                                <th>Tür</th>
                                <th>Durum</th>
                                <th>Oluşturma</th>
                                <th>Son yanıt tarihi</th>
                                <th style="width: 16rem"></th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-r>
                            <tr data-testid="data-request-row" class="cursor-pointer" [class.bg-highlight]="r.id === openId()" (click)="openDetail(r)">
                                <td>
                                    <a [routerLink]="['/panel/clients', r.clientId]" class="font-medium max-sm:touch-hit" (click)="$event.stopPropagation()" data-testid="data-request-client">{{ r.clientName }}</a>
                                    @if (showClinic()) {
                                        <div><small class="text-muted-color">{{ r.clinicName }}</small></div>
                                    }
                                </td>
                                <td data-label="Tür">{{ typeLabel(r.type) }}</td>
                                <td data-label="Durum"><app-status-tag [label]="statusLabel(r.status)" [severity]="statusSeverity(r.status)" /></td>
                                <td class="whitespace-nowrap" data-label="Oluşturma">{{ fmtDate(r.createdAtUtc) }}</td>
                                <td class="whitespace-nowrap" data-label="Son yanıt tarihi">
                                    {{ fmtDate(r.dueAtUtc) }}
                                    @if (r.isOverdue && isOpen(r.status)) {
                                        <app-status-tag label="Süresi geçti" severity="danger" data-testid="data-request-overdue" />
                                    }
                                </td>
                                <td class="text-right whitespace-nowrap max-sm:pt-2" (click)="$event.stopPropagation()">
                                    @if (r.status === 'Open') {
                                        <button pButton type="button" size="small" class="p-button-text" [disabled]="busyId() === r.id" (click)="takeOver(r)" data-testid="data-request-take">
                                            <i [class]="busyId() === r.id ? 'pi pi-spin pi-spinner' : 'pi pi-user-edit'"></i>Ele al
                                        </button>
                                    }
                                    @if (isOpen(r.status)) {
                                        <button pButton type="button" size="small" class="p-button-text" (click)="startClosing(r, 'Completed')" data-testid="data-request-complete"><i class="pi pi-check"></i>Tamamla</button>
                                        <button pButton type="button" size="small" class="p-button-text p-button-danger" (click)="startClosing(r, 'Rejected')" data-testid="data-request-reject"><i class="pi pi-times"></i>Reddet</button>
                                    }
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
                @if (totalPages() > 1) {
                    <div class="flex items-center justify-end gap-2 mt-3">
                        <button pButton type="button" severity="secondary" size="small" [disabled]="page() <= 1" (click)="goTo(page() - 1)" aria-label="Önceki sayfa"><i class="pi pi-chevron-left"></i></button>
                        <span class="text-sm text-muted-color">{{ page() }} / {{ totalPages() }}</span>
                        <button pButton type="button" severity="secondary" size="small" [disabled]="page() >= totalPages()" (click)="goTo(page() + 1)" aria-label="Sonraki sayfa"><i class="pi pi-chevron-right"></i></button>
                    </div>
                }
            }
        </div>

        <p-dialog [header]="dialogHeader()" [modal]="true" [visible]="!!selected()" (visibleChange)="$event || closeDialog()" [style]="{ width: 'min(42rem, 96vw)' }" [draggable]="false" [closable]="!saving()">
            @if (selected(); as r) {
                <dl class="grid grid-cols-12 gap-x-3 gap-y-2 m-0 mb-4 text-sm">
                    <dt class="col-span-4 text-muted-color">Müşteri</dt>
                    <dd class="col-span-8 m-0"><a [routerLink]="['/panel/clients', r.clientId]" (click)="closeDialog()">{{ r.clientName }}</a> · {{ r.clinicName }}</dd>
                    <dt class="col-span-4 text-muted-color">Tür ve durum</dt>
                    <dd class="col-span-8 m-0">{{ typeLabel(r.type) }} · {{ statusLabel(r.status) }}</dd>
                    <dt class="col-span-4 text-muted-color">Oluşturma / son yanıt</dt>
                    <dd class="col-span-8 m-0">{{ fmtDateTime(r.createdAtUtc) }} / {{ fmtDate(r.dueAtUtc) }}</dd>
                    <dt class="col-span-4 text-muted-color">Talep</dt>
                    <dd class="col-span-8 m-0 whitespace-pre-wrap break-words" data-testid="data-request-message">{{ r.message }}</dd>
                    @if (r.responseNote) {
                        <dt class="col-span-4 text-muted-color">Yanıt notu</dt>
                        <dd class="col-span-8 m-0 whitespace-pre-wrap break-words">{{ r.responseNote }}</dd>
                    }
                </dl>

                @if (closing(); as target) {
                    <div class="flex flex-col gap-2">
                        <label for="dataRequestNote" class="text-sm font-medium">Yanıt notu *</label>
                        <textarea id="dataRequestNote" pTextarea rows="5" [maxlength]="noteMax" [ngModel]="note()" (ngModelChange)="note.set($event)" class="w-full" data-testid="data-request-note"></textarea>
                        <small class="text-muted-color" data-testid="data-request-note-hint">
                            Bu not hasta sahibine e-postayla gönderilir ve portalda talebin yanında görünür. Hayvan sağlığı bilgisi yazmayın; yapılan işlemi ya da ret gerekçesini kısaca açıklayın. ({{ note().length }}/{{ noteMax }})
                        </small>
                        @if (dialogError(); as message) {
                            <p class="text-red-500 m-0" role="alert">{{ message }}</p>
                        }
                    </div>
                } @else if (dialogError(); as message) {
                    <p class="text-red-500 m-0" role="alert">{{ message }}</p>
                }
            }
            <ng-template #footer>
                @if (selected(); as r) {
                    @if (closing(); as target) {
                        <button pButton type="button" severity="secondary" [disabled]="saving()" (click)="closing.set(null)">Vazgeç</button>
                        <button pButton type="button" [severity]="target === 'Rejected' ? 'danger' : 'primary'" [disabled]="!note().trim() || saving()" (click)="submitClosing()" data-testid="data-request-close-submit">
                            <i [class]="saving() ? 'pi pi-spin pi-spinner' : 'pi pi-send'"></i>{{ target === 'Rejected' ? 'Reddet ve sahibe gönder' : 'Tamamla ve sahibe gönder' }}
                        </button>
                    } @else {
                        <button pButton type="button" severity="secondary" (click)="closeDialog()">Kapat</button>
                        @if (r.status === 'Open') {
                            <button pButton type="button" severity="secondary" [outlined]="true" [disabled]="busyId() === r.id" (click)="takeOver(r)"><i class="pi pi-user-edit"></i>Ele al</button>
                        }
                        @if (isOpen(r.status)) {
                            <button pButton type="button" severity="danger" [outlined]="true" (click)="startClosing(r, 'Rejected')"><i class="pi pi-times"></i>Reddet</button>
                            <button pButton type="button" (click)="startClosing(r, 'Completed')"><i class="pi pi-check"></i>Tamamla</button>
                        }
                    }
                }
            </ng-template>
        </p-dialog>
    `
})
export class PortalInboxPageComponent implements OnInit {
    readonly statusOptions = DATA_REQUEST_STATUS_FILTER_OPTIONS;
    readonly noteMax = DATA_REQUEST_RESPONSE_NOTE_MAX;

    private readonly service = inject(PortalInboxService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    private readonly badgeFeed = inject(MenuBadgeFeed);

    readonly status = signal<DataRequestStatus | null>(null);
    readonly page = signal(1);
    readonly items = signal<StaffDataRequestVm[]>([]);
    readonly total = signal(0);
    readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly summary = signal<PortalInboxSummaryVm | null>(null);
    readonly showClinic = computed(() => new Set(this.items().map((r) => r.clinicId)).size > 1);

    readonly openId = signal<string | null>(null);
    readonly selected = computed(() => this.items().find((r) => r.id === this.openId()) ?? null);
    readonly closing = signal<ClosingStatus | null>(null);
    readonly note = signal('');
    readonly saving = signal(false);
    readonly busyId = signal<string | null>(null);
    readonly dialogError = signal<string | null>(null);
    readonly actionError = signal<string | null>(null);
    readonly dialogHeader = computed(() => {
        const target = this.closing();

        return target === 'Completed' ? 'Talebi tamamla' : target === 'Rejected' ? 'Talebi reddet' : 'Veri talebi';
    });

    typeLabel = dataRequestTypeLabel;
    statusLabel = dataRequestStatusLabel;
    statusSeverity = dataRequestStatusSeverity;
    isOpen = isDataRequestOpen;
    fmtDate = (utc: string) => formatDateDisplay(utc);
    fmtDateTime = (utc: string) => formatDateTimeDisplay(utc);

    private loadSeq = 0;

    ngOnInit(): void {
        // Menü sayacı: sayfa açıkken özetten beslenir; sayfa kapanınca kendi sorgusuna döner.
        this.destroyRef.onDestroy(() => this.badgeFeed.release('openPortalDataRequests'));
        this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => this.openId.set(params.get('requestId')));
        this.load();
    }

    onStatusChange(status: DataRequestStatus | null): void {
        this.status.set(status);
        this.page.set(1);
        this.load();
    }

    goTo(page: number): void {
        this.page.set(page);
        this.load();
    }

    openDetail(request: StaffDataRequestVm): void {
        this.dialogError.set(null);
        this.closing.set(null);
        void this.router.navigate([], { relativeTo: this.route, queryParams: { requestId: request.id }, queryParamsHandling: 'merge' });
    }

    closeDialog(): void {
        if (this.saving()) {
            return;
        }

        this.closing.set(null);
        this.dialogError.set(null);
        void this.router.navigate([], { relativeTo: this.route, queryParams: { requestId: null }, queryParamsHandling: 'merge' });
    }

    startClosing(request: StaffDataRequestVm, target: ClosingStatus): void {
        this.note.set('');
        this.dialogError.set(null);
        this.closing.set(target);

        if (this.openId() !== request.id) {
            void this.router.navigate([], { relativeTo: this.route, queryParams: { requestId: request.id }, queryParamsHandling: 'merge' });
        }
    }

    takeOver(request: StaffDataRequestVm): void {
        if (this.busyId()) {
            return;
        }

        this.busyId.set(request.id);
        this.actionError.set(null);
        this.dialogError.set(null);
        this.service.updateDataRequestStatus(request.id, 'InProgress', null).subscribe({
            next: (updated) => {
                this.busyId.set(null);
                this.replace(updated);
                this.loadSummary();
            },
            error: (e: unknown) => {
                this.busyId.set(null);
                this.fail(e, this.selected() ? this.dialogError : this.actionError);
            }
        });
    }

    submitClosing(): void {
        const request = this.selected();
        const target = this.closing();
        const note = this.note().trim();

        if (!request || !target || !note || this.saving()) {
            return;
        }

        this.saving.set(true);
        this.dialogError.set(null);
        this.service.updateDataRequestStatus(request.id, target, note).subscribe({
            next: (updated) => {
                this.saving.set(false);
                this.replace(updated);
                this.closing.set(null);
                this.closeDialog();
                this.loadSummary();
            },
            error: (e: unknown) => {
                this.saving.set(false);
                this.fail(e, this.dialogError);
            }
        });
    }

    load(): void {
        const seq = ++this.loadSeq;

        this.loading.set(true);
        this.error.set(null);
        this.loadSummary();
        this.service.listDataRequests({ status: this.status(), page: this.page(), pageSize: PAGE_SIZE }).subscribe({
            next: (result) => {
                if (seq === this.loadSeq) {
                    this.items.set(result.items);
                    this.total.set(result.totalItems);
                    this.loading.set(false);
                }
            },
            error: (e: unknown) => {
                if (seq === this.loadSeq) {
                    this.error.set(e instanceof Error ? e.message : 'Veri talepleri yüklenemedi.');
                    this.loading.set(false);
                }
            }
        });
    }

    private loadSummary(): void {
        this.service.summary().subscribe({
            next: (s) => {
                this.summary.set(s);
                this.badgeFeed.report('openPortalDataRequests', s.openDataRequestCount);
            },
            error: () => undefined
        });
    }

    private replace(updated: StaffDataRequestVm): void {
        this.items.update((list) => list.map((r) => (r.id === updated.id ? updated : r)));
    }

    /** Bayat kayıtta (bulunamadı, durum değişti, eşzamanlılık) liste yenilenir; mesaj yine gösterilir. */
    private fail(e: unknown, target: ReturnType<typeof signal<string | null>>): void {
        target.set(e instanceof Error ? e.message : 'Talep güncellenemedi.');

        if (e instanceof PortalInboxError && e.isStale) {
            this.closing.set(null);
            this.load();
        }
    }
}
