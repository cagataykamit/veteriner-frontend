import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { EMPTY, Subscription, catchError, switchMap, takeWhile, timer } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { IMPORTS_COMMIT_CLAIM, IMPORTS_MANAGE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { IMPORTS_ROUTE } from '@/app/core/routing/panel-navigation';
import { ImportCommitStepComponent } from '@/app/features/imports/components/import-commit-step.component';
import { ImportMappingStepComponent } from '@/app/features/imports/components/import-mapping-step.component';
import { ImportReviewStepComponent } from '@/app/features/imports/components/import-review-step.component';
import type { ImportBatchDto, ImportDuplicateClientMode, ImportPreviewDto, ImportWarningDto } from '@/app/features/imports/models/import-api.model';
import { ImportsService } from '@/app/features/imports/services/imports.service';
import {
    importErrorMessage,
    importStatusLabel,
    importStatusSeverity,
    isDiscardable,
    isPreviewable
} from '@/app/features/imports/utils/import-labels.utils';
import { columnMapsToRequest, initialColumnMaps, type ImportColumnMaps } from '@/app/features/imports/utils/import-schema.utils';
import { type ImportValueChoices, valueChoicesToRequest } from '@/app/features/imports/utils/import-value-mapping.utils';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';

type WizardStep = 2 | 3 | 4;

const STEPS: readonly { n: number; label: string }[] = [
    { n: 1, label: 'Dosya' },
    { n: 2, label: 'Eşleme' },
    { n: 3, label: 'Doğrulama' },
    { n: 4, label: 'Onay' }
];

/** Bir içe aktarma partisinin sihirbazı. Adres yalnızca parti kimliğini taşır; adım, partinin durumundan türetilir. */
@Component({
    selector: 'app-import-wizard-page',
    standalone: true,
    imports: [
        RouterLink,
        ButtonModule,
        MessageModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent,
        ImportMappingStepComponent,
        ImportReviewStepComponent,
        ImportCommitStepComponent
    ],
    template: `
        <app-page-header [title]="batch()?.name || 'Veri içe aktarma'" description="Her adımda geri dönebilir, sonucu görmeden hiçbir kayıt oluşturmazsınız.">
            <div actions class="flex flex-wrap gap-2 items-center">
                @if (batch(); as b) {
                    <app-status-tag [label]="statusLabel(b.status)" [severity]="statusSeverity(b.status)" />
                }
                <p-button size="small" severity="secondary" icon="pi pi-arrow-left" label="Geçmişe dön" [routerLink]="listRoute" />
            </div>
        </app-page-header>

        @if (loading()) {
            <app-loading-state message="İçe aktarma yükleniyor…" />
        } @else if (loadError()) {
            <app-error-state title="İçe aktarma yüklenemedi." [detail]="loadError()!" (retry)="load()" />
        } @else if (batch(); as b) {
            @if (b.status === 'Discarded' || b.status === 'Expired') {
                <p-message severity="info" styleClass="w-full">
                    {{ b.status === 'Discarded' ? 'Bu içe aktarma silindi.' : 'Bu içe aktarmanın süresi doldu.' }} Yeni bir içe aktarma başlatabilirsiniz.
                </p-message>
            } @else {
                <nav aria-label="Adımlar" class="mb-4">
                    <ol class="list-none p-0 m-0 flex flex-wrap gap-2">
                        @for (s of steps; track s.n) {
                            <li>
                                <button
                                    type="button"
                                    class="flex items-center gap-2 rounded-border border px-3 py-2 bg-transparent text-color"
                                    [class.border-primary]="s.n === currentNumber()"
                                    [class.border-surface-200]="s.n !== currentNumber()"
                                    [class.dark:border-surface-700]="s.n !== currentNumber()"
                                    [class.cursor-pointer]="canGoTo(s.n)"
                                    [disabled]="!canGoTo(s.n)"
                                    [attr.aria-current]="s.n === currentNumber() ? 'step' : null"
                                    (click)="goTo(s.n)"
                                >
                                    <span class="inline-flex items-center justify-center w-6 h-6 rounded-full text-sm" [class.bg-primary]="s.n <= currentNumber()" [class.text-primary-contrast]="s.n <= currentNumber()" [class.bg-surface-200]="s.n > currentNumber()" [class.dark:bg-surface-700]="s.n > currentNumber()">
                                        @if (s.n < currentNumber()) {
                                            <i class="pi pi-check text-xs"></i>
                                        } @else {
                                            {{ s.n }}
                                        }
                                    </span>
                                    <span [class]="s.n === currentNumber() ? '' : 'hidden sm:inline'">{{ s.label }}</span>
                                </button>
                            </li>
                        }
                    </ol>
                </nav>

                @if (!canManage) {
                    <p-message severity="info" styleClass="w-full mb-4">Bu içe aktarmayı yalnızca görüntüleyebilirsiniz.</p-message>
                }
                @for (w of warnings(); track w.code + w.message) {
                    <p-message severity="warn" styleClass="w-full mb-2">{{ w.message }}</p-message>
                }
                @if (error()) {
                    <p-message severity="error" styleClass="w-full mb-4" role="alert">{{ error() }}</p-message>
                }

                <div class="card">
                    @switch (step()) {
                        @case (2) {
                            <h5 class="mt-0">Adım 2 · Sütun eşleme</h5>
                            <app-import-mapping-step
                                [batch]="b"
                                [readOnly]="!canManage || !draft()"
                                [busy]="busy()"
                                [(maps)]="maps"
                                [(duplicateMode)]="duplicateMode"
                                (submit)="saveAndValidate()"
                            />
                        }
                        @case (3) {
                            <h5 class="mt-0">Adım 3 · Doğrulama sonucu</h5>
                            @if (preview()) {
                                <app-import-review-step [batch]="b" [preview]="preview()" [canManage]="canManage && draft()" [busy]="busy()" [(choices)]="choices" (applyValues)="saveAndValidate()" />
                                <div class="flex flex-wrap gap-2 mt-4">
                                    @if (canManage && draft()) {
                                        <p-button severity="secondary" icon="pi pi-arrow-left" label="Eşlemeye dön" (onClick)="step.set(2)" />
                                    }
                                    <p-button icon="pi pi-arrow-right" iconPos="right" label="Onay adımına geç" [disabled]="!commitStepReachable()" (onClick)="step.set(4)" />
                                </div>
                            } @else if (busy()) {
                                <app-loading-state message="Doğrulanıyor…" />
                            } @else {
                                <p class="text-muted-color">Doğrulama sonucu henüz yok. Eşleme adımından doğrulamayı başlatın.</p>
                            }
                        }
                        @case (4) {
                            <h5 class="mt-0">Adım 4 · Onay ve aktarma</h5>
                            <app-import-commit-step [batch]="b" [preview]="preview()" [canCommitClaim]="canCommit" (batchChange)="onBatchChange($event)" (previewStale)="loadPreview()" />
                            @if (b.status === 'Validated') {
                                <div class="mt-4">
                                    <p-button severity="secondary" icon="pi pi-arrow-left" label="Doğrulama sonucuna dön" (onClick)="step.set(3)" />
                                </div>
                            }
                        }
                    }
                </div>
            }
        }
    `
})
export class ImportWizardPageComponent implements OnInit {
    private readonly imports = inject(ImportsService);
    private readonly route = inject(ActivatedRoute);
    private readonly auth = inject(AuthService);
    private readonly destroyRef = inject(DestroyRef);

    readonly listRoute = IMPORTS_ROUTE;
    readonly steps = STEPS;
    readonly canManage = this.auth.hasOperationClaim(IMPORTS_MANAGE_CLAIM);
    readonly canCommit = this.auth.hasOperationClaim(IMPORTS_COMMIT_CLAIM);

    readonly batch = signal<ImportBatchDto | null>(null);
    readonly preview = signal<ImportPreviewDto | null>(null);
    readonly step = signal<WizardStep>(2);
    readonly loading = signal(true);
    readonly loadError = signal<string | null>(null);
    readonly error = signal<string | null>(null);
    readonly busy = signal(false);
    readonly warnings = signal<ImportWarningDto[]>([]);

    /** Eşleme tercihleri sayfa durumunda tutulur; sunucu değer eşleme ve seçenekleri geri vermez. */
    maps = signal<ImportColumnMaps>({});
    duplicateMode = signal<ImportDuplicateClientMode>('Match');
    choices = signal<ImportValueChoices>({});

    protected readonly draft = computed(() => isDiscardable(this.batch()?.status ?? ''));
    protected readonly currentNumber = computed(() => this.step());
    protected statusLabel = importStatusLabel;
    protected statusSeverity = importStatusSeverity;

    private pollSub: Subscription | null = null;

    ngOnInit(): void {
        const state = history.state as { warnings?: ImportWarningDto[] } | null;
        this.warnings.set(Array.isArray(state?.warnings) ? state.warnings : []);
        this.destroyRef.onDestroy(() => this.pollSub?.unsubscribe());
        this.load();
    }

    load(): void {
        const id = this.route.snapshot.paramMap.get('id') ?? '';
        this.loading.set(true);
        this.loadError.set(null);
        this.imports.getBatch(id).subscribe({
            next: (b) => {
                this.batch.set(b);
                this.maps.set(initialColumnMaps(b.tables ?? []));
                this.step.set(this.stepForStatus(b.status));
                this.loading.set(false);
                if (isPreviewable(b.status)) {
                    this.loadPreview();
                }
                if (b.status === 'Committing') {
                    this.startPolling(b.id);
                }
            },
            error: (e: unknown) => {
                this.loadError.set(importErrorMessage(e, 'İçe aktarma yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }

    loadPreview(): void {
        const b = this.batch();
        if (!b) {
            return;
        }
        this.imports.getPreview(b.id).subscribe({
            next: (p) => this.preview.set(p),
            error: (e: unknown) => this.error.set(importErrorMessage(e, 'Doğrulama sonucu yüklenemedi.'))
        });
    }

    /** Eşlemeyi kaydeder, ardından senkron doğrular ve sonucu gösterir. */
    saveAndValidate(): void {
        const b = this.batch();
        if (!b || this.busy()) {
            return;
        }
        this.busy.set(true);
        this.error.set(null);
        this.imports
            .saveMapping(b.id, {
                columns: columnMapsToRequest(this.maps(), b.tables ?? []),
                valueMappings: valueChoicesToRequest(this.choices()),
                options: { onDuplicateClient: this.duplicateMode() }
            })
            .pipe(switchMap(() => this.imports.validate(b.id)))
            .subscribe({
                next: (validated) => {
                    this.batch.update((cur) => (cur ? { ...validated, tables: validated.tables ?? cur.tables } : validated));
                    this.busy.set(false);
                    this.step.set(3);
                    this.loadPreview();
                },
                error: (e: unknown) => {
                    this.busy.set(false);
                    this.error.set(importErrorMessage(e, 'Eşleme kaydedilemedi veya doğrulama yapılamadı.'));
                }
            });
    }

    onBatchChange(b: ImportBatchDto): void {
        this.batch.update((cur) => (cur ? { ...b, tables: b.tables ?? cur.tables } : b));
        if (b.status === 'Committing') {
            this.startPolling(b.id);
        } else if (isPreviewable(b.status)) {
            this.loadPreview();
        }
    }

    canGoTo(n: number): boolean {
        if (n === 1 || this.busy()) {
            return false;
        }
        if (n === 2) {
            return this.canManage && this.draft() && this.step() !== 2;
        }
        if (n === 3) {
            return !!this.preview() && this.step() !== 3 && this.batch()?.status !== 'Committing';
        }
        return this.step() !== 4 && this.commitStepReachable();
    }

    /** Onay adımı: uygulanabilir doğrulama sonucu varken veya aktarma başlamış/bitmiş partide açılır. */
    protected commitStepReachable(): boolean {
        const status = this.batch()?.status;
        if (status === 'Validated') {
            return !!this.preview()?.canCommit;
        }
        return status !== 'ValidationFailed' && !!this.preview();
    }

    goTo(n: number): void {
        if (this.canGoTo(n)) {
            this.step.set(n as WizardStep);
        }
    }

    private stepForStatus(status: string): WizardStep {
        if (status === 'Validated' || status === 'ValidationFailed') {
            return 3;
        }
        return ['Committing', 'Committed', 'CommitFailed', 'RollingBack', 'RolledBack', 'PartiallyRolledBack', 'RollbackFailed'].includes(status) ? 4 : 2;
    }

    /** B4: uygulama sürerken durumu 2 sn aralıkla yoklar; bitince önizlemeyi (hatırlatma etkisi) yeniler. */
    private startPolling(id: string): void {
        this.pollSub?.unsubscribe();
        this.step.set(4);
        this.pollSub = timer(2000, 2000)
            .pipe(
                switchMap(() => this.imports.getBatch(id).pipe(catchError(() => EMPTY))),
                takeWhile((b) => b.status === 'Committing', true)
            )
            .subscribe((b) => {
                this.batch.update((cur) => (cur ? { ...b, tables: b.tables ?? cur.tables } : b));
                if (b.status !== 'Committing') {
                    this.loadPreview();
                }
            });
    }
}
