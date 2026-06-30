import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { AccountSummary } from '@/app/features/account/models/account-summary.model';
import { AccountService } from '@/app/features/account/services/account.service';
import {
    ACCOUNT_ROLES_EMPTY_LABEL,
    ACCOUNT_SUMMARY_LOAD_ERROR,
    resolveAccountAvatarInitials,
    resolveAccountDisplayName,
    resolveAccountOptionalName,
    resolveAccountScopeLabel
} from '@/app/features/account/utils/account-summary.utils';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

@Component({
    selector: 'app-account-summary-page',
    standalone: true,
    imports: [CommonModule, RouterLink, ButtonModule, AppPageHeaderComponent],
    template: `
        <div class="w-full max-w-xl mx-auto">
            <app-page-header
                title="Hesabım"
                description="Hesap bilgilerinizi görüntüleyin ve giriş şifrenizi yönetin."
            />

            <div class="card mb-0 overflow-hidden p-0">
                <div
                    class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-5 py-5 md:px-6 border-b border-surface-200 dark:border-surface-700 bg-surface-50/60 dark:bg-surface-800/40"
                >
                    <div class="flex items-center gap-4 min-w-0">
                        @if (summary(); as s) {
                            <div
                                class="shrink-0 flex items-center justify-center w-14 h-14 rounded-full text-lg font-semibold tracking-tight bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200 ring-2 ring-primary-200/60 dark:ring-primary-700/50"
                                aria-hidden="true"
                            >
                                {{ avatarInitials(s) }}
                            </div>
                            <div class="min-w-0">
                                <div class="font-semibold text-surface-900 dark:text-surface-0 truncate">
                                    {{ displayName(s) }}
                                </div>
                                <div class="text-sm text-muted-color truncate mt-0.5">{{ s.email }}</div>
                            </div>
                        } @else if (summaryLoading()) {
                            <div
                                class="shrink-0 w-14 h-14 rounded-full bg-surface-200 dark:bg-surface-700 animate-pulse"
                                aria-hidden="true"
                            ></div>
                            <div class="min-w-0 flex-1">
                                <div class="h-5 w-36 max-w-full rounded bg-surface-200 dark:bg-surface-700 animate-pulse"></div>
                                <div class="h-4 w-48 max-w-full rounded bg-surface-200 dark:bg-surface-700 animate-pulse mt-2"></div>
                            </div>
                        } @else {
                            <div
                                class="shrink-0 flex items-center justify-center w-14 h-14 rounded-full text-lg font-semibold bg-surface-200 text-muted-color dark:bg-surface-700 ring-2 ring-surface-300/60 dark:ring-surface-600/50"
                                aria-hidden="true"
                            >
                                ?
                            </div>
                            <div class="min-w-0">
                                <div class="font-semibold text-surface-900 dark:text-surface-0">Hesap</div>
                                <div class="text-sm text-muted-color mt-0.5">Profil bilgisi yüklenemedi</div>
                            </div>
                        }
                    </div>

                    <p-button
                        label="Şifre Değiştir"
                        icon="pi pi-lock"
                        severity="secondary"
                        styleClass="shrink-0 w-full sm:w-auto"
                        routerLink="/panel/settings/account/change-password"
                    />
                </div>

                <div class="px-5 py-4 md:px-6 md:py-5">
                    @if (summaryLoading()) {
                        <p class="text-muted-color text-sm m-0 py-2">Hesap bilgileri yükleniyor…</p>
                    } @else if (summaryError()) {
                        <p class="text-red-500 text-sm m-0 py-2" role="alert">{{ summaryError() }}</p>
                    } @else if (summary(); as s) {
                        <div
                            class="rounded-xl border border-surface-200 dark:border-surface-700 divide-y divide-surface-200 dark:divide-surface-700 overflow-hidden"
                        >
                            <div
                                class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4 px-4 py-3 bg-surface-0 dark:bg-surface-900"
                            >
                                <span class="text-sm text-muted-color shrink-0">Organizasyon</span>
                                <span class="text-sm font-medium text-surface-900 dark:text-surface-0 sm:text-right break-words">{{
                                    optionalName(s.tenantName)
                                }}</span>
                            </div>
                            <div
                                class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4 px-4 py-3 bg-surface-50/50 dark:bg-surface-800/30"
                            >
                                <span class="text-sm text-muted-color shrink-0">Aktif klinik</span>
                                <span class="text-sm font-medium text-surface-900 dark:text-surface-0 sm:text-right break-words">{{
                                    optionalName(s.activeClinicName)
                                }}</span>
                            </div>
                            <div
                                class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4 px-4 py-3 bg-surface-0 dark:bg-surface-900"
                            >
                                <span class="text-sm text-muted-color shrink-0">Yetki kapsamı</span>
                                <span class="text-sm font-medium text-surface-900 dark:text-surface-0 sm:text-right">{{
                                    scopeLabel(s.isTenantWide)
                                }}</span>
                            </div>
                            <div
                                class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 px-4 py-3 bg-surface-50/50 dark:bg-surface-800/30"
                            >
                                <span class="text-sm text-muted-color shrink-0">Roller</span>
                                <div class="sm:text-right min-w-0">
                                    @if (s.roles.length > 0) {
                                        <div class="flex flex-wrap gap-1.5 sm:justify-end">
                                            @for (role of s.roles; track role) {
                                                <span
                                                    class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-primary-50 text-primary-800 border border-primary-200/80 dark:bg-primary-900/25 dark:text-primary-200 dark:border-primary-700/50"
                                                >
                                                    {{ role }}
                                                </span>
                                            }
                                        </div>
                                    } @else {
                                        <span class="text-sm text-muted-color">{{ rolesEmptyLabel }}</span>
                                    }
                                </div>
                            </div>
                        </div>
                    }
                </div>
            </div>
        </div>
    `
})
export class AccountSummaryPageComponent implements OnInit {
    private readonly account = inject(AccountService);

    readonly summaryLoading = signal(true);
    readonly summaryError = signal<string | null>(null);
    readonly summary = signal<AccountSummary | null>(null);

    readonly rolesEmptyLabel = ACCOUNT_ROLES_EMPTY_LABEL;
    readonly displayName = resolveAccountDisplayName;
    readonly avatarInitials = resolveAccountAvatarInitials;
    readonly optionalName = resolveAccountOptionalName;
    readonly scopeLabel = resolveAccountScopeLabel;

    ngOnInit(): void {
        this.loadAccountSummary();
    }

    private loadAccountSummary(): void {
        this.summaryLoading.set(true);
        this.summaryError.set(null);
        this.account.getAccountSummary().subscribe({
            next: (data) => {
                this.summary.set(data);
                this.summaryLoading.set(false);
            },
            error: (err: unknown) => {
                this.summaryError.set(
                    err instanceof HttpErrorResponse
                        ? messageFromHttpError(err, ACCOUNT_SUMMARY_LOAD_ERROR)
                        : ACCOUNT_SUMMARY_LOAD_ERROR
                );
                this.summaryLoading.set(false);
            }
        });
    }
}
