import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatDateDisplay } from '@/app/shared/utils/date.utils';
import type { SubscriptionSummaryVm } from '@/app/features/subscriptions/models/subscription-vm.model';
import { SubscriptionsService } from '@/app/features/subscriptions/services/subscriptions.service';
import { subscriptionStatusLabel, subscriptionStatusSeverity } from '@/app/features/subscriptions/utils/subscription-status.utils';

@Component({
    selector: 'app-subscription-page',
    standalone: true,
    imports: [
        CommonModule,
        ButtonModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppEmptyStateComponent,
        AppStatusTagComponent
    ],
    template: `
        <app-page-header
            title="Abonelik"
            subtitle="Paket & Deneme"
            description="Kiracı abonelik özeti; bu faz yalnız görünürlük ekranını içerir."
        />

        @if (loading()) {
            <app-loading-state message="Abonelik özeti yükleniyor…" />
        } @else if (error(); as err) {
            <div class="card">
                <app-error-state title="Abonelik özeti alınamadı" [detail]="err" (retry)="reload()" />
            </div>
        } @else if (summary(); as s) {
            <div class="grid grid-cols-12 gap-6">
                <div class="col-span-12">
                    <div class="card mb-0">
                        <h5 class="mt-0 mb-4">Tenant özeti</h5>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div class="min-w-0">
                                <div class="text-muted-color text-sm mb-1">Tenant</div>
                                <div class="font-medium break-words">{{ s.tenantName }}</div>
                                <div class="text-xs text-muted-color mt-1 break-all">{{ s.tenantId || '—' }}</div>
                            </div>
                            <div class="min-w-0">
                                <div class="text-muted-color text-sm mb-1">Mevcut plan</div>
                                <div class="font-medium break-words">{{ s.planName }}</div>
                                <div class="text-xs text-muted-color mt-1 break-all">{{ s.planCode || '—' }}</div>
                            </div>
                            <div class="min-w-0">
                                <div class="text-muted-color text-sm mb-1">Status</div>
                                <app-status-tag [label]="statusLabel(s)" [severity]="statusSeverity(s)" />
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-span-12 lg:col-span-6">
                    <div class="card mb-0 h-full">
                        <h5 class="mt-0 mb-4">Deneme dönemi</h5>
                        <div class="flex flex-col gap-3">
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-muted-color">Başlangıç</span>
                                <span class="font-medium text-right">{{ formatDate(s.trialStartsAtUtc) }}</span>
                            </div>
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-muted-color">Bitiş</span>
                                <span class="font-medium text-right">{{ formatDate(s.trialEndsAtUtc) }}</span>
                            </div>
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-muted-color">Kalan gün</span>
                                <span class="font-medium text-right">{{ daysRemainingText(s.daysRemaining) }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-span-12 lg:col-span-6">
                    <div class="card mb-0 h-full">
                        <h5 class="mt-0 mb-4">Erişim durumu</h5>
                        <div class="flex flex-col gap-3 mb-4">
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-muted-color">Read-only</span>
                                <span class="font-medium">{{ boolText(s.isReadOnly) }}</span>
                            </div>
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-muted-color">Yönetebilir</span>
                                <span class="font-medium">{{ boolText(s.canManageSubscription) }}</span>
                            </div>
                        </div>
                        @if (s.canManageSubscription) {
                            <div class="p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                                <p class="m-0 text-sm text-color">Owner/admin için abonelik yönetim alanı sonraki fazda aktif olacak.</p>
                            </div>
                        } @else {
                            <div class="p-3 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
                                <p class="m-0 text-sm text-color">Bu hesapta abonelik bilgisi yalnız görüntülenebilir.</p>
                            </div>
                        }
                    </div>
                </div>

                <div class="col-span-12">
                    <div class="card mb-0">
                        <h5 class="mt-0 mb-4">Kullanılabilir planlar</h5>
                        @if (s.availablePlans.length === 0) {
                            <app-empty-state message="Plan listesi bulunamadı." />
                        } @else {
                            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                @for (plan of s.availablePlans; track plan.code) {
                                    <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3 min-w-0">
                                        <div class="font-medium break-words">{{ plan.name }}</div>
                                        <div class="text-sm text-muted-color break-all">{{ plan.code }}</div>
                                        @if (plan.description) {
                                            <p class="mt-2 mb-0 text-sm text-color break-words">{{ plan.description }}</p>
                                        }
                                    </div>
                                }
                            </div>
                        }
                    </div>
                </div>

                <div class="col-span-12">
                    <div class="card mb-0">
                        <h5 class="mt-0 mb-3">Faz 1 notu</h5>
                        <ul class="m-0 pl-4 text-sm text-muted-color flex flex-col gap-1">
                            <li>Bu fazda ödeme entegrasyonu henüz aktif değil.</li>
                            <li>Paket değiştirme / ödeme akışı sonraki fazda eklenecek.</li>
                        </ul>
                    </div>
                </div>
            </div>
        } @else {
            <div class="card">
                <app-empty-state message="Abonelik özeti bulunamadı." />
            </div>
        }
    `
})
export class SubscriptionPageComponent implements OnInit {
    private readonly subscriptions = inject(SubscriptionsService);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly summary = signal<SubscriptionSummaryVm | null>(null);
    readonly formatDate = (v: string | null | undefined) => formatDateDisplay(v);

    ngOnInit(): void {
        this.reload();
    }

    reload(): void {
        this.loading.set(true);
        this.error.set(null);
        this.subscriptions.getSubscriptionSummary().subscribe({
            next: (data) => {
                this.summary.set(data);
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.summary.set(null);
                this.error.set(e instanceof Error ? e.message : 'Abonelik özeti alınamadı.');
                this.loading.set(false);
            }
        });
    }

    statusLabel(summary: SubscriptionSummaryVm): string {
        return subscriptionStatusLabel(summary.status);
    }

    statusSeverity(summary: SubscriptionSummaryVm) {
        return subscriptionStatusSeverity(summary.status);
    }

    daysRemainingText(days: number | null): string {
        if (days === null) {
            return '—';
        }
        return `${days} gün`;
    }

    boolText(value: boolean): string {
        return value ? 'Evet' : 'Hayır';
    }
}
