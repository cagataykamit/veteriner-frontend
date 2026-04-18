import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import type { ClinicSummary } from '@/app/core/auth/auth.models';
import { AuthService } from '@/app/core/auth/auth.service';
import { mapCreateInviteFormToApiDto } from '@/app/features/tenant-invites/data/tenant-invite.mapper';
import type { OperationClaimOptionVm, TenantInviteCreatedVm } from '@/app/features/tenant-invites/models/tenant-invite-vm.model';
import { TenantInvitesService } from '@/app/features/tenant-invites/services/tenant-invites.service';
import { buildPublicJoinInviteUrl } from '@/app/features/tenant-invites/utils/join-invite-link.utils';
import { tenantInvitePanelFailureMessage } from '@/app/features/tenant-invites/utils/tenant-invite-panel-error.utils';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { dateTimeLocalInputToIsoUtc, formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';

@Component({
    selector: 'app-tenant-invite-panel-page',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterLink,
        ButtonModule,
        InputTextModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent
    ],
    template: `
        <app-page-header
            title="Kullanıcı daveti"
            subtitle="Hesap"
            description="Kuruma katılım için e-posta daveti oluşturun; davet edilen kullanıcı paket seçmez."
        >
            <a actions routerLink="/panel/settings/invites/list" pButton type="button" label="Davet listesi" icon="pi pi-list" class="p-button-secondary"></a>
        </app-page-header>

        @if (pageLoading()) {
            <app-loading-state message="Klinik ve rol listesi yükleniyor…" />
        } @else if (pageError(); as pe) {
            <div class="card">
                <p class="text-red-500 m-0" role="alert">{{ pe }}</p>
                <p-button class="mt-3" label="Yeniden dene" icon="pi pi-refresh" (onClick)="reload()" />
            </div>
        } @else {
            @if (claimsLoadError(); as cle) {
                <div class="card mb-4">
                    <p class="text-orange-600 dark:text-orange-400 m-0 text-sm" role="status">{{ cle }}</p>
                    <p class="text-muted-color text-sm mt-2 mb-0">
                        Beklenen:
                        <code class="text-xs">GET /api/v1/tenants/{{ '{' }}tenantId{{ '}' }}/assignable-operation-claims</code>
                        — yetki yoksa veya oturumdaki kurum bilgisi JWT ile uyuşmuyorsa hata alınabilir.
                    </p>
                </div>
            }

            <div class="card mb-4">
                <h5 class="mt-0 mb-4">Davet oluştur</h5>
                <form [formGroup]="form" (ngSubmit)="onSubmit()">
                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-12 md:col-span-6">
                            <label for="inviteEmail" class="block text-sm font-medium text-muted-color mb-2">E-posta *</label>
                            <input id="inviteEmail" type="email" pInputText class="w-full" formControlName="email" autocomplete="email" />
                            @if (form.controls.email.invalid && form.controls.email.touched) {
                                <small class="text-red-500">Geçerli e-posta girin.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="inviteClinic" class="block text-sm font-medium text-muted-color mb-2">Klinik *</label>
                            <select
                                id="inviteClinic"
                                class="w-full p-inputtext p-component"
                                style="min-height: 2.5rem"
                                formControlName="clinicId"
                            >
                                <option value="">Klinik seçin</option>
                                @for (c of clinics(); track c.id) {
                                    <option [value]="c.id">{{ c.name }}</option>
                                }
                            </select>
                            @if (clinics().length === 0) {
                                <small class="text-muted-color">Bu hesap için klinik bulunamadı.</small>
                            } @else if (form.controls.clinicId.invalid && form.controls.clinicId.touched) {
                                <small class="text-red-500">Klinik seçin.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="inviteRole" class="block text-sm font-medium text-muted-color mb-2">Rol *</label>
                            <select
                                id="inviteRole"
                                class="w-full p-inputtext p-component"
                                style="min-height: 2.5rem"
                                formControlName="operationClaimId"
                            >
                                <option value="">Rol seçin</option>
                                @for (r of operationClaims(); track r.id) {
                                    <option [value]="r.id">{{ r.name }}</option>
                                }
                            </select>
                            @if (operationClaims().length === 0 && !claimsLoadError()) {
                                <small class="text-muted-color">Rol listesi boş.</small>
                            } @else if (form.controls.operationClaimId.invalid && form.controls.operationClaimId.touched) {
                                <small class="text-red-500">Rol seçin.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="inviteExpires" class="block text-sm font-medium text-muted-color mb-2">Son geçerlilik (isteğe bağlı)</label>
                            <input id="inviteExpires" type="datetime-local" class="w-full p-inputtext p-component" formControlName="expiresAtLocal" />
                            <small class="text-muted-color">Boş bırakılırsa backend varsayılanını kullanır.</small>
                        </div>
                    </div>

                    @if (submitError()) {
                        <p class="text-red-500 mt-4 mb-0" role="alert">{{ submitError() }}</p>
                    }

                    <div class="flex flex-wrap gap-2 mt-4">
                        <p-button
                            type="submit"
                            label="Davet oluştur"
                            icon="pi pi-send"
                            [loading]="submitting()"
                            [disabled]="
                                form.invalid ||
                                submitting() ||
                                clinics().length === 0 ||
                                operationClaims().length === 0 ||
                                ro.mutationBlocked()
                            "
                        />
                    </div>
                </form>
            </div>

            @if (lastCreated(); as created) {
                <div class="card mb-4 border-primary-200 dark:border-primary-800">
                    <h5 class="mt-0 mb-3">Katılım bağlantısı</h5>
                    <p class="text-sm text-muted-color mt-0 mb-2">
                        Bu bağlantıyı davet ettiğiniz kişiyle paylaşın. Süre:
                        {{ formatExpires(created.expiresAtUtc) }}
                    </p>
                    <div
                        class="p-3 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 break-all text-sm font-mono mb-3"
                    >
                        {{ joinUrl() }}
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <p-button label="Bağlantıyı kopyala" icon="pi pi-copy" (onClick)="copyJoinLink()" [disabled]="!joinUrl()" />
                        @if (copyFeedback(); as cf) {
                            <span class="text-sm self-center" [class.text-green-600]="cf === 'ok'" [class.text-red-500]="cf === 'fail'">
                                @if (cf === 'ok') {
                                    Panoya kopyalandı.
                                } @else {
                                    Kopyalama başarısız; bağlantıyı elle seçip kopyalayın.
                                }
                            </span>
                        }
                    </div>
                    <dl class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 mb-0 text-sm">
                        <div><span class="text-muted-color">Davet ID:</span> {{ created.inviteId }}</div>
                        <div><span class="text-muted-color">E-posta:</span> {{ created.email }}</div>
                        <div><span class="text-muted-color">Klinik ID:</span> {{ created.clinicId }}</div>
                    </dl>
                </div>
            }

            @if (recentInvites().length > 0) {
                <div class="card mb-4">
                    <h5 class="mt-0 mb-3">Son oluşturulan davetler (bu oturum)</h5>
                    <ul class="list-none p-0 m-0 space-y-3">
                        @for (inv of recentInvites(); track inv.token) {
                            <li class="p-3 rounded-lg border border-surface-200 dark:border-surface-700 text-sm">
                                <div class="font-medium break-all">{{ inv.email }}</div>
                                <div class="text-muted-color break-all">{{ buildInviteLink(inv.token) }}</div>
                                <div class="text-muted-color text-xs mt-1">{{ formatExpires(inv.expiresAtUtc) }}</div>
                            </li>
                        }
                    </ul>
                </div>
            }

            <div class="card">
                <h5 class="mt-0 mb-2">İptal / yeniden gönderim</h5>
                <p class="text-sm text-muted-color m-0">
                    Daveti geri çekme veya e-postayı yeniden gönderme bu sürümde yok; ileri fazda backend uçları eklendiğinde buraya
                    bağlanabilir.
                </p>
            </div>
        }
    `
})
export class TenantInvitePanelPageComponent implements OnInit {
    /** Şablonda join URL üretimi için (import doğrudan şablonda kullanılamaz). */
    readonly buildInviteLink = buildPublicJoinInviteUrl;

