import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import type { AccountSummary } from '@/app/features/account/models/account-summary.model';
import { AccountService } from '@/app/features/account/services/account.service';
import {
    ACCOUNT_DISPLAY_NAME_MAX_LENGTH,
    ACCOUNT_DISPLAY_NAME_SAVE_ERROR,
    ACCOUNT_ROLES_EMPTY_LABEL,
    ACCOUNT_SUMMARY_LOAD_ERROR,
    resolveAccountAvatarInitials,
    resolveAccountDisplayName,
    resolveAccountOptionalName,
    resolveAccountScopeLabel
} from '@/app/features/account/utils/account-summary.utils';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { addTracedToast } from '@/app/shared/utils/toast-trace.utils';

@Component({
    selector: 'app-account-summary-page',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, ToastModule, AppPageHeaderComponent],
    providers: [MessageService],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <p-toast position="bottom-right" />
        <div class="flex justify-center w-full">
            <div class="w-full max-w-4xl">
                <app-page-header title="Hesabım" description="Hesap bilgilerinizi görüntüleyin ve giriş şifrenizi yönetin." />

                <div class="w-full bg-surface-0 dark:bg-surface-900 rounded-2xl shadow-md border border-surface-200 dark:border-surface-700 overflow-hidden">
                    <div class="border-b border-surface-200 dark:border-surface-700 bg-surface-50/60 dark:bg-surface-800/40 px-6 py-5 md:px-12 md:py-6">
                        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                                    <div class="shrink-0 w-14 h-14 rounded-full bg-surface-200 dark:bg-surface-700 animate-pulse" aria-hidden="true"></div>
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

                            <a pButton severity="secondary" class="shrink-0 w-full sm:w-auto" routerLink="/panel/settings/account/change-password"><i class="p-button-icon pi pi-lock"></i>Şifre Değiştir</a>
                        </div>
                    </div>

                    <div class="px-6 py-4 md:px-12 md:py-8">
                        @if (summaryLoading()) {
                            <p class="text-muted-color text-sm m-0 py-2">Hesap bilgileri yükleniyor…</p>
                        } @else if (summaryError()) {
                            <p class="text-red-500 text-sm m-0 py-2" role="alert">{{ summaryError() }}</p>
                        } @else if (summary(); as s) {
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div class="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/30 p-4 min-w-0">
                                    <div class="text-sm text-muted-color mb-1">Organizasyon</div>
                                    <div class="text-sm font-medium text-surface-900 dark:text-surface-0 break-words">
                                        {{ optionalName(s.tenantName) }}
                                    </div>
                                </div>
                                <div class="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/30 p-4 min-w-0">
                                    <div class="text-sm text-muted-color mb-1">Aktif klinik</div>
                                    <div class="text-sm font-medium text-surface-900 dark:text-surface-0 break-words">
                                        {{ optionalName(s.activeClinicName) }}
                                    </div>
                                </div>
                                <div class="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/30 p-4 min-w-0">
                                    <div class="text-sm text-muted-color mb-1">Yetki kapsamı</div>
                                    <div class="text-sm font-medium text-surface-900 dark:text-surface-0">
                                        {{ scopeLabel(s.isTenantWide) }}
                                    </div>
                                </div>
                                <div class="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/30 p-4 min-w-0">
                                    <div class="text-sm text-muted-color mb-1">Roller</div>
                                    @if (s.roles.length > 0) {
                                        <div class="flex flex-wrap gap-1.5">
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
                            <form class="mt-6" (ngSubmit)="saveDisplayName()">
                                <label for="displayName" class="block text-sm font-medium text-muted-color mb-2">Görünen ad</label>
                                <div class="flex flex-col gap-2 sm:flex-row">
                                    <input id="displayName" pInputText class="w-full" [formControl]="displayNameControl" [maxlength]="displayNameMax" autocomplete="name" />
                                    <button pButton type="submit" class="max-sm:self-start" [disabled]="displayNameSaving() || displayNameControl.pristine"><i class="p-button-icon" [class]="displayNameSaving() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>Kaydet</button>
                                </div>
                                <small class="text-muted-color block mt-1"> Hasta kabulünde sorumlu hekim olarak bu ad gösterilir. Boş bırakırsanız e-postanızdan türetilen ad kullanılır. </small>
                                @if (displayNameError()) {
                                    <small class="text-red-500 block mt-1" role="alert">{{ displayNameError() }}</small>
                                }
                            </form>
                        }
                    </div>
                </div>
            </div>
        </div>
    `
})
export class AccountSummaryPageComponent implements OnInit {
    private readonly account = inject(AccountService);
    private readonly messages = inject(MessageService);

    readonly summaryLoading = signal(true);
    readonly summaryError = signal<string | null>(null);
    readonly summary = signal<AccountSummary | null>(null);

    readonly displayNameMax = ACCOUNT_DISPLAY_NAME_MAX_LENGTH;
    readonly displayNameControl = new FormControl('', {
        nonNullable: true,
        validators: Validators.maxLength(ACCOUNT_DISPLAY_NAME_MAX_LENGTH)
    });
    readonly displayNameSaving = signal(false);
    readonly displayNameError = signal<string | null>(null);

    readonly rolesEmptyLabel = ACCOUNT_ROLES_EMPTY_LABEL;
    readonly displayName = resolveAccountDisplayName;
    readonly avatarInitials = resolveAccountAvatarInitials;
    readonly optionalName = resolveAccountOptionalName;
    readonly scopeLabel = resolveAccountScopeLabel;

    ngOnInit(): void {
        this.loadAccountSummary();
    }

    saveDisplayName(): void {
        if (this.displayNameSaving() || this.displayNameControl.invalid) {
            return;
        }

        const displayName = this.displayNameControl.value.trim();

        this.displayNameError.set(null);
        this.displayNameSaving.set(true);
        this.account.updateDisplayName(displayName).subscribe({
            next: () => {
                this.displayNameSaving.set(false);
                this.displayNameControl.reset(displayName);
                this.summary.update((s) => (s ? { ...s, displayName: displayName || null } : s));
                addTracedToast(this.messages, 'AccountSummaryPage', 'settings/account', {
                    severity: 'success',
                    summary: 'Görünen ad güncellendi.',
                    life: 3000
                });
            },
            error: (err: unknown) => {
                this.displayNameSaving.set(false);
                this.displayNameError.set(err instanceof HttpErrorResponse ? messageFromHttpError(err, ACCOUNT_DISPLAY_NAME_SAVE_ERROR) : ACCOUNT_DISPLAY_NAME_SAVE_ERROR);
            }
        });
    }

    private loadAccountSummary(): void {
        this.summaryLoading.set(true);
        this.summaryError.set(null);
        this.account.getAccountSummary().subscribe({
            next: (data) => {
                this.summary.set(data);
                this.displayNameControl.reset(data.displayName?.trim() ?? '');
                this.summaryLoading.set(false);
            },
            error: (err: unknown) => {
                this.summaryError.set(err instanceof HttpErrorResponse ? messageFromHttpError(err, ACCOUNT_SUMMARY_LOAD_ERROR) : ACCOUNT_SUMMARY_LOAD_ERROR);
                this.summaryLoading.set(false);
            }
        });
    }
}
