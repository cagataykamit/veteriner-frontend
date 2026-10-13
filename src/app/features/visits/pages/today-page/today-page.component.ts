import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { Menu, MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { PetAlertBadgesComponent } from '@/app/shared/pet-alerts/pet-alert-badges.component';
import { AppointmentNoShowDialogComponent } from '@/app/features/appointments/components/appointment-no-show-dialog.component';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { Subject, catchError, map, of, switchMap, timer } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    APPOINTMENTS_NOSHOW_CLAIM,
    EXAMINATIONS_CREATE_CLAIM,
    HOSPITALIZATIONS_READ_CLAIM,
    PAYMENTS_CREATE_CLAIM,
    VISITS_CORRECT_CLAIM,
    VISITS_CREATE_CLAIM,
    VISITS_UPDATE_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { TodayMoneyComponent } from '@/app/features/visits/components/today-money.component';
import { VisitArrivalDialogComponent } from '@/app/features/visits/components/visit-arrival-dialog.component';
import { VisitCorrectionDialogComponent } from '@/app/features/visits/components/visit-correction-dialog.component';
import type { TodayItemVm, TodayQuery, TodayVm, VisitCreateResultVm } from '@/app/features/visits/models/visit-vm.model';
import { VisitsService } from '@/app/features/visits/services/visits.service';
import {
    careStatusLabel,
    careStatusSeverity,
    formatElapsedSince,
    formatHospitalizationStay,
    groupTodayItems,
    todayItemActions,
    todaySecondaryActions,
    todayUrgencyToggle,
    type TodayItemActions,
    type TodaySecondaryAction,
    type TodaySecondaryActionKey,
    type TodayRowPermissions,
    type TodayUrgencyToggle,
    type WaitAlertLevel,
    isPossiblyForgottenVisit,
    waitAlertLevel,
    waitAlertTitle
} from '@/app/features/visits/utils/visit-status.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { formatUtcIsoAsLocalDateDisplay, formatUtcIsoAsLocalTimeDisplay } from '@/app/shared/utils/date.utils';
import { formatClientPhoneForDisplay } from '@/app/shared/utils/phone-display.utils';
import { addTracedToast } from '@/app/shared/utils/toast-trace.utils';

/** Resepsiyon ve hekimin aynı kuyruğu güncel görmesi için otomatik yenileme aralığı. */
const REFRESH_INTERVAL_MS = 30_000;

const COMPACT_MEDIA_QUERY = '(max-width: 40rem)';

type RefreshMode = 'initial' | 'silent';
type TodayView = 'today' | 'voided';
type TodayScope = 'mine' | 'all';

/**
 * Bugün: o günün randevuları ve gelen hastalar tek listede (randevulu Visit tek satır).
 * Ödeme ve yatış rozetleri bakım durumundan ayrıdır; aktif yatışlar ayrı bölümde listelenir; açık iş göstergesi backend'de yoktur.
 */
@Component({
    selector: 'app-today-page',
    standalone: true,
    imports: [
        CommonModule,
        ButtonModule,
        FormsModule,
        SelectButtonModule,
        MenuModule,
        RouterLink,
        TableModule,
        ToastModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppEmptyStateComponent,
        AppStatusTagComponent,
        TodayMoneyComponent,
        VisitArrivalDialogComponent,
        VisitCorrectionDialogComponent,
        AppointmentNoShowDialogComponent,
        PetAlertBadgesComponent
    ],
    providers: [MessageService],
    template: `
        <p-toast position="bottom-right" />
        <app-page-header title="Bugün" description="Bugünün randevuları ve gelen hastalar.">
            <div actions class="flex flex-wrap gap-2">
                <p-button
                    type="button"
                    [label]="copy.buttonRefresh"
                    icon="pi pi-refresh"
                    severity="secondary"
                    (onClick)="refresh('silent')"
                />
                @if (canCreateVisit) {
                    <p-button
                        type="button"
                        label="Randevusuz geliş"
                        icon="pi pi-plus"
                        [disabled]="ro.mutationBlocked()"
                        (onClick)="openWalkInArrival()"
                    />
                }
            </div>
        </app-page-header>

        <p-selectbutton class="block mb-4" [options]="viewOptions" [ngModel]="view()" (ngModelChange)="setView($event)" optionLabel="label" optionValue="value" [allowEmpty]="false" ariaLabel="Görünüm" />
        @if (myUserId()) {
            <p-selectbutton class="block mb-4" [options]="scopeOptions" [ngModel]="scope()" (ngModelChange)="setScope($event)" optionLabel="label" optionValue="value" [allowEmpty]="false" ariaLabel="Hasta kapsamı" />
            @if (scope() === 'mine') {
                <p class="text-muted-color text-sm mt-0 mb-4">Yalnızca sorumlu hekimi siz olan kayıtlar gösterilir; planlı randevular bu görünümde yer almaz.</p>
            }
        }

        @if (loading()) {
            <app-loading-state message="Bugün yükleniyor…" />
        } @else if (loadError(); as error) {
            <div class="card">
                <app-error-state [detail]="error" (retry)="refresh('initial')" />
            </div>
        } @else {
            @if (refreshError()) {
                <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">{{ refreshError() }}</p>
            }
            @if (ro.mutationBlocked()) {
                <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">
                    İşletme salt okunur moddadır; değişiklik kaydedilemez.
                </p>
            }
            @for (group of groups(); track group.key) {
                <section class="card mb-4" [attr.aria-label]="group.title">
                    <div class="font-medium mb-3 flex items-center gap-2">
                        <span>{{ group.title }}</span>
                        <span class="text-xs rounded-full px-2 py-0.5 bg-surface-100 dark:bg-surface-800 text-muted-color" [attr.aria-label]="group.items.length + ' kayıt'">{{ group.items.length }}</span>
                    </div>
                    @if (compact()) {
                        <div class="flex flex-col gap-3" data-testid="today-cards">
                            @for (item of group.items; track item.key) {
                                <article class="rounded-border border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 p-3 min-w-0" data-testid="today-card">
                                    <div class="flex items-start justify-between gap-2 mb-2">
                                        <div class="text-sm font-medium">
                                            @if (item.arrivedAtUtc) {
                                                <div>Geliş {{ time(item.arrivedAtUtc) }}</div>
                                                @if (item.scheduledAtUtc) {
                                                    <div class="text-muted-color">Randevu {{ time(item.scheduledAtUtc) }}</div>
                                                }
                                            } @else {
                                                <div>Randevu {{ time(item.scheduledAtUtc) }}</div>
                                            }
                                        </div>
                                        <div class="min-w-0 flex justify-end">
                                            <ng-container *ngTemplateOutlet="statusTags; context: { $implicit: item, group: group }" />
                                        </div>
                                    </div>
                                    <div class="font-medium flex flex-wrap items-center gap-2 min-w-0">
                                        <span class="break-words min-w-0">{{ item.petName }}</span>
                                        <app-pet-alert-badges class="shrink-0" [alerts]="item.petAlerts" />
                                        @if (item.isUrgent) {
                                            <app-status-tag class="shrink-0" label="Acil" severity="danger" />
                                        }
                                    </div>
                                    <div class="text-sm text-muted-color">{{ item.speciesName }}</div>
                                    <dl class="m-0 mt-2 grid grid-cols-[4.5rem_1fr] gap-x-2 gap-y-1 text-sm">
                                        <dt class="text-muted-color">Sahip</dt>
                                        <dd class="m-0 min-w-0 break-words">
                                            {{ item.clientName }}
                                            @if (item.clientPhone) {
                                                <span class="text-muted-color whitespace-nowrap"> · {{ phone(item.clientPhone) }}</span>
                                            }
                                        </dd>
                                        <dt class="text-muted-color">Hekim</dt>
                                        <dd class="m-0 min-w-0 break-words">{{ item.responsibleVeterinarianName ?? 'Atanmadı' }}</dd>
                                        @if (group.key !== 'noShow' || item.hasActiveHospitalization) {
                                            <dt class="text-muted-color">Ödeme</dt>
                                            <dd class="m-0 flex flex-wrap gap-1">
                                                <ng-container *ngTemplateOutlet="moneyTags; context: { $implicit: item, group: group }" />
                                            </dd>
                                        }
                                        @if (group.elapsedLabel) {
                                            @let wait = waitAlertOf(item);
                                            <dt class="text-muted-color">{{ group.elapsedLabel }}</dt>
                                            <dd class="m-0" [class]="waitAlertClass[wait]" [attr.title]="waitTitle(wait)">
                                                @if (wait !== 'none') {
                                                    <i class="pi pi-fw" [class]="waitAlertIcon[wait]" aria-hidden="true"></i>
                                                    <span class="sr-only">{{ waitTitle(wait) }}:</span>
                                                }
                                                {{ elapsed(item) ?? '—' }}
                                                @if (possiblyForgotten(item)) {
                                                    <div class="text-xs font-normal text-muted-color">Unutulmuş olabilir</div>
                                                }
                                            </dd>
                                        }
                                    </dl>
                                    <!-- Kartta düğme etiketleri açık kalır (tablodaki dar kip yalnız simge gösterir) -->
                                    <div class="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-surface-200 dark:border-surface-700 [&_.p-button-label]:inline!">
                                        <ng-container *ngTemplateOutlet="actionButtons; context: { $implicit: item }" />
                                    </div>
                                </article>
                            }
                        </div>
                    } @else {
                        <div class="@container overflow-x-auto">
                        <p-table [value]="group.items" dataKey="key" styleClass="p-datatable-sm" [tableStyle]="{ 'table-layout': 'fixed' }">
                            <ng-template #colgroup>
                                <colgroup>
                                    @for (cls of columnClasses; track $index) {
                                        <col [class]="cls" />
                                    }
                                </colgroup>
                            </ng-template>
                            <ng-template #header>
                                <tr>
                                    <th class="whitespace-nowrap">Saat</th>
                                    <th class="whitespace-nowrap">Hasta</th>
                                    <th class="whitespace-nowrap">Sahip</th>
                                    <th class="whitespace-nowrap @max-[76rem]:hidden">Hekim</th>
                                    <th class="whitespace-nowrap">Durum</th>
                                    <th class="whitespace-nowrap @max-[76rem]:hidden">Ödeme / yatış</th>
                                    <th class="whitespace-nowrap">{{ group.elapsedLabel }}</th>
                                    <th></th>
                                </tr>
                            </ng-template>
                            <ng-template #body let-item>
                                <tr>
                                    <td>
                                        @if (item.arrivedAtUtc) {
                                            <div>Geliş {{ time(item.arrivedAtUtc) }}</div>
                                            @if (item.scheduledAtUtc) {
                                                <div class="text-sm text-muted-color">Randevu {{ time(item.scheduledAtUtc) }}</div>
                                            }
                                        } @else {
                                            <div>Randevu {{ time(item.scheduledAtUtc) }}</div>
                                        }
                                    </td>
                                    <td>
                                        <div class="font-medium flex items-center gap-2 min-w-0">
                                            <span class="line-clamp-2 break-words min-w-0" [attr.title]="item.petName">{{ item.petName }}</span>
                                            <app-pet-alert-badges class="shrink-0" [alerts]="item.petAlerts" />
                                            @if (item.isUrgent) {
                                                <app-status-tag class="shrink-0" label="Acil" severity="danger" />
                                            }
                                        </div>
                                        <div class="text-sm text-muted-color truncate" [attr.title]="item.speciesName">{{ item.speciesName }}</div>
                                        <!-- Dar kipte Hekim sütunu yok: ad burada görünür -->
                                        <div class="text-sm text-muted-color truncate @min-[76rem]:hidden" [attr.title]="item.responsibleVeterinarianName ?? 'Atanmadı'">
                                            {{ item.responsibleVeterinarianName ?? 'Atanmadı' }}
                                        </div>
                                    </td>
                                    <td>
                                        <div class="line-clamp-2 break-words" [attr.title]="item.clientName">{{ item.clientName }}</div>
                                        @if (item.clientPhone) {
                                            <div class="text-sm text-muted-color whitespace-nowrap">{{ phone(item.clientPhone) }}</div>
                                        }
                                    </td>
                                    <td class="truncate @max-[76rem]:hidden" [attr.title]="item.responsibleVeterinarianName">
                                        @if (item.responsibleVeterinarianName; as vet) {
                                            {{ vet }}
                                        } @else {
                                            <span class="text-muted-color">Atanmadı</span>
                                        }
                                    </td>
                                    <td class="whitespace-nowrap">
                                        <ng-container *ngTemplateOutlet="statusTags; context: { $implicit: item, group: group }" />
                                        <!-- Dar kipte Ödeme / yatış sütunu yok: rozetler burada -->
                                        <div class="flex flex-wrap gap-1 mt-1 @min-[76rem]:hidden">
                                            <ng-container *ngTemplateOutlet="moneyTags; context: { $implicit: item, group: group }" />
                                        </div>
                                    </td>
                                    <td class="whitespace-nowrap @max-[76rem]:hidden">
                                        <div class="flex flex-wrap gap-1">
                                            <ng-container *ngTemplateOutlet="moneyTags; context: { $implicit: item, group: group }" />
                                        </div>
                                    </td>
                                    @let wait = waitAlertOf(item);
                                    <td [class]="waitAlertClass[wait]" [attr.title]="waitTitle(wait)">
                                        @if (group.elapsedLabel) {
                                            @if (wait !== 'none') {
                                                <i class="pi pi-fw" [class]="waitAlertIcon[wait]" aria-hidden="true"></i>
                                                <span class="sr-only">{{ waitTitle(wait) }}:</span>
                                            }
                                            {{ elapsed(item) ?? '—' }}
                                            @if (possiblyForgotten(item)) {
                                                <div class="text-xs font-normal text-muted-color">Unutulmuş olabilir</div>
                                            }
                                        }
                                    </td>
                                    <td class="whitespace-nowrap">
                                        <!-- Sabit yuvalar: birincil | ikincil | acil | ⋯ → düğmeler satırlar arasında aynı hizada -->
                                        <div class="grid grid-cols-[7.5rem_6rem_1.85rem_1.85rem] @max-[50rem]:grid-cols-[2.5rem_2.5rem_1.85rem_1.85rem] items-center gap-2 justify-start">
                                            <ng-container *ngTemplateOutlet="actionButtons; context: { $implicit: item }" />
                                        </div>
                                    </td>
                                </tr>
                            </ng-template>
                        </p-table>
                        </div>
                    }
                </section>
            } @empty {
                <div class="card">
                    @if (scope() === 'mine') {
                        <app-empty-state
                            [message]="view() === 'voided' ? 'Size atanmış yanlış işaretlenen geliş yok.' : 'Size atanmış hasta yok.'"
                            hint="Tüm sırayı görmek için Tümü’ne geçin."
                            iconClass="pi pi-user"
                        />
                        <div class="flex justify-center mt-3">
                            <p-button type="button" label="Tümü’ne geç" icon="pi pi-list" severity="secondary" (onClick)="setScope('all')" />
                        </div>
                    } @else {
                        <app-empty-state
                            [message]="view() === 'voided' ? 'Bugün yanlış işaretlenen geliş yok.' : 'Bugün için randevu veya gelen hasta yok.'"
                            [hint]="view() === 'voided' ? '' : 'Randevusuz gelen hastayı “Randevusuz geliş” ile kaydedebilirsiniz.'"
                            iconClass="pi pi-calendar"
                        />
                    }
                </div>
            }
        }

        @if (!loading() && !loadError() && hospitalizations().length > 0) {
            <section class="card mb-4" aria-label="Aktif yatışlar">
                <div class="font-medium mb-3 flex items-center gap-2">
                    <span>Aktif yatışlar</span>
                    <span class="text-xs rounded-full px-2 py-0.5 bg-surface-100 dark:bg-surface-800 text-muted-color" [attr.aria-label]="hospitalizations().length + ' kayıt'">{{ hospitalizations().length }}</span>
                </div>
                <p-table [value]="hospitalizations()" dataKey="hospitalizationId" styleClass="p-datatable-sm">
                    <ng-template #header>
                        <tr>
                            <th>Hasta</th>
                            <th>Sahip</th>
                            <th class="whitespace-nowrap">Giriş</th>
                            <th class="whitespace-nowrap">Yatış süresi</th>
                            <th class="whitespace-nowrap">Planlı taburcu</th>
                            @if (canReadHospitalization) {
                                <th></th>
                            }
                        </tr>
                    </ng-template>
                    <ng-template #body let-h>
                        <tr>
                            <td class="font-medium">{{ h.petName }}</td>
                            <td>{{ h.clientName }}</td>
                            <td class="whitespace-nowrap">{{ admittedAt(h.admittedAtUtc) }}</td>
                            <td class="whitespace-nowrap">{{ stay(h.admittedAtUtc) ?? '—' }}</td>
                            <td class="whitespace-nowrap">{{ h.plannedDischargeAtUtc ? date(h.plannedDischargeAtUtc) : '—' }}</td>
                            @if (canReadHospitalization) {
                                <td class="text-right">
                                    <a [routerLink]="['/panel/hospitalizations', h.hospitalizationId]" class="p-button p-button-text p-button-sm">Yatış detayı</a>
                                </td>
                            }
                        </tr>
                    </ng-template>
                </p-table>
            </section>
        }

        <ng-template #statusTags let-item let-group="group">
            <div class="flex flex-wrap gap-1">
                @if (item.careStatus; as status) {
                    <app-status-tag [label]="statusLabel(status)" [severity]="statusSeverity(status)" />
                } @else if (item.appointmentStatus === 'NoShow') {
                    @if (group.key !== 'noShow') {
                        <app-status-tag label="Gelmedi" severity="warn" />
                    }
                } @else if (item.appointmentStatus === 'Completed') {
                    <app-status-tag label="Randevu tamamlandı" severity="secondary" />
                } @else {
                    <app-status-tag label="Bekleniyor" severity="secondary" />
                }
                @if (item.isVoided) {
                    <app-status-tag label="Yanlış geliş" severity="danger" />
                }
                @if (item.isCarriedOver) {
                    <span [attr.title]="carriedOverTitle">
                        <app-status-tag label="Önceki günden" severity="secondary" />
                    </span>
                }
            </div>
            @if (item.voidReason; as reason) {
                <div class="text-sm text-muted-color mt-1 whitespace-normal">Gerekçe: {{ reason }}</div>
            }
        </ng-template>

        <ng-template #moneyTags let-item let-group="group">
            @if (group.key !== 'noShow') {
                <app-today-money [item]="item" />
            }
            @if (item.hasActiveHospitalization) {
                <app-status-tag label="Yatışta" severity="warn" />
            }
        </ng-template>

        <ng-template #actionButtons let-item>
            @let actions = actionsOf(item);
            @if (canCreateVisit && actions.canMarkArrived) {
                <p-button
                    type="button"
                    class="col-start-1 @max-[50rem]:[&_.p-button-label]:hidden"
                    styleClass="w-full"
                    label="Geldi"
                    ariaLabel="Geldi"
                    [attr.title]="'Geldi'"
                    icon="pi pi-sign-in"
                    size="small"
                    [disabled]="ro.mutationBlocked()"
                    (onClick)="openAppointmentArrival(item)"
                />
            }
            @if (canCreateExamination && actions.canOpenExamination) {
                <p-button
                    type="button"
                    class="col-start-1 @max-[50rem]:[&_.p-button-label]:hidden"
                    styleClass="w-full"
                    label="Muayene aç"
                    ariaLabel="Muayene aç"
                    [attr.title]="'Muayene aç'"
                    icon="pi pi-file-edit"
                    size="small"
                    [disabled]="ro.mutationBlocked()"
                    (onClick)="openExamination(item)"
                />
            }
            @if (canUpdateVisit && actions.canStartCare) {
                <p-button
                    type="button"
                    class="col-start-2 @max-[50rem]:[&_.p-button-label]:hidden"
                    styleClass="w-full"
                    label="Başlat"
                    ariaLabel="Başlat"
                    [attr.title]="'Başlat'"
                    icon="pi pi-play"
                    size="small"
                    severity="secondary"
                    [loading]="isBusy(item)"
                    [disabled]="isBusy(item) || ro.mutationBlocked()"
                    (onClick)="transition(item, 'start')"
                />
            }
            @if (canUpdateVisit && actions.canCompleteCare) {
                <p-button
                    type="button"
                    class="col-start-2 @max-[50rem]:[&_.p-button-label]:hidden"
                    styleClass="w-full"
                    label="Tamamla"
                    ariaLabel="Tamamla"
                    [attr.title]="'Tamamla'"
                    icon="pi pi-check"
                    size="small"
                    severity="secondary"
                    [loading]="isBusy(item)"
                    [disabled]="isBusy(item) || ro.mutationBlocked()"
                    (onClick)="transition(item, 'complete')"
                />
            }
            @let urgency = urgencyToggleOf(item, actions);
            @if (urgency) {
                <p-button
                    type="button"
                    class="col-start-3"
                    icon="pi pi-exclamation-triangle"
                    size="small"
                    [severity]="urgency.pressed ? 'danger' : 'secondary'"
                    [text]="!urgency.pressed"
                    [rounded]="true"
                    [ariaLabel]="urgency.label"
                    [attr.title]="urgency.label"
                    [attr.aria-pressed]="urgency.pressed"
                    [loading]="isBusy(item)"
                    [disabled]="isBusy(item) || ro.mutationBlocked()"
                    (onClick)="toggleUrgency(item)"
                />
            }
            @let more = secondaryActionsOf(item, actions);
            @if (more.length > 0) {
                <p-button
                    type="button"
                    class="col-start-4"
                    icon="pi pi-ellipsis-h"
                    size="small"
                    severity="secondary"
                    [text]="true"
                    [rounded]="true"
                    ariaLabel="Diğer işlemler"
                    [attr.title]="'Diğer işlemler'"
                    aria-haspopup="menu"
                    (onClick)="openRowMenu($event, item, more)"
                />
            }
        </ng-template>

        <p-menu #rowMenu [popup]="true" [model]="rowMenuItems()" appendTo="body" (onHide)="openPendingPayment()" />
        @if (canCreateVisit) {
            <app-visit-arrival-dialog [(visible)]="arrivalOpen" [appointment]="arrivalAppointment()" (arrived)="onArrived($event)" />
        }
        @if (canNoShow) {
            <app-appointment-no-show-dialog [(visible)]="noShowOpen" [appointmentId]="noShowItem()?.appointmentId ?? null" [mode]="noShowMode()" [subject]="noShowSubject()" (done)="onNoShowDone()" />
        }
        @if (canCorrect) {
            <app-visit-correction-dialog [(visible)]="correctionOpen" [item]="correctionItem()" (corrected)="onCorrected()" />
            <app-visit-correction-dialog mode="restore" [(visible)]="restoreOpen" [item]="restoreItem()" (corrected)="onRestored()" />
        }
    `
})
export class TodayPageComponent implements OnInit {
    readonly copy = PANEL_COPY;

    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly messages = inject(MessageService);
    private readonly visitsService = inject(VisitsService);
    private readonly destroyRef = inject(DestroyRef);
    readonly ro = inject(TenantReadOnlyContextService);

    /** Dar ekranda (<= 40rem) satırlar tablo yerine kart olarak gösterilir. */
    readonly compact = signal(false);

    readonly canCreateVisit = this.auth.hasOperationClaim(VISITS_CREATE_CLAIM);
    readonly canUpdateVisit = this.auth.hasOperationClaim(VISITS_UPDATE_CLAIM);
    readonly canCorrect = this.auth.hasOperationClaim(VISITS_CORRECT_CLAIM);
    readonly canNoShow = this.auth.hasOperationClaim(APPOINTMENTS_NOSHOW_CLAIM);
    readonly canReadHospitalization = this.auth.hasOperationClaim(HOSPITALIZATIONS_READ_CLAIM);
    readonly canCreateExamination = this.auth.hasOperationClaim(EXAMINATIONS_CREATE_CLAIM);
    readonly canCollectPayment = this.auth.hasOperationClaim(PAYMENTS_CREATE_CLAIM);

    readonly loading = signal(true);
    /** İlk yükleme / elle yenileme hatası: listeyi değiştirir. */
    readonly loadError = signal<string | null>(null);
    /** Otomatik yenileme hatası: eski liste kalır, yalnızca uyarı gösterilir. */
    readonly refreshError = signal<string | null>(null);
    readonly today = signal<TodayVm | null>(null);
    readonly hospitalizations = computed(() => this.today()?.activeHospitalizations ?? []);
    readonly groups = computed(() => groupTodayItems(this.today()?.items ?? []));

    /** Bekleme süresini canlı tutan saat (her yenilemede güncellenir). */
    private readonly now = signal(new Date());
    private readonly busyKeys = signal<ReadonlySet<string>>(new Set());

    readonly arrivalOpen = signal(false);
    readonly arrivalAppointment = signal<TodayItemVm | null>(null);
    readonly correctionOpen = signal(false);
    readonly correctionItem = signal<TodayItemVm | null>(null);
    readonly restoreOpen = signal(false);
    readonly restoreItem = signal<TodayItemVm | null>(null);
    private readonly rowMenu = viewChild<Menu>('rowMenu');
    readonly rowMenuItems = signal<MenuItem[]>([]);
    /** Menü kapanış animasyonu bitmeden sayfa değişirse kaplama gövdede asılı kalır; ödeme sayfasına menü kapandıktan sonra gidilir. */
    private readonly paymentAfterMenu = signal<TodayItemVm | null>(null);
    readonly noShowOpen = signal(false);
    readonly noShowItem = signal<TodayItemVm | null>(null);
    readonly noShowMode = signal<'mark' | 'revert'>('mark');
    readonly noShowSubject = computed(() => {
        const i = this.noShowItem();
        return i ? `${i.petName} · ${i.clientName} · Randevu ${this.time(i.scheduledAtUtc)}` : '';
    });

    readonly viewOptions: Array<{ label: string; value: TodayView }> = [
        { label: 'Bugün', value: 'today' },
        { label: 'Yanlış işaretlenenler', value: 'voided' }
    ];
    readonly view = signal<TodayView>('today');
    readonly scopeOptions: Array<{ label: string; value: TodayScope }> = [
        { label: 'Benim hastalarım', value: 'mine' },
        { label: 'Tümü', value: 'all' }
    ];
    readonly scope = signal<TodayScope>('all');
    /** Giriş yapan kullanıcı aktif klinikte hekimse kimliği; değilse `null` ve kapsam süzgeci görünmez. */
    readonly myUserId = signal<string | null>(null);

    /** `switchMap`: üst üste gelen yenilemelerde yalnızca sonuncunun yanıtı uygulanır. */
    private readonly refresh$ = new Subject<RefreshMode>();

    readonly statusLabel = careStatusLabel;
    readonly statusSeverity = careStatusSeverity;
    readonly phone = formatClientPhoneForDisplay;
    readonly actionsOf = (item: TodayItemVm) => todayItemActions(item, this.now());
    readonly waitTitle = waitAlertTitle;
    /**
     * Tüm grup tabloları aynı sütun şablonunu kullanır (hizalı başlıklar): Saat, Hasta, Sahip, Hekim, Durum, Ödeme/yatış, Süre, Eylemler.
     * Üç kip, tablo kapsayıcısının genişliğine göre (kapsayıcı sorgusu; ekran/yakınlaştırma değil):
     * geniş (≥72 rem): tüm sütunlar, yazılı düğmeler; orta (50–72 rem): Hekim ve Ödeme/yatış sütunları gizlenir (bilgi Hasta ve Durum
     * hücrelerine taşınır), düğmeler yine yazılı; dar (<50 rem): düğmeler yalnız ikon (aria-label + ipucu). Hasta/Sahip adı en çok 2 satıra
     * sarar (tam ad ipucunda); Sahip kalan genişliği alır, telefon tek satır; tablo yatay taşmaz. Sınıflar tam yazılmalı (Tailwind kaynaktan tarar).
     */
    protected readonly columnClasses = [
        'w-[6rem]',
        'w-[9rem]',
        'w-auto',
        'w-[7rem] @max-[76rem]:hidden',
        'w-[8.5rem] @max-[76rem]:w-[9rem]',
        'w-[11rem] @max-[76rem]:hidden',
        'w-[7.5rem]',
        'w-[20rem] @max-[50rem]:w-[12rem]'
    ];
    protected readonly carriedOverTitle = 'Önceki günden kalan açık geliş; tamamlayın veya hatalı işaretleyin';
    readonly waitAlertClass: Record<WaitAlertLevel, string> = {
        none: '',
        warning: 'font-semibold text-orange-600 dark:text-orange-400',
        critical: 'font-semibold text-red-600 dark:text-red-400'
    };
    readonly waitAlertIcon: Record<WaitAlertLevel, string> = {
        none: '',
        warning: 'pi-clock',
        critical: 'pi-exclamation-triangle'
    };

    ngOnInit(): void {
        this.watchCompactViewport();
        this.refresh$
            .pipe(
                switchMap((mode) =>
                    this.visitsService.getToday(this.todayQuery()).pipe(
                        map((today): RefreshResult => ({ mode, today })),
                        catchError((e: unknown) => of({ mode, error: panelHttpFailureMessage(e, 'Bugün listesi yüklenemedi.') }))
                    )
                ),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((result) => this.applyResult(result));
        timer(REFRESH_INTERVAL_MS, REFRESH_INTERVAL_MS)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.refresh('silent'));
        this.startWithScope();
    }

    private watchCompactViewport(): void {
        const query = window.matchMedia(COMPACT_MEDIA_QUERY);
        const update = () => this.compact.set(query.matches);
        update();
        query.addEventListener('change', update);
        this.destroyRef.onDestroy(() => query.removeEventListener('change', update));
    }

    refresh(mode: RefreshMode): void {
        if (mode === 'initial') {
            this.loading.set(true);
        }
        this.refresh$.next(mode);
    }

    time(utc: string | null): string {
        return formatUtcIsoAsLocalTimeDisplay(utc);
    }

    date(utc: string | null): string {
        return formatUtcIsoAsLocalDateDisplay(utc);
    }

    admittedAt(utc: string): string {
        return `${this.date(utc)} ${this.time(utc)}`;
    }

    stay(admittedAtUtc: string): string | null {
        return formatHospitalizationStay(admittedAtUtc, this.now());
    }

    /** Yalnızca açık (bekleyen / devam eden) satırlarda gelişten bu yana geçen süre. */
    elapsed(item: TodayItemVm): string | null {
        return item.careStatus === 'Waiting' || item.careStatus === 'InProgress'
            ? formatElapsedSince(item.arrivedAtUtc, this.now())
            : null;
    }

    possiblyForgotten(item: TodayItemVm): boolean {
        return isPossiblyForgottenVisit(item, this.now());
    }

    waitAlertOf(item: TodayItemVm): WaitAlertLevel {
        return waitAlertLevel(item, this.now());
    }

    isBusy(item: TodayItemVm): boolean {
        return this.busyKeys().has(item.key);
    }

    openWalkInArrival(): void {
        this.arrivalAppointment.set(null);
        this.arrivalOpen.set(true);
    }

    openAppointmentArrival(item: TodayItemVm): void {
        this.arrivalAppointment.set(item);
        this.arrivalOpen.set(true);
    }

    onArrived({ created }: VisitCreateResultVm): void {
        addTracedToast(
            this.messages,
            'TodayPage',
            this.router.url,
            created
                ? { severity: 'success', summary: 'Geliş kaydedildi.', life: 4000 }
                : {
                      severity: 'info',
                      summary: 'Açık geliş kaydı zaten var.',
                      detail: 'Yeni kayıt açılmadı; mevcut kayıt listede.',
                      life: 6000
                  }
        );
        this.refresh('silent');
    }

    setScope(scope: TodayScope): void {
        this.scope.set(scope);
        this.refresh('initial');
    }

    /** Hekimse varsayılan "Benim hastalarım"; ilk yükleme kapsam belli olunca yapılır (çift istek / yanıp sönme yok). */
    private startWithScope(): void {
        if (!this.canCreateVisit) {
            this.refresh('initial');
            return;
        }
        this.visitsService
            .getCurrentVeterinarianUserId()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((userId) => {
                this.myUserId.set(userId);
                this.scope.set(userId ? 'mine' : 'all');
                this.refresh('initial');
            });
    }

    private todayQuery(): TodayQuery {
        const mine = this.scope() === 'mine' ? this.myUserId() : null;
        return { voided: this.view() === 'voided', ...(mine ? { responsibleVeterinarianUserId: mine } : {}) };
    }

    setView(view: TodayView): void {
        this.view.set(view);
        this.refresh('initial');
    }

    private rowPermissions(): TodayRowPermissions {
        return { canUpdateVisit: this.canUpdateVisit, canNoShow: this.canNoShow, canCorrect: this.canCorrect, canCollectPayment: this.canCollectPayment };
    }

    urgencyToggleOf(item: TodayItemVm, actions: TodayItemActions): TodayUrgencyToggle | null {
        return todayUrgencyToggle(item, actions, this.rowPermissions());
    }

    secondaryActionsOf(item: TodayItemVm, actions: TodayItemActions): TodaySecondaryAction[] {
        return todaySecondaryActions(item, actions, this.rowPermissions());
    }

    /** Seyrek/düzeltme eylemleri tek "⋯" menüsünde; PrimeNG popup menü klavye ile açılır/gezilir. */
    openRowMenu(event: Event, item: TodayItemVm, actions: TodaySecondaryAction[]): void {
        const handlers: Record<TodaySecondaryActionKey, () => void> = {
            markNoShow: () => this.openNoShow(item, 'mark'),
            revertNoShow: () => this.openNoShow(item, 'revert'),
            restore: () => this.openRestore(item),
            correct: () => this.openCorrection(item),
            collectPayment: () => this.paymentAfterMenu.set(item)
        };
        const blocked = this.ro.mutationBlocked() || this.isBusy(item);
        this.rowMenuItems.set(actions.map((a) => ({ label: a.label, icon: a.icon, disabled: blocked, command: handlers[a.key] })));
        this.rowMenu()?.toggle(event);
    }
    openNoShow(item: TodayItemVm, mode: 'mark' | 'revert'): void {
        this.noShowItem.set(item);
        this.noShowMode.set(mode);
        this.noShowOpen.set(true);
    }

    onNoShowDone(): void {
        addTracedToast(this.messages, 'TodayPage', this.router.url, {
            severity: 'success',
            summary: this.noShowMode() === 'mark' ? 'Randevu gelmedi olarak işaretlendi.' : 'Gelmedi işareti geri alındı.',
            life: 4000
        });
        this.refresh('silent');
    }

    openRestore(item: TodayItemVm): void {
        this.restoreItem.set(item);
        this.restoreOpen.set(true);
    }

    onRestored(): void {
        addTracedToast(this.messages, 'TodayPage', this.router.url, { severity: 'success', summary: 'Geliş geri alındı.', life: 4000 });
        this.refresh('silent');
    }

    openCorrection(item: TodayItemVm): void {
        this.correctionItem.set(item);
        this.correctionOpen.set(true);
    }

    onCorrected(): void {
        addTracedToast(this.messages, 'TodayPage', this.router.url, { severity: 'success', summary: 'Düzeltme kaydedildi.', life: 4000 });
        this.refresh('silent');
    }

    /** Sıralamayı sunucu belirler: istemci yeniden sıralamaz, yalnızca yeniler. Hatada da yenilenir. */
    toggleUrgency(item: TodayItemVm): void {
        const visitId = item.visitId;
        if (!visitId || this.isBusy(item)) {
            return;
        }
        this.setBusy(item.key, true);
        this.visitsService.setUrgency(visitId, !item.isUrgent).subscribe({
            next: () => {
                this.setBusy(item.key, false);
                this.refresh('silent');
            },
            error: (e: unknown) => {
                this.setBusy(item.key, false);
                addTracedToast(this.messages, 'TodayPage', this.router.url, {
                    severity: 'error',
                    summary: 'Acil işareti güncellenemedi.',
                    detail: panelHttpFailureMessage(e, 'Acil işareti güncellenemedi.'),
                    life: 6000
                });
                this.refresh('silent');
            }
        });
    }

    /** Hasta tekrar seçilmez: Visit kimliği ve hasta bağlamı muayene çalışma alanına query ile taşınır. */
    openExamination(item: TodayItemVm): void {
        void this.router.navigate(['/panel/examinations/new'], {
            queryParams: { visitId: item.visitId, clientId: item.clientId, petId: item.petId }
        });
    }

    /** Müşteri ve (varsa) geliş bağlamı ödeme formuna taşınır; o gelişin açık ücretleri dolu gelir. */
    openPendingPayment(): void {
        const item = this.paymentAfterMenu();
        this.paymentAfterMenu.set(null);
        if (item) {
            this.openPayment(item);
        }
    }

    openPayment(item: TodayItemVm): void {
        void this.router.navigate(['/panel/payments/new'], { queryParams: { clientId: item.clientId, visitId: item.visitId } });
    }

    /** Satır kilitliyken ikinci istek gitmez; hatada da liste yenilenir (durum başkası tarafından değişmiş olabilir). */
    transition(item: TodayItemVm, kind: 'start' | 'complete'): void {
        const visitId = item.visitId;
        if (!visitId || this.isBusy(item)) {
            return;
        }
        this.setBusy(item.key, true);
        const call$ = kind === 'start' ? this.visitsService.startVisit(visitId) : this.visitsService.completeVisit(visitId);
        call$.subscribe({
            next: () => {
                this.setBusy(item.key, false);
                addTracedToast(this.messages, 'TodayPage', this.router.url, {
                    severity: 'success',
                    summary: kind === 'start' ? 'Bakım başlatıldı.' : 'Bakım tamamlandı.',
                    life: 3000
                });
                this.refresh('silent');
            },
            error: (e: unknown) => {
                this.setBusy(item.key, false);
                addTracedToast(this.messages, 'TodayPage', this.router.url, {
                    severity: 'error',
                    summary: 'İşlem yapılamadı.',
                    detail: panelHttpFailureMessage(e, 'İşlem yapılamadı.'),
                    life: 6000
                });
                this.refresh('silent');
            }
        });
    }

    private applyResult(result: RefreshResult): void {
        if ('error' in result) {
            if (result.mode === 'initial') {
                this.loadError.set(result.error);
            } else {
                this.refreshError.set('Liste güncellenemedi; son yüklenen veriler gösteriliyor.');
            }
        } else {
            this.today.set(result.today);
            this.loadError.set(null);
            this.refreshError.set(null);
        }
        this.now.set(new Date());
        this.loading.set(false);
    }

    private setBusy(key: string, busy: boolean): void {
        this.busyKeys.update((keys) => {
            const next = new Set(keys);
            if (busy) {
                next.add(key);
            } else {
                next.delete(key);
            }
            return next;
        });
    }
}

type RefreshResult = { mode: RefreshMode; today: TodayVm } | { mode: RefreshMode; error: string };