    private readonly fb = inject(FormBuilder);
    private readonly auth = inject(AuthService);
    private readonly tenantInvites = inject(TenantInvitesService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly pageLoading = signal(true);
    readonly pageError = signal<string | null>(null);
    readonly claimsLoadError = signal<string | null>(null);

    readonly clinics = signal<ClinicSummary[]>([]);
    readonly operationClaims = signal<OperationClaimOptionVm[]>([]);

    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly lastCreated = signal<TenantInviteCreatedVm | null>(null);
    readonly recentInvites = signal<TenantInviteCreatedVm[]>([]);
    readonly copyFeedback = signal<'ok' | 'fail' | null>(null);

    readonly joinUrl = computed(() => {
        const t = this.lastCreated()?.token?.trim();
        return t ? buildPublicJoinInviteUrl(t) : '';
    });

    readonly form = this.fb.nonNullable.group({
        email: ['', [Validators.required, Validators.email]],
        clinicId: ['', Validators.required],
        operationClaimId: ['', Validators.required],
        expiresAtLocal: ['']
    });

    ngOnInit(): void {
        this.reload();
    }

    reload(): void {
        this.pageLoading.set(true);
        this.pageError.set(null);
        this.claimsLoadError.set(null);
        this.auth.getMyClinics().subscribe({
            next: (list) => {
                this.clinics.set(list);
                this.tenantInvites.listOperationClaims().subscribe({
                    next: (claims) => {
                        this.operationClaims.set(claims);
                        this.pageLoading.set(false);
                    },
                    error: (e: unknown) => {
                        const msg = tenantInvitePanelFailureMessage(e, 'Rol listesi yüklenemedi.');
                        this.claimsLoadError.set(msg);
                        this.operationClaims.set([]);
                        this.pageLoading.set(false);
                    }
                });
            },
            error: (e: unknown) => {
                const msg =
                    e instanceof HttpErrorResponse
                        ? tenantInvitePanelFailureMessage(e, 'Klinik listesi yüklenemedi.')
                        : e instanceof Error && e.message
                          ? e.message
                          : 'Klinik listesi yüklenemedi.';
                this.pageError.set(msg);
                this.pageLoading.set(false);
            }
        });
    }

    formatExpires(iso: string | null): string {
        return formatDateTimeDisplay(iso);
    }

    onSubmit(): void {
        if (this.ro.mutationBlocked()) {
            return;
        }
        this.submitError.set(null);
        this.copyFeedback.set(null);
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const v = this.form.getRawValue();
        const expiresRaw = v.expiresAtLocal?.trim() ?? '';
        let expiresAtUtc: string | null = null;
        if (expiresRaw) {
            const iso = dateTimeLocalInputToIsoUtc(expiresRaw);
            if (!iso) {
                this.submitError.set('Son geçerlilik tarihi geçersiz.');
                return;
            }
            expiresAtUtc = iso;
        }
        const dto = mapCreateInviteFormToApiDto({
            email: v.email,
            clinicId: v.clinicId,
            operationClaimId: v.operationClaimId,
            expiresAtUtc
        });
        this.submitting.set(true);
        this.tenantInvites.createInvite(dto).subscribe({
            next: (vm) => {
                this.submitting.set(false);
                this.lastCreated.set(vm);
                this.recentInvites.update((list) => [vm, ...list].slice(0, 8));
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                this.submitError.set(tenantInvitePanelFailureMessage(e, 'Davet oluşturulamadı.'));
            }
        });
    }

    async copyJoinLink(): Promise<void> {
        const url = this.joinUrl();
        if (!url || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
            this.copyFeedback.set('fail');
            return;
        }
        try {
            await navigator.clipboard.writeText(url);
            this.copyFeedback.set('ok');
            window.setTimeout(() => this.copyFeedback.set(null), 2500);
        } catch {
            this.copyFeedback.set('fail');
        }
    }
}
