import { Component, computed, effect, inject, input, signal, untracked, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import type { Observable } from 'rxjs';
import type { ClientPortalAccessDto } from '@/app/entities/client/models/client-portal-access-api.model';
import type { ClientDetailVm } from '@/app/entities/client/models/client-vm.model';
import { ClientsService } from '@/app/entities/client/services/clients.service';
import { clientPortalLastInviteNote, clientPortalState } from '@/app/features/clients/utils/client-portal-access.utils';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { ownerPortalProblemUserMessageByCode } from '@/app/features/clients/utils/owner-portal-error.utils';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { addTracedToast } from '@/app/shared/utils/toast-trace.utils';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';

/**
 * Müşteri kartı "Portal erişimi" (ADR-031 K3, `PORTAL_API_CONTRACT.md` §4): bağ/davet durumu, davet gönder, daveti iptal et, erişimi kapat.
 * Yetki (`OwnerPortal.Manage`) sayfada denetlenir; bölüm yetkisiz kullanıcıya hiç çizilmez.
 * Salt okunur kiracıda yalnız davet gönderme kapalıdır; iptal ve erişimi kapatma sunucuda da açıktır (KVKK güvenli taraf, §4.3–4.4).
 * Müşteri kaydı değişince (ör. KVKK Ret) durum yeniden okunur; davet uygunluğu sunucudadır (`canInvite`).
 */
@Component({
    selector: 'app-client-portal-access-panel',
    standalone: true,
    imports: [ButtonModule, ConfirmDialogModule, AppErrorStateComponent, TrDateTimePipe],
    providers: [ConfirmationService],
    /** `.card:last-child` alt boşluğu sıfırladığından boşluk ana öğede (bölüm bileşenin son çocuğu). */
    host: { class: 'block mb-4' },
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <p-confirmdialog key="client-portal" [style]="{ width: 'min(450px, 95vw)' }" />
        <section class="card mb-0" aria-labelledby="client-portal-title" data-testid="client-portal">
            <h5 id="client-portal-title" class="mt-0 mb-3 text-base">Portal erişimi</h5>
            @if (loadError(); as err) {
                <app-error-state [detail]="err" (retry)="load()" />
            } @else if (access(); as a) {
                @switch (state()?.kind) {
                    @case ('linked') {
                        <p class="m-0 text-sm flex flex-wrap items-center gap-x-2 gap-y-1" data-testid="client-portal-status">
                            <span class="font-medium text-green-700 dark:text-green-400"><i class="pi pi-check-circle mr-1" aria-hidden="true"></i>Portal erişimi açık</span>
                            <span class="text-muted-color">· bağlanma: {{ linked()!.linkedAtUtc | trDateTime }}</span>
                            @if (linked()!.accountEmail; as email) {
                                <span class="text-muted-color break-all">· hesap: {{ email }}</span>
                            }
                            @if (linked()!.clinicName; as clinic) {
                                <span class="text-muted-color">· klinik: {{ clinic }}</span>
                            }
                        </p>
                    }
                    @case ('pending') {
                        <p class="m-0 text-sm flex flex-wrap items-center gap-x-2 gap-y-1" data-testid="client-portal-status">
                            <span class="font-medium text-amber-800 dark:text-amber-300"><i class="pi pi-clock mr-1" aria-hidden="true"></i>Davet bekliyor</span>
                            <span class="text-muted-color break-all">· {{ pending()!.email }}</span>
                            <span class="text-muted-color">· gönderim: {{ pending()!.createdAtUtc | trDateTime }}</span>
                            <span class="text-muted-color">· son geçerlilik: {{ pending()!.expiresAtUtc | trDateTime }}</span>
                        </p>
                    }
                    @case ('closed') {
                        <p class="m-0 text-sm flex flex-wrap items-center gap-x-2 gap-y-1" data-testid="client-portal-status">
                            <span class="font-medium"><i class="pi pi-ban mr-1" aria-hidden="true"></i>Portal erişimi kapalı</span>
                            @if (closed()!.closedAtUtc; as at) {
                                <span class="text-muted-color">· kapatılma: {{ at | trDateTime }}</span>
                            }
                            <span class="text-muted-color">· müşteri yeniden davet edilebilir</span>
                        </p>
                    }
                    @default {
                        <p class="m-0 text-sm flex flex-wrap items-center gap-x-2 gap-y-1" data-testid="client-portal-status">
                            <span class="font-medium">Davet gönderilmedi</span>
                            @if (lastInviteNote(); as note) {
                                <span class="text-muted-color">· {{ note }}</span>
                            }
                        </p>
                    }
                }

                <div class="flex flex-wrap items-center gap-2 mt-2">
                    @if (state()?.kind !== 'linked') {
                        <button
                            pButton
                            type="button"
                            class="p-button-text p-button-sm"
                            [disabled]="!a.canInvite || ro.mutationBlocked() || busy()"
                            data-testid="client-portal-invite"
                            (click)="sendInvite()"
                        ><i [class]="busy() === 'invite' ? 'pi pi-spin pi-spinner' : (ro.mutationBlocked() ? 'pi pi-lock' : 'pi pi-send')"></i>{{ inviteLabel() }}</button>
                    }
                    @if (pending(); as inv) {
                        <button
                            pButton
                            type="button"
                            class="p-button-text p-button-sm p-button-danger"
                            [disabled]="!!busy()"
                            data-testid="client-portal-revoke"
                            (click)="confirmRevoke()"
                        ><i [class]="busy() === 'revoke' ? 'pi pi-spin pi-spinner' : 'pi pi-times'"></i>Daveti iptal et</button>
                    }
                    @if (linked()) {
                        <button
                            pButton
                            type="button"
                            class="p-button-text p-button-sm p-button-danger"
                            [disabled]="!!busy()"
                            data-testid="client-portal-close"
                            (click)="confirmClose()"
                        ><i [class]="busy() === 'close' ? 'pi pi-spin pi-spinner' : 'pi pi-ban'"></i>Erişimi kapat</button>
                    }
                </div>
                @if (inviteBlockedReason(); as reason) {
                    <p class="m-0 mt-1 text-sm text-muted-color" role="note" data-testid="client-portal-invite-blocked"><i class="pi pi-info-circle mr-1" aria-hidden="true"></i>{{ reason }}</p>
                }
            } @else {
                <p class="m-0 text-muted-color text-sm">Yükleniyor…</p>
            }
        </section>
    `
})
export class ClientPortalAccessPanelComponent {
    readonly client = input.required<ClientDetailVm>();

    private readonly clientsService = inject(ClientsService);
    private readonly confirmation = inject(ConfirmationService);
    private readonly messages = inject(MessageService);
    private readonly router = inject(Router);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly access = signal<ClientPortalAccessDto | null>(null);
    readonly loadError = signal<string | null>(null);
    readonly busy = signal<'invite' | 'revoke' | 'close' | null>(null);

    readonly state = computed(() => {
        const a = this.access();

        return a ? clientPortalState(a) : null;
    });
    readonly linked = computed(() => {
        const s = this.state();

        return s?.kind === 'linked' ? s.link : null;
    });
    readonly pending = computed(() => {
        const s = this.state();

        return s?.kind === 'pending' ? s.invite : null;
    });
    readonly closed = computed(() => {
        const s = this.state();

        return s?.kind === 'closed' ? s.link : null;
    });
    readonly lastInviteNote = computed(() => {
        const s = this.state();

        return s?.kind === 'none' ? clientPortalLastInviteNote(s.lastInvite) : null;
    });
    readonly inviteLabel = computed(() => {
        const base = this.pending() ? 'Yeni davet gönder' : 'Portal daveti gönder';

        return this.ro.mutationBlocked() ? `${base} (salt okunur)` : base;
    });
    /** Bağ aktifken düğme yoktur; nedeni yalnız davet gönderilebilecek durumlarda yazılır. */
    readonly inviteBlockedReason = computed(() => {
        const a = this.access();

        if (!a || a.canInvite || this.linked()) {
            return null;
        }

        return ownerPortalProblemUserMessageByCode(a.inviteBlockedCode) ?? 'Portal daveti bu müşteriye şu an gönderilemez.';
    });

    readonly formatDt = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);

    /** Müşteri kaydı her değiştiğinde (kimlik veya `rowVersion`, ör. KVKK Ret) durum yeniden okunur. */
    private readonly reloadKey = computed(() => `${this.client().id}|${this.client().rowVersion}`);

    constructor() {
        effect(() => {
            this.reloadKey();
            untracked(() => this.load());
        });
    }

    load(): void {
        this.loadError.set(null);
        this.clientsService.getPortalAccess(this.client().id).subscribe({
            next: (a) => this.access.set(a),
            error: (e: unknown) => {
                this.access.set(null);
                this.loadError.set(panelHttpFailureMessage(e, 'Portal erişim durumu yüklenemedi.'));
            }
        });
    }

    sendInvite(): void {
        const a = this.access();

        if (!a?.canInvite || this.ro.mutationBlocked() || this.busy()) {
            return;
        }

        this.run('invite', this.clientsService.sendPortalInvite(this.client().id), (invite) => ({
            summary: 'Portal daveti gönderildi.',
            detail: `${invite.email} adresine gitti; bağlantı ${this.formatDt(invite.expiresAtUtc)} tarihine kadar geçerli.`
        }));
    }

    confirmRevoke(): void {
        const invite = this.pending();

        if (!invite || this.busy()) {
            return;
        }

        this.confirmation.confirm({
            key: 'client-portal',
            header: 'Daveti iptal et',
            message: `${invite.email} adresine gönderilen davet bağlantısı geçersiz olur; müşteri bu bağlantıyla hesap açamaz. Sonra yeni davet gönderebilirsiniz.`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Daveti iptal et',
            rejectLabel: 'Vazgeç',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () =>
                this.run('revoke', this.clientsService.revokePortalInvite(this.client().id, invite.inviteId), () => ({
                    summary: 'Davet iptal edildi.',
                    detail: 'Bağlantı artık çalışmaz; müşteri yeniden davet edilebilir.'
                }))
        });
    }

    confirmClose(): void {
        const link = this.linked();

        if (!link || this.busy()) {
            return;
        }

        const clinic = link.clinicName?.trim() ? `${link.clinicName.trim()} kliniği` : 'bu klinik';

        this.confirmation.confirm({
            key: 'client-portal',
            header: 'Portal erişimini kapat',
            message: `Müşteri portala ${clinic} için giremez; hasta, randevu, aşı ve bakiye bilgilerini artık göremez. Portal hesabı ve başka kliniklerdeki erişimi açık kalır. Müşteriyi sonra yeniden davet edebilirsiniz.`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Erişimi kapat',
            rejectLabel: 'Vazgeç',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () =>
                this.run('close', this.clientsService.closePortalLink(this.client().id, link.linkId), () => ({
                    summary: 'Portal erişimi kapatıldı.',
                    detail: `Müşteri portala ${clinic} için giremez; tekrar davet edilebilir.`
                }))
        });
    }

    /** Eylem sonrası durum her zaman yeniden okunur (başarıda yeni durum, hatada ör. 409 sonrası güncel durum). */
    private run<T>(kind: 'invite' | 'revoke' | 'close', call: Observable<T>, success: (result: T) => { summary: string; detail: string }): void {
        this.busy.set(kind);
        call.subscribe({
            next: (result) => {
                this.busy.set(null);
                addTracedToast(this.messages, 'ClientPortalAccessPanel', this.router.url, { severity: 'success', ...success(result), life: 5000 });
                this.load();
            },
            error: (e: unknown) => {
                this.busy.set(null);
                addTracedToast(this.messages, 'ClientPortalAccessPanel', this.router.url, {
                    severity: 'error',
                    summary: 'İşlem yapılamadı',
                    detail: panelHttpFailureMessage(e, 'İşlem yapılamadı.'),
                    life: 7000
                });
                this.load();
            }
        });
    }
}
