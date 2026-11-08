import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { SETTINGS_ROUTE } from '@/app/core/routing/panel-navigation';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import {
    CUSTOM_DEVELOPMENT_LIMITS,
    type CustomDevelopmentPriority,
    type CustomDevelopmentRequestDto,
    type CustomDevelopmentRequestListDto,
    type CustomDevelopmentTargetKind
} from '@/app/entities/custom-development/models/custom-development-request.model';
import { CustomDevelopmentRequestsService } from '@/app/entities/custom-development/services/custom-development-requests.service';
import {
    CUSTOM_DEVELOPMENT_PRIORITY_LABELS,
    CUSTOM_DEVELOPMENT_TARGET_LABELS,
    customDevelopmentPriorityLabel,
    customDevelopmentStatusLabel,
    customDevelopmentStatusSeverity,
    customDevelopmentTargetLabel
} from '@/app/entities/custom-development/utils/custom-development-labels.utils';
import { AppPlanUpgradeNoticeComponent } from '@/app/entities/subscription/components/app-plan-upgrade-notice.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';

// Geçiş desteği kendi sayfasından açılır (TIER-021); bu formda konu olarak sunulmaz.
const TARGET_OPTIONS = (Object.keys(CUSTOM_DEVELOPMENT_TARGET_LABELS) as CustomDevelopmentTargetKind[]).filter((value) => value !== 'Migration').map((value) => ({
    value,
    label: CUSTOM_DEVELOPMENT_TARGET_LABELS[value]
}));

const PRIORITY_OPTIONS = (Object.keys(CUSTOM_DEVELOPMENT_PRIORITY_LABELS) as CustomDevelopmentPriority[]).map((value) => ({
    value,
    label: CUSTOM_DEVELOPMENT_PRIORITY_LABELS[value]
}));

/**
 * Ayarlar > Size özel geliştirmeler (TIER-010, `CUSTOM_DEVELOPMENT_REQUESTS_API_CONTRACT.md` §3, §10): Kurumsal kiracı Vetinity içinde kalan
 * ekran, rapor ve çıktı düzenlemesi için talep açar, durumunu izler. Durumu yalnız Vetinity değiştirir. Açık talep sınırı ve paket kilidi
 * backend'dedir; alt pakette mevcut talepler listede kalır, form yerine "üst pakete geç" kutusu görünür.
 */
