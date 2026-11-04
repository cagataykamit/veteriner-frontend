import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICS_READ_CLAIM, CLINICS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ONLINE_BOOKING_SETTINGS_ROUTE } from '@/app/core/routing/panel-navigation';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { MenuBadgeFeed } from '@/app/core/routing/menu-badge-feed';
import { AppointmentRequestStatus, type AppointmentRequestListItemVm } from '@/app/entities/online-booking/models/online-booking.model';
import { AppointmentRequestsService } from '@/app/entities/online-booking/services/online-booking.service';
import {
    APPOINTMENT_REQUEST_STATUS_FILTER_OPTIONS,
    appointmentRequestSourceLabel,
    appointmentRequestStatusLabel,
    appointmentRequestStatusSeverity
} from '@/app/entities/online-booking/utils/appointment-request-labels.utils';
import { AppointmentRequestDetailDialogComponent } from '@/app/entities/online-booking/components/appointment-request-detail-dialog.component';
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';

const PAGE_SIZE = 20;

/**
 * Online randevu talep kuyruğu (APPT-010; ADR-042 K4), Randevular > Talepler: bekleyenler en yakın saat önce. Satır açılınca
 * detay penceresinde onay/red yapılır. Adres `?requestId=` ile talebi doğrudan açar (takvim katmanı ve bildirimler).
 */
@Component({
    selector: 'app-appointment-requests-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        FormsModule,
        RouterLink,
        ButtonModule,
        SelectModule,
        TableModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent,
        AppointmentRequestDetailDialogComponent
    ],
    template: `
        <app-page-header title="Randevu talepleri" description="Portaldan ve kliniğe özel bağlantıdan gelen talepler. Talep onaylanınca randevu oluşur; sahibe e-posta gider.">
            @if (canSeeSettings) {
                <a actions pButton severity="secondary" [outlined]="true" [routerLink]="settingsRoute"><i class="pi pi-cog"></i>Online randevu ayarları</a>
            }
        </app-page-header>

        <div class="card">
            <div class="flex flex-col md:flex-row md:items-end gap-3 mb-4">
                <div class="flex flex-col gap-1 w-full md:max-w-xs">
                    <label for="requestStatus" class="text-sm font-medium text-muted-color">Durum</label>
                    <p-select inputId="requestStatus" [options]="statusOptions" optionLabel="label" optionValue="value" [ngModel]="status()" (ngModelChange)="onStatusChange($event)" class="w-full" data-testid="request-status-filter" />
                </div>
            </div>

            @if (loading()) {
                <app-loading-state message="Talepler yükleniyor…" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="load()" />
            } @else if (items().length === 0) {
                <app-empty-state [message]="status() === pending ? 'Bekleyen talep yok.' : 'Bu filtreye uyan talep yok.'" [hint]="status() === pending ? 'Online randevu açıksa yeni talepler burada ve bildirimlerde görünür.' : ''" />
            } @else {
                <div class="overflow-x-auto">
                    <p-table [value]="items()" [tableStyle]="{ 'min-width': '52rem' }" [rowHover]="true">
                        <ng-template #header>
                            <tr>
                                <th>İstenen saat</th>
                                <th>Neden</th>
                                <th>Sahip</th>
                                <th>Hayvan</th>
                                <th>Kaynak</th>
                                <th>Durum</th>
                                <th style="width: 6rem"></th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-r>
                            <tr data-testid="request-row" class="cursor-pointer" (click)="openRequest(r.id)">
                                <td class="font-medium whitespace-nowrap">{{ fmt(r.requestedStartUtc) }}</td>
                                <td>{{ r.reasonName }}</td>
                                <td>
                                    <div>{{ r.clientName ?? r.contactName }}</div>
                                    <small class="text-muted-color">{{ r.contactPhone ?? r.contactEmail }}</small>
                                </td>
                                <td>{{ r.petName ?? '—' }}</td>
                                <td>{{ sourceLabel(r.source) }}</td>
                                <td><app-status-tag [label]="statusLabel(r.status)" [severity]="statusSeverity(r.status)" /></td>
                                <td><button pButton type="button" size="small" class="p-button-text" (click)="$event.stopPropagation(); openRequest(r.id)">Aç</button></td>
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

        <app-appointment-request-detail-dialog [requestId]="openId()" [canDecide]="canDecide()" (closed)="onDialogClosed($event)" />
    `
})
export class AppointmentRequestsPageComponent implements OnInit {
    readonly pending = AppointmentRequestStatus.Pending;
    readonly statusOptions = APPOINTMENT_REQUEST_STATUS_FILTER_OPTIONS;
    readonly settingsRoute = ONLINE_BOOKING_SETTINGS_ROUTE;

    private readonly service = inject(AppointmentRequestsService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    private readonly badgeFeed = inject(MenuBadgeFeed);
    private readonly auth = inject(AuthService);
    private readonly ro = inject(TenantReadOnlyContextService);

    readonly canSeeSettings = [CLINICS_READ_CLAIM, CLINICS_UPDATE_CLAIM].some((c) => this.auth.hasOperationClaim(c));
    readonly canDecide = computed(() => !this.ro.mutationBlocked());

    readonly status = signal<AppointmentRequestStatus | null>(AppointmentRequestStatus.Pending);
    readonly page = signal(1);
    readonly items = signal<AppointmentRequestListItemVm[]>([]);
    readonly total = signal(0);
    readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly openId = signal<string | null>(null);

    statusLabel = appointmentRequestStatusLabel;
    statusSeverity = appointmentRequestStatusSeverity;
    sourceLabel = appointmentRequestSourceLabel;
    fmt = (utc: string) => formatDateTimeDisplay(utc);

    private loadSeq = 0;

    ngOnInit(): void {
        // Menü sayacı: bekleyen filtresindeki toplam sayfa açıkken buradan beslenir; sayfa kapanınca kendi sorgusuna döner.
        this.destroyRef.onDestroy(() => this.badgeFeed.release('pendingAppointmentRequests'));
        this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => this.openId.set(params.get('requestId')));
        this.load();
    }

    onStatusChange(status: AppointmentRequestStatus | null): void {
        this.status.set(status);
        this.page.set(1);
        this.load();
    }

    goTo(page: number): void {
        this.page.set(page);
        this.load();
    }

    openRequest(id: string): void {
        void this.router.navigate([], { relativeTo: this.route, queryParams: { requestId: id }, queryParamsHandling: 'merge' });
    }

    onDialogClosed(changed: boolean): void {
        void this.router.navigate([], { relativeTo: this.route, queryParams: { requestId: null }, queryParamsHandling: 'merge' });

        if (changed) {
            this.load();
        }
    }

    load(): void {
        const seq = ++this.loadSeq;

        this.loading.set(true);
        this.error.set(null);
        this.service.list({ status: this.status(), page: this.page(), pageSize: PAGE_SIZE }).subscribe({
            next: (result) => {
                if (seq === this.loadSeq) {
                    this.items.set(result.items);
                    this.total.set(result.totalCount);
                    this.loading.set(false);

                    if (this.status() === AppointmentRequestStatus.Pending) {
                        this.badgeFeed.report('pendingAppointmentRequests', result.totalCount);
                    }
                }
            },
            error: (e: unknown) => {
                if (seq === this.loadSeq) {
                    this.error.set(e instanceof Error ? e.message : 'Randevu talepleri yüklenemedi.');
                    this.loading.set(false);
                }
            }
        });
    }
}
