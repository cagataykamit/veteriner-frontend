import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { AuthService } from '@/app/core/auth/auth.service';
import { IMPORTS_MANAGE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { IMPORTS_ROUTE } from '@/app/core/routing/panel-navigation';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import {
    MIGRATION_SUPPORT_LIMITS,
    type CustomDevelopmentRequestDto,
    type MigrationMeetingDay,
    type MigrationMeetingTime,
    type MigrationRecordVolume,
    type MigrationSourceProgram,
    type MigrationSupportOverviewDto
} from '@/app/entities/custom-development/models/custom-development-request.model';
import { CustomDevelopmentRequestsService } from '@/app/entities/custom-development/services/custom-development-requests.service';
import {
    MIGRATION_MEETING_DAY_LABELS,
    MIGRATION_MEETING_TIME_LABELS,
    MIGRATION_RECORD_VOLUME_LABELS,
    customDevelopmentStatusLabel,
    customDevelopmentStatusSeverity,
    migrationSupportFeeLabel,
    migrationSupportSummary,
    toFlagList
} from '@/app/entities/custom-development/utils/custom-development-labels.utils';
import type { ImportSourceProfileDto } from '@/app/features/imports/models/import-api.model';
import { ImportsService } from '@/app/features/imports/services/imports.service';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';

const VOLUME_OPTIONS = (Object.keys(MIGRATION_RECORD_VOLUME_LABELS) as MigrationRecordVolume[]).map((value) => ({ value, label: MIGRATION_RECORD_VOLUME_LABELS[value] }));
const DAY_OPTIONS = (Object.keys(MIGRATION_MEETING_DAY_LABELS) as MigrationMeetingDay[]).map((value) => ({ value, label: MIGRATION_MEETING_DAY_LABELS[value] }));
const TIME_OPTIONS = (Object.keys(MIGRATION_MEETING_TIME_LABELS) as MigrationMeetingTime[]).map((value) => ({ value, label: MIGRATION_MEETING_TIME_LABELS[value] }));

/**
 * Geçiş desteği ve kurulum görüşmesi talebi (TIER-021; backend `CUSTOM_DEVELOPMENT_REQUESTS_API_CONTRACT.md` §11). Her pakette açılır;
 * ücret bilgisi ve görüşme süresi sunucudan gelir (Kurumsal'da ücretsiz, diğer paketlerde ücretli; tutar yok). Talep dosya almaz: klinik
 * dosyasını kendisi içe aktarma sihirbazına yükler, e-postayla göndermez. Talep platform yöneticisinin talepler listesine düşer.
 */
@Component({
    selector: 'app-migration-support-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, RouterLink, ButtonModule, CheckboxModule, InputTextModule, MessageModule, SelectModule, TextareaModule, AppPageHeaderComponent, AppLoadingStateComponent, AppErrorStateComponent, AppStatusTagComponent],
    template: `
        <app-page-header [categoryLink]="importsRoute" categoryLinkLabel="Veri içe aktarma" title="Geçiş desteği" description="Eski programınızdan Vetinity'ye geçerken destek ve kurulum görüşmesi isteyin." />

        @if (loading()) {
            <app-loading-state message="Yükleniyor…" />
        } @else if (error(); as err) {
            <app-error-state [detail]="err" (retry)="reload()" />
        } @else if (data(); as d) {
            <div class="grid grid-cols-12 gap-4">
                <section class="card col-span-12 mb-0" aria-labelledby="msScopeTitle" data-testid="ms-scope">
                    <h5 id="msScopeTitle" class="mt-0 mb-3">Neler dahil?</h5>
                    <ul class="m-0 pl-5 flex flex-col gap-2 text-sm">
                        <li>
                            Ücret: <strong data-testid="ms-fee">{{ feeLabel(d.fee) }}</strong>
                        </li>
                        <li data-testid="ms-duration">Kurulum görüşmesi {{ durationText(d.meetingDurationMinutes) }} sürer.</li>
                        <li>Geçiş desteğinin kapsamı müşteri, hasta ve aşı geçmişidir. Muayene ve ödeme geçmişi bu kapsamda yoktur.</li>
                    </ul>
                    <p-message severity="info" class="w-full mt-4" data-testid="ms-kvkk">
                        Eski programınızın dosyasını Vetinity çalışanlarına e-postayla göndermeyin. Dosyayı kendiniz
                        @if (canImport) {
                            <a [routerLink]="newImportRoute" class="font-medium">içe aktarma ekranına</a>
                        } @else {
                            içe aktarma ekranına
                        }
                        yükleyin. Gerekirse destek ekibimiz sizin izninizle ekran paylaşımında yardım eder; dosyanızı almaz. Yüklenen satırlar işlem bittikten 30 gün sonra silinir.
                    </p-message>
                </section>

                <section class="card col-span-12 lg:col-span-6 mb-0" aria-labelledby="msNewTitle">
                    <h5 id="msNewTitle" class="mt-0 mb-3">Talep</h5>
                    @if (ro.mutationBlocked()) {
                        <p class="m-0 text-sm text-amber-700 dark:text-amber-300" role="status">Abonelik durumu nedeniyle yeni talep açılamaz.</p>
                    } @else if (d.openCount >= d.maxOpen) {
                        <p class="m-0 text-sm text-muted-color" role="status" data-testid="ms-open">Açık bir geçiş desteği talebiniz var. Durumunu yandaki listeden izleyebilirsiniz; sonuçlanınca yenisini açabilirsiniz.</p>
                    } @else {
                        <form class="flex flex-col gap-3" (ngSubmit)="create()">
                            <div class="flex flex-col gap-1">
                                <label for="msProgram" class="text-sm font-medium">Hangi programdan geliyorsunuz?</label>
                                <p-select
                                    inputId="msProgram"
                                    name="msProgram"
                                    [options]="programOptions()"
                                    optionLabel="label"
                                    optionValue="value"
                                    [ngModel]="program()"
                                    (ngModelChange)="program.set($event)"
                                    placeholder="Seçin"
                                    class="w-full"
                                    data-testid="ms-program"
                                />
                            </div>
                            @if (program() === 'Generic') {
                                <div class="flex flex-col gap-1">
                                    <label for="msOther" class="text-sm font-medium">Programın adı (isteğe bağlı)</label>
                                    <input id="msOther" name="msOther" pInputText [maxlength]="limits.programName" [ngModel]="otherName()" (ngModelChange)="otherName.set($event)" data-testid="ms-other" />
                                </div>
                            }
                            <div class="flex flex-col gap-1">
                                <label for="msVolume" class="text-sm font-medium">Yaklaşık kayıt sayısı (müşteri ve hasta)</label>
                                <p-select
                                    inputId="msVolume"
                                    name="msVolume"
                                    [options]="volumeOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    [ngModel]="volume()"
                                    (ngModelChange)="volume.set($event)"
                                    placeholder="Seçin"
                                    class="w-full"
                                    data-testid="ms-volume"
                                />
                            </div>
                            <fieldset class="m-0 p-0 border-0 flex flex-col gap-1">
                                <legend class="text-sm font-medium mb-1">Görüşme için uygun günler</legend>
                                <div class="flex flex-wrap gap-3">
                                    @for (o of dayOptions; track o.value) {
                                        <span class="flex items-center gap-1">
                                            <p-checkbox [inputId]="'msDay' + o.value" [name]="'msDay' + o.value" [binary]="true" [ngModel]="days().includes(o.value)" (ngModelChange)="toggle(days, o.value, $event)" />
                                            <label class="text-sm cursor-pointer" [for]="'msDay' + o.value">{{ o.label }}</label>
                                        </span>
                                    }
                                </div>
                            </fieldset>
                            <fieldset class="m-0 p-0 border-0 flex flex-col gap-1">
                                <legend class="text-sm font-medium mb-1">Uygun saat aralıkları</legend>
                                <div class="flex flex-wrap gap-3">
                                    @for (o of timeOptions; track o.value) {
                                        <span class="flex items-center gap-1">
                                            <p-checkbox [inputId]="'msTime' + o.value" [name]="'msTime' + o.value" [binary]="true" [ngModel]="times().includes(o.value)" (ngModelChange)="toggle(times, o.value, $event)" />
                                            <label class="text-sm cursor-pointer" [for]="'msTime' + o.value">{{ o.label }}</label>
                                        </span>
                                    }
                                </div>
                                <small class="text-muted-color">Kesin gün ve saati destek ekibi size yazar.</small>
                            </fieldset>
                            <div class="flex flex-col gap-1">
                                <label for="msNote" class="text-sm font-medium">Not (isteğe bağlı)</label>
                                <textarea
                                    id="msNote"
                                    name="msNote"
                                    pTextarea
                                    rows="4"
                                    [maxlength]="limits.note"
                                    [ngModel]="note()"
                                    (ngModelChange)="note.set($event)"
                                    placeholder="Örn. iki şubemiz var, aşı kayıtları ayrı dosyada"
                                    data-testid="ms-note"
                                ></textarea>
                                <small class="text-muted-color">Müşteri, hasta sahibi ya da hayvan bilgisi, telefon gibi kişisel veri yazmayın.</small>
                            </div>
                            @if (formError(); as m) {
                                <p-message severity="error" class="w-full" role="alert" data-testid="ms-form-error">{{ m }}</p-message>
                            }
                            <div>
                                <button pButton type="submit" [disabled]="!canSubmit()" data-testid="ms-submit"><i class="p-button-icon" [class]="saving() ? 'pi pi-spin pi-spinner' : 'pi pi-send'"></i>Geçiş desteği iste</button>
                            </div>
                        </form>
                    }
                </section>

                <section class="card col-span-12 lg:col-span-6 mb-0" aria-labelledby="msListTitle">
                    <h5 id="msListTitle" class="mt-0">Talepleriniz</h5>
                    @if (listMessage(); as m) {
                        <p-message severity="success" class="w-full mb-3" role="status" data-testid="ms-list-message">{{ m }}</p-message>
                    }
                    @if (d.items.length === 0) {
                        <p class="m-0 text-sm text-muted-color" data-testid="ms-empty">Henüz talep yok.</p>
                    } @else {
                        <ul class="list-none m-0 p-0 flex flex-col gap-3">
                            @for (r of d.items; track r.id) {
                                <li class="border border-surface-200 dark:border-surface-700 rounded-border p-3" data-testid="ms-row">
                                    <div class="flex flex-wrap items-start justify-between gap-2">
                                        <div class="font-medium break-words min-w-0">{{ r.requestTarget }}</div>
                                        <app-status-tag [label]="statusLabel(r.status)" [severity]="statusSeverity(r.status)" />
                                    </div>
                                    <small class="block text-muted-color mt-1">{{ meta(r) }}</small>
                                    @if (r.requestText) {
                                        <p class="mt-2 mb-0 text-sm whitespace-pre-line break-words">{{ r.requestText }}</p>
                                    }
                                    @if (r.status === 'OutOfScope' && r.decisionReason) {
                                        <div class="mt-2 text-sm">
                                            <span class="font-medium">Gerekçe:</span> <span class="whitespace-pre-line">{{ r.decisionReason }}</span>
                                        </div>
                                    }
                                    @if (r.responseNote) {
                                        <div class="mt-2 text-sm" data-testid="ms-response">
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
export class MigrationSupportPageComponent implements OnInit {
    readonly importsRoute = IMPORTS_ROUTE;
    readonly newImportRoute = `${IMPORTS_ROUTE}/new`;
    readonly limits = MIGRATION_SUPPORT_LIMITS;
    readonly volumeOptions = VOLUME_OPTIONS;
    readonly dayOptions = DAY_OPTIONS;
    readonly timeOptions = TIME_OPTIONS;

    private readonly service = inject(CustomDevelopmentRequestsService);
    private readonly imports = inject(ImportsService);
    readonly ro = inject(TenantReadOnlyContextService);
    readonly canImport = inject(AuthService).hasOperationClaim(IMPORTS_MANAGE_CLAIM);

    readonly data = signal<MigrationSupportOverviewDto | null>(null);
    readonly profiles = signal<ImportSourceProfileDto[]>([]);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly saving = signal(false);
    readonly formError = signal<string | null>(null);
    readonly listMessage = signal<string | null>(null);

    readonly program = signal<MigrationSourceProgram | null>(null);
    readonly otherName = signal('');
    readonly volume = signal<MigrationRecordVolume | null>(null);
    readonly days = signal<MigrationMeetingDay[]>([]);
    readonly times = signal<MigrationMeetingTime[]>([]);
    readonly note = signal('');

    /** Liste sunucudaki profillerdir (Kolayvet, E-vet, Genel); "Genel" en sona alınır, diğer program adı ayrı alana yazılır. */
    readonly programOptions = computed(() =>
        [...this.profiles()].sort((a, b) => Number(a.code === 'Generic') - Number(b.code === 'Generic')).map((p) => ({ value: p.code, label: p.code === 'Generic' ? `${p.displayName} / başka program` : p.displayName }))
    );

    readonly canSubmit = computed(() => !this.saving() && this.program() !== null && this.volume() !== null && this.days().length > 0 && this.times().length > 0);

    statusLabel = customDevelopmentStatusLabel;
    statusSeverity = customDevelopmentStatusSeverity;
    feeLabel = migrationSupportFeeLabel;

    ngOnInit(): void {
        this.reload();
        this.imports.getSourceProfiles().subscribe({
            next: (list) => this.profiles.set(list),
            error: (err: unknown) => this.formError.set(panelHttpFailureMessage(err, 'Program listesi yüklenemedi.'))
        });
    }

    reload(): void {
        this.loading.set(true);
        this.error.set(null);
        this.service.getMigrationSupport().subscribe({
            next: (d) => {
                this.data.set(d);
                this.loading.set(false);
            },
            error: (err: unknown) => {
                this.error.set(panelHttpFailureMessage(err, 'Geçiş desteği bilgisi yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }

    durationText(minutes: number): string {
        return minutes % 60 === 0 ? `${minutes / 60} saat` : `${minutes} dakika`;
    }

    meta(r: CustomDevelopmentRequestDto): string {
        const parts = [formatDateTimeDisplay(r.createdAtUtc)];

        if (r.migration) {
            parts.push(migrationSupportSummary(r.migration));
        }

        if (r.createdByName) {
            parts.push(r.createdByName);
        }

        return parts.join(' · ');
    }

    toggle<T>(list: { update(fn: (v: T[]) => T[]): void }, value: T, on: boolean): void {
        list.update((cur) => (on ? [...cur.filter((v) => v !== value), value] : cur.filter((v) => v !== value)));
    }

    create(): void {
        const program = this.program();
        const volume = this.volume();

        if (!this.canSubmit() || program === null || volume === null) {
            return;
        }

        this.saving.set(true);
        this.formError.set(null);
        this.listMessage.set(null);
        this.service
            .createMigrationSupport({
                sourceProgram: program,
                otherProgramName: program === 'Generic' ? this.otherName().trim() || null : null,
                recordVolume: volume,
                meetingDays: toFlagList(this.days(), MIGRATION_MEETING_DAY_LABELS),
                meetingTimes: toFlagList(this.times(), MIGRATION_MEETING_TIME_LABELS),
                note: this.note().trim() || null
            })
            .subscribe({
                next: () => {
                    this.saving.set(false);
                    this.resetForm();
                    this.listMessage.set('Talebiniz alındı. Destek ekibi görüşme günü ve saatini bu listede size yazacak.');
                    this.reload();
                },
                error: (err: unknown) => {
                    this.saving.set(false);
                    this.formError.set(panelHttpFailureMessage(err, 'Talep gönderilemedi.'));

                    // Başka oturumda talep açılmış olabilir; liste güncellensin.
                    if (err instanceof HttpErrorResponse && err.status === 409) {
                        this.reload();
                    }
                }
            });
    }

    private resetForm(): void {
        this.program.set(null);
        this.otherName.set('');
        this.volume.set(null);
        this.days.set([]);
        this.times.set([]);
        this.note.set('');
    }
}