@Component({
    selector: 'app-custom-development-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        FormsModule,
        ButtonModule,
        InputTextModule,
        MessageModule,
        SelectModule,
        TextareaModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppPlanUpgradeNoticeComponent,
        AppStatusTagComponent
    ],
    template: `
        <app-page-header
            [categoryLink]="settingsRoute"
            categoryLinkLabel="Ayarlar"
            title="Size özel geliştirmeler"
            description="İş akışınıza göre Vetinity içindeki ekran, rapor ve çıktılarda düzenleme isteyin. Vetinity dışındaki sistemler ve uç istekler kapsam dışıdır."
        />

        @if (planLocked()) {
            <section class="card mb-4" data-testid="cd-locked">
                <app-plan-upgrade-notice
                    feature="CustomDevelopment"
                    [detail]="hasItems() ? 'Önceki talepleriniz aşağıda kalır; yeni talep için Kurumsal paket gerekir.' : 'Kurumsal pakette ekran, rapor ve çıktılar için size özel düzenleme talebi açabilirsiniz.'"
                />
            </section>
        }

        @if (loading()) {
            <app-loading-state message="Talepler yükleniyor…" />
        } @else if (error(); as err) {
            <app-error-state [detail]="err" (retry)="reload()" />
        } @else if (data(); as d) {
            <div class="grid grid-cols-12 gap-4">
                @if (!planLocked()) {
                    <section class="card col-span-12 lg:col-span-5 mb-0" aria-labelledby="cdNewTitle">
                        <div class="flex items-baseline justify-between gap-2 mb-3">
                            <h5 id="cdNewTitle" class="m-0">Yeni talep</h5>
                            <small class="text-muted-color" data-testid="cd-open-count">Açık talep: {{ d.openCount }} / {{ d.maxOpen }}</small>
                        </div>
                        @if (ro.mutationBlocked()) {
                            <p class="m-0 text-sm text-amber-700 dark:text-amber-300" role="status">Abonelik durumu nedeniyle yeni talep açılamaz.</p>
                        } @else if (d.openCount >= d.maxOpen) {
                            <p class="m-0 text-sm text-muted-color" role="status" data-testid="cd-limit">
                                Aynı anda en fazla {{ d.maxOpen }} açık talebiniz olabilir. Açık taleplerden biri tamamlanınca ya da kapsam dışı kararı verilince yenisini açabilirsiniz.
                            </p>
                        } @else {
                            <form class="flex flex-col gap-3" (ngSubmit)="create()">
                                <p-message severity="warn" class="w-full" data-testid="cd-privacy">
                                    Talebe müşteri, hasta sahibi ya da hayvan bilgisi, kimlik numarası, telefon gibi kişisel veri yazmayın. Gerekirse örnek değer kullanın.
                                </p-message>
                                <div class="flex flex-col gap-1">
                                    <label for="cdTitle" class="text-sm font-medium">Başlık</label>
                                    <input id="cdTitle" name="cdTitle" pInputText [maxlength]="limits.title" [ngModel]="title()" (ngModelChange)="title.set($event)" placeholder="Örn. Gün sonu raporuna hekim sütunu" data-testid="cd-title" />
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div class="flex flex-col gap-1">
                                        <label for="cdKind" class="text-sm font-medium">Konu</label>
                                        <p-select inputId="cdKind" name="cdKind" [options]="targetOptions" optionLabel="label" optionValue="value" [ngModel]="targetKind()" (ngModelChange)="targetKind.set($event)" placeholder="Seçin" class="w-full" data-testid="cd-kind" />
                                    </div>
                                    <div class="flex flex-col gap-1">
                                        <label for="cdPriority" class="text-sm font-medium">Öncelik</label>
                                        <p-select inputId="cdPriority" name="cdPriority" [options]="priorityOptions" optionLabel="label" optionValue="value" [ngModel]="priority()" (ngModelChange)="priority.set($event)" class="w-full" data-testid="cd-priority" />
                                    </div>
                                </div>
                                <div class="flex flex-col gap-1">
                                    <label for="cdTarget" class="text-sm font-medium">Hangi ekran, rapor ya da çıktı</label>
                                    <input id="cdTarget" name="cdTarget" pInputText [maxlength]="limits.target" [ngModel]="target()" (ngModelChange)="target.set($event)" placeholder="Örn. Gün sonu raporu" data-testid="cd-target" />
                                </div>
                                <div class="flex flex-col gap-1">
                                    <label for="cdText" class="text-sm font-medium">Ne istiyorsunuz?</label>
                                    <textarea id="cdText" name="cdText" pTextarea rows="6" [maxlength]="limits.text" [ngModel]="text()" (ngModelChange)="text.set($event)" placeholder="Bugün nasıl çalışıyor, nasıl olmasını istiyorsunuz?" data-testid="cd-text"></textarea>
                                    <small class="text-muted-color">{{ text().length }} / {{ limits.text }}</small>
                                </div>
                                @if (formError(); as m) {
                                    <p-message severity="error" class="w-full" role="alert" data-testid="cd-form-error">{{ m }}</p-message>
                                }
                                <div>
                                    <button pButton type="submit" [disabled]="!canSubmit()" data-testid="cd-submit"><i class="pi pi-send"></i>Talebi gönder</button>
                                </div>
                            </form>
                        }
                    </section>
                }

                <section [class]="planLocked() ? 'card col-span-12 mb-0' : 'card col-span-12 lg:col-span-7 mb-0'" aria-labelledby="cdListTitle">
                    <h5 id="cdListTitle" class="mt-0">Talepleriniz</h5>
                    @if (listMessage(); as m) {
                        <p-message severity="success" class="w-full mb-3" role="status" data-testid="cd-list-message">{{ m }}</p-message>
                    }
                    @if (d.items.length === 0) {
                        <p class="m-0 text-sm text-muted-color" data-testid="cd-empty">Henüz talep yok.</p>
                    } @else {
                        <ul class="list-none m-0 p-0 flex flex-col gap-3">
                            @for (r of d.items; track r.id) {
                                <li class="border border-surface-200 dark:border-surface-700 rounded-border p-3" data-testid="cd-row">
                                    <div class="flex flex-wrap items-start justify-between gap-2">
                                        <div class="font-medium break-words min-w-0">{{ r.requestTitle }}</div>
                                        <app-status-tag [label]="statusLabel(r.status)" [severity]="statusSeverity(r.status)" />
                                    </div>
                                    <small class="block text-muted-color mt-1">{{ meta(r) }}</small>
                                    <p class="mt-2 mb-0 text-sm whitespace-pre-line break-words">{{ r.requestText }}</p>
                                    @if (r.status === 'OutOfScope' && r.decisionReason) {
                                        <div class="mt-2 text-sm" data-testid="cd-reason">
                                            <span class="font-medium">Kapsam dışı gerekçesi:</span> <span class="whitespace-pre-line">{{ r.decisionReason }}</span>
                                        </div>
                                    }
                                    @if (r.responseNote) {
                                        <div class="mt-2 text-sm" data-testid="cd-note">
                                            <span class="font-medium">Vetinity notu:</span> <span class="whitespace-pre-line">{{ r.responseNote }}</span>
                                        </div>
                                    }
                                </li>
                            }
                        </ul>
                    }
                </section>
            </div>
        }
    `
})
export class CustomDevelopmentPageComponent implements OnInit {
    readonly settingsRoute = SETTINGS_ROUTE;
    readonly limits = CUSTOM_DEVELOPMENT_LIMITS;
    readonly targetOptions = TARGET_OPTIONS;
    readonly priorityOptions = PRIORITY_OPTIONS;

    private readonly service = inject(CustomDevelopmentRequestsService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly data = signal<CustomDevelopmentRequestListDto | null>(null);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly saving = signal(false);
    readonly formError = signal<string | null>(null);
    readonly listMessage = signal<string | null>(null);

    readonly title = signal('');
    readonly targetKind = signal<CustomDevelopmentTargetKind | null>(null);
    readonly target = signal('');
    readonly text = signal('');
    readonly priority = signal<CustomDevelopmentPriority>('Normal');

    readonly planLocked = computed(() => this.ro.lockedPlanFeature('CustomDevelopment') !== null);
    readonly hasItems = computed(() => (this.data()?.items.length ?? 0) > 0);
    readonly canSubmit = computed(
        () => !this.saving() && this.title().trim().length > 0 && this.targetKind() !== null && this.target().trim().length > 0 && this.text().trim().length > 0
    );

    statusLabel = customDevelopmentStatusLabel;
    statusSeverity = customDevelopmentStatusSeverity;

    ngOnInit(): void {
        this.reload();
    }

    reload(): void {
        this.loading.set(true);
        this.error.set(null);
        this.service.list().subscribe({
            next: (d) => {
                this.data.set(d);
                this.loading.set(false);
            },
            error: (err: unknown) => {
                this.error.set(panelHttpFailureMessage(err, 'Talepler yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }

    meta(r: CustomDevelopmentRequestDto): string {
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

    create(): void {
        const kind = this.targetKind();

        if (!this.canSubmit() || kind === null) {
            return;
        }

        this.saving.set(true);
        this.formError.set(null);
        this.listMessage.set(null);
        this.service
            .create({
                requestTitle: this.title().trim(),
                requestText: this.text().trim(),
                targetKind: kind,
                requestTarget: this.target().trim(),
                priority: this.priority()
            })
            .subscribe({
                next: (created) => {
                    this.saving.set(false);
                    this.resetForm();
                    this.listMessage.set(`"${created.requestTitle}" alındı. Durumu bu listeden izleyebilirsiniz.`);
                    this.reload();
                },
                error: (err: unknown) => {
                    this.saving.set(false);
                    this.formError.set(panelHttpFailureMessage(err, 'Talep gönderilemedi.'));

                    // Sınır başka bir oturumda dolmuş olabilir; sayaç güncellensin.
                    if (err instanceof HttpErrorResponse && err.status === 409) {
                        this.reload();
                    }
                }
            });
    }

    private resetForm(): void {
        this.title.set('');
        this.targetKind.set(null);
        this.target.set('');
        this.text.set('');
        this.priority.set('Normal');
    }
}
