import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@/app/core/auth/auth.service';
import { CUSTOM_DEVELOPMENT_REQUESTS_MANAGE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { IMPORTS_ROUTE, MIGRATION_SUPPORT_ROUTE } from '@/app/core/routing/panel-navigation';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import { ImportDropZoneComponent } from '@/app/features/imports/components/import-drop-zone.component';
import type { ImportBatchDto, ImportFileFormat, ImportSourceProfileCode, ImportSourceProfileDto, ImportTable } from '@/app/features/imports/models/import-api.model';
import { ImportsService } from '@/app/features/imports/services/imports.service';
import { saveDownload } from '@/app/features/imports/utils/import-download.utils';
import { duplicateBatchId, importErrorMessage, importStatusLabel, isDiscardable } from '@/app/features/imports/utils/import-labels.utils';
import { EVET_UPLOAD_FILES, type EVetUploadFileDef, type EVetUploadSlot, IMPORT_CSV_FIELD, IMPORT_CSV_TEMPLATE_FILE, IMPORT_TABLE_LABELS, IMPORT_TABLES, needsClinic } from '@/app/features/imports/utils/import-schema.utils';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppTrialLimitNoticeComponent } from '@/app/shared/ui/trial-limit-notice/app-trial-limit-notice.component';
import { isTrialLimitError } from '@/app/shared/utils/api-error.utils';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';

type UploadMode = 'xlsx' | 'csv';

/** Ekranlar: program sorusu, dosya (genel yol: dosya ve gönderme tek ekranda), E-vet'te her dosya ayrı ekran ve sonda özet. */
type UploadScreen = 'program' | 'file' | EVetUploadSlot | 'summary';

/** Parti adı sınırı (sunucu `ImportBatch.MaxNameLength`). */
const MAX_BATCH_NAME_LENGTH = 100;

const NO_CSV_FILES: Readonly<Record<ImportTable, File | null>> = { customers: null, pets: null, vaccinations: null, clinicalRecords: null, accountEntries: null, appointments: null, products: null };
const NO_EVET_FILES: Readonly<Record<EVetUploadSlot, File | null>> = { backup: null, patientReport: null, vaccineReport: null, products: null };

/** "Yükledikten sonra ne olacak?": sihirbazın dört adımı, sade dille. */
const ROADMAP: readonly { n: number; title: string; text: string }[] = [
    { n: 1, title: 'Dosya', text: 'Dosyanızı yüklersiniz.' },
    { n: 2, title: 'Eşleme', text: 'Sütunların karşılığını onaylarsınız.' },
    { n: 3, title: 'Doğrulama', text: 'Ne gelecek, ne gelmeyecek görürsünüz.' },
    { n: 4, title: 'Onay', text: 'Siz onaylayınca kayıtlar oluşur.' }
];

const REQUIREMENT_TONE: Readonly<Record<EVetUploadFileDef['requirement'], string>> = {
    zorunlu: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    önerilir: 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300',
    'isteğe bağlı': 'bg-surface-100 dark:bg-surface-800 text-muted-color'
};

/**
 * Adım 1: her ekranda tek soru. Önce "hangi programdan geliyorsunuz?", sonra o programın dosyaları (nereden alınır, buraya bırakın),
 * en sonda gönderme. Dosya yalnızca bu istekle sunucuya gider; adreste veya günlükte yer almaz.
 */
@Component({
    selector: 'app-import-upload-page',
    standalone: true,
    imports: [NgTemplateOutlet, FormsModule, RouterLink, ButtonModule, InputTextModule, MessageModule, ProgressBarModule, SelectModule, ImportDropZoneComponent, AppPageHeaderComponent, AppTrialLimitNoticeComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-page-header title="Yeni içe aktarma" description="Adım 1 / 4 · Eski programınızdaki kayıtları dosyayla yükleyin. Bu adımda hiçbir kayıt oluşmaz.">
            <div actions>
                <a pButton size="small" severity="secondary" [routerLink]="listRoute"><i class="p-button-icon pi pi-arrow-left"></i>Geçmişe dön</a>
            </div>
        </app-page-header>

        <div class="card">
            <div class="max-w-2xl mx-auto flex flex-col gap-4">
                @if (submitting()) {
                    <!-- Yükleniyor -->
                    <section role="status" aria-live="polite" data-testid="import-upload-progress">
                        <h2 class="m-0 mb-4 text-xl font-semibold">Dosyalarınız yükleniyor</h2>
                        <ol class="list-none p-0 m-0 flex flex-col gap-3">
                            <li class="flex gap-3">
                                <i class="mt-0.5 self-start shrink-0" [class]="uploadPercent() < 100 ? 'pi pi-spin pi-spinner text-primary' : 'pi pi-check-circle text-primary'" aria-hidden="true"></i>
                                <div class="flex-1 min-w-0">
                                    @if (uploadPercent() < 100) {
                                        <div class="font-medium">Dosyalar gönderiliyor… %{{ uploadPercent() }}</div>
                                        <p-progressbar [value]="uploadPercent()" [showValue]="false" styleClass="h-2 mt-2" />
                                        <div class="text-sm text-muted-color mt-1">Gönderim bitene kadar bu sayfada kalın.</div>
                                    } @else {
                                        <div class="font-medium">Dosyalar gönderildi</div>
                                    }
                                </div>
                            </li>
                            <li class="flex gap-3" [class.opacity-50]="uploadPercent() < 100">
                                <i class="mt-0.5 self-start shrink-0" [class]="uploadPercent() < 100 ? 'pi pi-circle text-muted-color' : 'pi pi-spin pi-spinner text-primary'" aria-hidden="true"></i>
                                <div class="flex-1 min-w-0">
                                    <div class="font-medium">Dosyalar okunuyor ve dönüştürülüyor</div>
                                    @if (uploadPercent() >= 100) {
                                        <p-progressbar mode="indeterminate" styleClass="h-2 mt-2" />
                                        <div class="text-sm text-muted-color mt-1">
                                            Büyük bir E-vet yedeğinde bu adım bir dakikaya kadar sürebilir. Sayfayı kapatsanız da işlem sürer; içe aktarma <a [routerLink]="listRoute" class="text-primary">Veri içe aktarma</a> listesinde görünür,
                                            oradan kaldığınız yerden devam edebilirsiniz.
                                        </div>
                                    }
                                </div>
                            </li>
                            <li class="flex gap-3 opacity-50">
                                <i class="pi pi-circle text-muted-color mt-0.5" aria-hidden="true"></i>
                                <div class="font-medium">Adım 2 · Eşleme kendiliğinden açılır</div>
                            </li>
                        </ol>
                    </section>
                } @else if (!profilesReady()) {
                    <p class="m-0 text-muted-color">Yükleniyor…</p>
                } @else {
                    @switch (screen()) {
                        @case ('program') {
                            @if (openDrafts().length > 0) {
                                <section class="flex flex-col gap-2" data-testid="import-open-drafts">
                                    @for (d of openDrafts(); track d.id) {
                                        <div class="rounded-border border border-primary bg-primary-50 dark:bg-primary-950/40 p-3 sm:p-4 flex flex-wrap items-center gap-3">
                                            <i class="pi pi-history text-primary text-xl" aria-hidden="true"></i>
                                            <div class="min-w-0 grow basis-56">
                                                <div class="font-medium">Yarım kalan aktarmanız var</div>
                                                <div class="text-sm text-muted-color break-words">{{ d.name || 'Adsız içe aktarma' }} · {{ formatDate(d.createdAtUtc) }} · {{ statusLabel(d.status) }}</div>
                                            </div>
                                            <a pButton size="small" [routerLink]="[listRoute, d.id]">Kaldığım yerden devam et<i class="p-button-icon pi pi-arrow-right"></i></a>
                                        </div>
                                    }
                                </section>
                            }
                            <section>
                                <h2 class="m-0 text-xl sm:text-2xl font-semibold">{{ openDrafts().length ? 'Ya da yeni bir aktarma başlatın: hangi programdan geliyorsunuz?' : 'Hangi programdan geliyorsunuz?' }}</h2>
                                <p class="m-0 mt-1 text-muted-color">Seçiminize göre hangi dosyayı nereden alacağınızı adım adım gösteririz.</p>
                                <div class="flex flex-col gap-2 mt-4" role="radiogroup" aria-label="Kaynak program" data-testid="import-source-profile">
                                    @for (p of orderedProfiles(); track p.code) {
                                        <button
                                            type="button"
                                            role="radio"
                                            class="rounded-border border-2 p-4 text-left text-color cursor-pointer flex items-center gap-3"
                                            [class]="sourceProfile() === p.code ? 'border-primary bg-primary-50 dark:bg-primary-950/40' : 'border-surface bg-transparent hover:bg-emphasis'"
                                            [attr.aria-checked]="sourceProfile() === p.code"
                                            [attr.data-profile]="p.code"
                                            (click)="chooseProfile(p.code)"
                                        >
                                            <span class="min-w-0 flex-1">
                                                <span class="block font-semibold">{{ p.code === 'Generic' ? 'Programım listede yok' : p.displayName }}</span>
                                                <span class="block text-sm text-muted-color">{{ p.code === 'Generic' ? p.displayName + ' · ' + p.note : p.note }}</span>
                                            </span>
                                            <i class="pi pi-angle-right text-muted-color" aria-hidden="true"></i>
                                        </button>
                                    }
                                </div>
                                <p class="m-0 mt-4 text-sm text-muted-color">
                                    Excel'e aktarabildiğiniz her liste yüklenir; programınızın listede olması gerekmez.
                                    @if (canRequestSupport) {
                                        Takılırsanız <a [routerLink]="migrationSupportRoute" class="text-primary font-medium" data-testid="import-migration-support-link">geçiş desteği isteyin</a>; dosyanızı e-postayla göndermeyin, buradan kendiniz
                                        yükleyin.
                                    }
                                </p>
                            </section>
                        }

                        @case ('file') {
                            <!-- Genel yol: dosya ve gönderme tek ekranda -->
                            <section class="flex flex-col gap-4">
                                <div>
                                    <h2 class="m-0 text-xl sm:text-2xl font-semibold">{{ fileTitle() }}</h2>
                                    @if (selectedProfile(); as p) {
                                        <p class="m-0 mt-1 text-muted-color" data-testid="import-source-profile-note">{{ p.note }}</p>
                                        @if (!p.verified && p.mappings.length > 0) {
                                            <p class="m-0 mt-1 text-sm text-amber-700 dark:text-amber-300">Bu programın hazır eşlemesi gerçek dosyayla henüz doğrulanmadı; eşleme adımında kontrol edin.</p>
                                        }
                                    }
                                </div>

                                <div class="rounded-border bg-surface-50 dark:bg-surface-800 p-4" data-testid="import-generic-guide">
                                    <div class="text-sm font-semibold mb-2">Nereden alacağım?</div>
                                    <p class="m-0">
                                        Eski programınızda müşteri ve hasta listesini, varsa aşı, muayene, randevu ve ürün listelerini Excel olarak dışa aktarın. Başlıkların bizimkilerle aynı olması gerekmez; sütunları sonraki adımda eşlersiniz.
                                    </p>
                                    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm">
                                        <span class="text-muted-color">Elinizde dosya yok mu?</span>
                                        <button pButton type="button" size="small" severity="secondary" [text]="true" [disabled]="templateBusy() === 'xlsx'" data-testid="import-template-xlsx" (click)="template('xlsx')">
                                            <i class="p-button-icon" [class]="templateBusy() === 'xlsx' ? 'pi pi-spin pi-spinner' : 'pi pi-download'"></i>Boş Excel şablonunu indirin
                                        </button>
                                    </div>
                                </div>

                                @if (mode() === 'xlsx') {
                                    <app-import-drop-zone label="Excel dosyası (.xlsx)" extension=".xlsx" [file]="xlsxFile()" (fileChange)="setXlsx($event)" />
                                    <button type="button" class="self-start bg-transparent border-0 p-0 text-sm text-primary font-medium cursor-pointer" data-testid="import-mode-csv" (click)="setMode('csv')">Dosyalarım CSV</button>
                                } @else {
                                    <div class="flex flex-col gap-3" data-testid="import-csv">
                                        <div class="flex flex-wrap items-center justify-between gap-2">
                                            <span class="font-medium">CSV dosyaları <span class="font-normal text-sm text-muted-color">· her liste ayrı dosya; en az biri yeter</span></span>
                                            <button type="button" class="bg-transparent border-0 p-0 text-sm text-primary font-medium cursor-pointer" data-testid="import-mode-xlsx" (click)="setMode('xlsx')">Excel dosyası yükleyeceğim</button>
                                        </div>
                                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            @for (t of tables; track t) {
                                                <div class="flex flex-col gap-1">
                                                    <app-import-drop-zone [label]="tableLabels[t] + ' (.csv)'" extension=".csv" [file]="csvFiles()[t]" (fileChange)="setCsv(t, $event)" />
                                                    <button type="button" class="self-start bg-transparent border-0 p-0 text-sm text-muted-color cursor-pointer hover:text-primary" [disabled]="templateBusy() === t" (click)="template('csv', t)">
                                                        <i class="mr-1" [class]="templateBusy() === t ? 'pi pi-spin pi-spinner' : 'pi pi-download'" aria-hidden="true"></i>Şablonu indir
                                                    </button>
                                                </div>
                                            }
                                        </div>
                                        <p class="text-sm text-muted-color m-0">Hastalar ve hesap hareketleri müşterilere; aşılar, klinik geçmiş ve randevular hastalara dosyalar arasında bağlanır. Ürünler bağımsızdır.</p>
                                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div class="flex flex-col gap-1">
                                                <label for="importEncoding" class="text-sm font-medium">Karakter kodlaması</label>
                                                <p-select inputId="importEncoding" [options]="encodingOptions" [ngModel]="encoding()" (ngModelChange)="encoding.set($event)" optionLabel="label" optionValue="value" class="w-full" />
                                                <small class="text-muted-color">Türkçe harfler bozuk görünürse Windows-1254 deneyin.</small>
                                            </div>
                                            <div class="flex flex-col gap-1">
                                                <label for="importDelimiter" class="text-sm font-medium">Ayırıcı</label>
                                                <p-select inputId="importDelimiter" [options]="delimiterOptions" [ngModel]="delimiter()" (ngModelChange)="delimiter.set($event)" optionLabel="label" optionValue="value" class="w-full" />
                                            </div>
                                        </div>
                                    </div>
                                }

                                <ng-container *ngTemplateOutlet="send" />
                                @if (hasProgramScreen()) {
                                    <button pButton type="button" severity="secondary" [text]="true" class="self-start -ml-2" data-testid="import-back" (click)="go(index() - 1)"><i class="p-button-icon pi pi-arrow-left"></i>Geri</button>
                                }
                            </section>
                        }

                        @case ('summary') {
                            <section class="flex flex-col gap-4">
                                <h2 class="m-0 text-xl sm:text-2xl font-semibold">Hazırsınız: gönderelim mi?</h2>
                                <ul class="list-none p-0 m-0 rounded-border border border-surface divide-y divide-surface-200 dark:divide-surface-700" data-testid="import-evet-summary">
                                    @for (f of evetFileDefs; track f.slot) {
                                        <li class="flex items-center gap-3 p-3">
                                            <i [class]="evetFiles()[f.slot] ? 'pi pi-check-circle text-primary' : 'pi pi-minus-circle text-muted-color'" aria-hidden="true"></i>
                                            <span class="min-w-0 flex-1">
                                                <span class="block font-medium">{{ f.label }}</span>
                                                <span class="block text-sm text-muted-color break-words">{{ evetFiles()[f.slot]?.name ?? (f.requirement === 'zorunlu' ? 'Seçilmedi; bu dosya olmadan aktarma başlamaz' : 'Yüklenmeyecek') }}</span>
                                            </span>
                                            <button type="button" class="bg-transparent border-0 p-0 text-sm text-primary font-medium cursor-pointer" (click)="goTo(f.slot)">{{ evetFiles()[f.slot] ? 'Değiştir' : 'Ekle' }}</button>
                                        </li>
                                    }
                                </ul>
                                <ng-container *ngTemplateOutlet="send" />
                                <button pButton type="button" severity="secondary" [text]="true" class="self-start -ml-2" data-testid="import-back" (click)="go(index() - 1)"><i class="p-button-icon pi pi-arrow-left"></i>Geri</button>
                            </section>
                        }

                        @default {
                            <!-- E-vet: her dosya ayrı ekran -->
                            @if (currentEVetFile(); as f) {
                                <section class="flex flex-col gap-4">
                                    <div class="flex items-center gap-3">
                                        <div class="flex-1 flex gap-1" aria-hidden="true">
                                            @for (d of evetFileDefs; track d.slot; let i = $index) {
                                                <span class="h-1.5 flex-1 rounded-full" [class]="i <= evetFileIndex() ? 'bg-primary' : 'bg-surface-200 dark:bg-surface-700'"></span>
                                            }
                                        </div>
                                        <span class="text-sm text-muted-color tabular-nums" data-testid="import-file-counter">Dosya {{ evetFileIndex() + 1 }} / {{ evetFileDefs.length }}</span>
                                    </div>

                                    <div>
                                        <div class="flex flex-wrap items-center gap-2">
                                            <h2 class="m-0 text-xl sm:text-2xl font-semibold">{{ f.label }}</h2>
                                            <span class="inline-block text-xs rounded-full px-2 py-0.5 whitespace-nowrap" [class]="requirementTone[f.requirement]">{{ f.requirement }}</span>
                                        </div>
                                        <p class="m-0 mt-1 text-muted-color">Bu dosyadan gelir: {{ f.contents.toLocaleLowerCase('tr-TR') }}.</p>
                                    </div>

                                    <div class="rounded-border bg-surface-50 dark:bg-surface-800 p-4" data-testid="import-evet-guide">
                                        <div class="text-sm font-semibold mb-2">Nereden alacağım?</div>
                                        <div class="flex flex-wrap items-center gap-1 mb-2 text-sm" [attr.aria-label]="'Menü yolu: ' + f.menu">
                                            <span class="text-muted-color mr-1">E-vet'te şu menüyü açın:</span>
                                            @for (m of menuPath(f.menu); track $index; let last = $last) {
                                                <span class="rounded-border border border-surface bg-surface-0 dark:bg-surface-900 px-2 py-0.5 font-medium whitespace-nowrap">{{ m }}</span>
                                                @if (!last) {
                                                    <i class="pi pi-angle-right text-xs text-muted-color" aria-hidden="true"></i>
                                                }
                                            }
                                        </div>
                                        <p class="m-0">{{ f.instruction }}</p>
                                        @if (f.caution) {
                                            <p class="m-0 mt-2 flex gap-2 text-amber-700 dark:text-amber-300"><i class="pi pi-exclamation-triangle mt-0.5" aria-hidden="true"></i>{{ f.caution }}</p>
                                        }
                                    </div>

                                    <app-import-drop-zone [label]="f.label" [description]="f.contents" [extension]="f.extension" [file]="evetFiles()[f.slot]" (fileChange)="setEVet(f.slot, $event)" />

                                    <div class="flex flex-wrap items-center gap-2">
                                        <button pButton type="button" severity="secondary" data-testid="import-back" (click)="go(index() - 1)"><i class="p-button-icon pi pi-arrow-left"></i>Geri</button>
                                        @if (evetFiles()[f.slot]) {
                                            <button pButton type="button" data-testid="import-next" (click)="go(index() + 1)">Devam<i class="p-button-icon pi pi-arrow-right"></i></button>
                                        } @else if (f.requirement === 'zorunlu') {
                                            <button pButton type="button" data-testid="import-next" [disabled]="true">Devam<i class="p-button-icon pi pi-arrow-right"></i></button>
                                            <span class="text-sm text-muted-color">Bu dosya olmadan aktarma başlamaz.</span>
                                        } @else {
                                            <button pButton type="button" severity="secondary" [outlined]="true" data-testid="import-skip" (click)="go(index() + 1)">Bu dosyam yok, geç</button>
                                            <span class="text-sm text-muted-color">Aktarma bu dosya olmadan da yapılır.</span>
                                        }
                                    </div>
                                </section>
                            }
                        }
                    }
                }

                <!-- Gönderme: klinik, ad, hata, düğme ve sırada ne olduğu -->
                <ng-template #send>
                    <div class="flex flex-col gap-2">
                        @if (singleClinicName(); as clinic) {
                            <div class="text-sm" data-testid="import-clinic-info">
                                <i class="pi pi-building mr-1.5 text-muted-color" aria-hidden="true"></i>Kayıtlar <b>{{ clinic }}</b> kliniğine yazılır.
                            </div>
                        } @else {
                            <div class="flex flex-col gap-1">
                                <label for="importClinic" class="text-sm font-medium">Kayıtlar hangi kliniğe yazılsın? {{ clinicRequired() ? '(zorunlu)' : '' }}</label>
                                <p-select
                                    inputId="importClinic"
                                    [options]="clinicOptions()"
                                    [ngModel]="clinicId()"
                                    (ngModelChange)="clinicId.set($event)"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Klinik seçin"
                                    [showClear]="!clinicRequired()"
                                    [loading]="clinicsLoading()"
                                    class="w-full sm:w-80"
                                />
                                <small class="text-muted-color">{{ clinicHint() }}</small>
                            </div>
                        }
                        @if (nameOpen()) {
                            <div class="flex flex-col gap-1">
                                <label for="importName" class="text-sm font-medium">Bu aktarmanın adı <span class="font-normal text-muted-color">(isteğe bağlı)</span></label>
                                <input pInputText id="importName" maxlength="100" class="w-full sm:w-96" [ngModel]="name()" (ngModelChange)="name.set($event)" placeholder="Örn. Eski sistem 1. parti" />
                                <small class="text-muted-color">Geçmiş listesinde görünür; boş bırakırsanız dosyanın adı kullanılır. Kişisel veri yazmayın.</small>
                            </div>
                        } @else {
                            <button type="button" class="self-start bg-transparent border-0 p-0 text-sm text-primary font-medium cursor-pointer" data-testid="import-name-open" (click)="nameOpen.set(true)">Bu aktarmaya ad ver (isteğe bağlı)</button>
                        }
                    </div>

                    @if (error(); as error) {
                        @if (trialLimited()) {
                            <app-trial-limit-notice [message]="error" />
                        } @else {
                            <p-message severity="error" class="w-full" role="alert">{{ error }}</p-message>
                        }
                    }
                    @if (duplicateId()) {
                        <p-message severity="info" class="w-full" data-testid="import-duplicate">
                            Bu dosya zaten yüklendi; yeniden yüklemenize gerek yok. <a [routerLink]="[listRoute, duplicateId()]" class="text-primary font-medium">Yüklenen içe aktarmaya git</a>
                        </p-message>
                    }

                    <div class="flex flex-wrap items-center gap-3">
                        <button pButton type="button" [disabled]="!!blockedReason()" data-testid="import-submit" (click)="submit()"><i class="p-button-icon pi pi-upload"></i>Yükle ve eşlemeye geç</button>
                        <span class="text-sm text-muted-color" data-testid="import-submit-hint">{{ blockedReason() ?? 'Bu adımda hiçbir kayıt oluşmaz.' }}</span>
                    </div>

                    <div class="pt-4 border-t border-surface" data-testid="import-roadmap">
                        <div class="text-sm font-semibold mb-2">Yükledikten sonra ne olacak?</div>
                        <ol class="list-none p-0 m-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            @for (s of roadmap; track s.n) {
                                <li class="flex gap-2.5">
                                    <span class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold shrink-0" [class]="s.n === 1 ? 'bg-primary text-primary-contrast' : 'border border-surface text-muted-color'">{{
                                        s.n
                                    }}</span>
                                    <span class="min-w-0">
                                        <span class="block text-sm font-medium">{{ s.title }}</span>
                                        <span class="block text-sm text-muted-color">{{ s.text }}</span>
                                    </span>
                                </li>
                            }
                        </ol>
                        <p class="m-0 mt-2 text-sm text-muted-color"><i class="pi pi-shield mr-1" aria-hidden="true"></i>Son adımda siz onaylamadan hiçbir kayıt oluşmaz; her adımda geri dönebilirsiniz.</p>
                    </div>
                </ng-template>
            </div>
        </div>
    `
})
export class ImportUploadPageComponent implements OnInit {
    private readonly imports = inject(ImportsService);
    private readonly clinics = inject(ClinicsService);
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    readonly listRoute = IMPORTS_ROUTE;
    readonly tables = IMPORT_TABLES;
    readonly tableLabels = IMPORT_TABLE_LABELS;
    readonly evetFileDefs = EVET_UPLOAD_FILES;
    protected readonly roadmap = ROADMAP;
    protected readonly requirementTone = REQUIREMENT_TONE;
    readonly encodingOptions = [
        { label: 'Otomatik', value: '' },
        { label: 'UTF-8', value: 'utf-8' },
        { label: 'Windows-1254 (Türkçe)', value: 'windows-1254' }
    ];
    readonly delimiterOptions = [
        { label: 'Otomatik', value: '' },
        { label: 'Noktalı virgül (;)', value: ';' },
        { label: 'Virgül (,)', value: ',' },
        { label: 'Sekme', value: '\t' }
    ];

    /** TIER-021: sütun önerisini seçer; profiller sunucudan gelir. Seçilmeden önce null; liste gelmezse genel yol. */
    readonly sourceProfile = signal<ImportSourceProfileCode | null>(null);
    readonly mode = signal<UploadMode>('xlsx');
    readonly clinicId = signal<string | null>(null);
    readonly name = signal('');
    readonly encoding = signal('');
    readonly delimiter = signal('');
    /** Açık ekranın sırası (`screens`). */
    readonly index = signal(0);

    readonly xlsxFile = signal<File | null>(null);
    readonly csvFiles = signal<Record<ImportTable, File | null>>(NO_CSV_FILES);
    /** E-vet yolu: yedek zorunlu, raporlar isteğe bağlı (`EVET_UPLOAD_FILES`). */
    readonly evetFiles = signal<Record<EVetUploadSlot, File | null>>(NO_EVET_FILES);
    readonly clinicOptions = signal<{ label: string; value: string }[]>([]);
    readonly clinicsLoading = signal(false);
    readonly templateBusy = signal<string | null>(null);
    readonly submitting = signal(false);
    readonly error = signal<string | null>(null);
    /** Hata deneme kısıtı (`Trial.ImportLimitExceeded`, sözleşme §3.2): mesajın yanında "Aboneliğe geç" eylemi gösterilir. */
    readonly trialLimited = signal(false);
    readonly duplicateId = signal<string | null>(null);
    /** Gönderim yüzdesi; 100 olunca sunucu dosyayı okuyup dönüştürüyordur. */
    readonly uploadPercent = signal(0);
    /** Yarım kalmış (taslak ya da doğrulanan) içe aktarmalar: sayfa yenilenince ya da tekrar gelince kaldığı yerden devam için. */
    readonly openDrafts = signal<ImportBatchDto[]>([]);
    readonly profiles = signal<ImportSourceProfileDto[]>([]);
    protected readonly profilesReady = signal(false);
    protected readonly nameOpen = signal(false);
    readonly canRequestSupport = this.auth.hasOperationClaim(CUSTOM_DEVELOPMENT_REQUESTS_MANAGE_CLAIM);
    readonly migrationSupportRoute = MIGRATION_SUPPORT_ROUTE;

    /** Adı bilinen programlar önce, genel yol ("Programım listede yok") sonda. */
    protected readonly orderedProfiles = computed(() => [...this.profiles().filter((p) => p.code !== 'Generic'), ...this.profiles().filter((p) => p.code === 'Generic')]);
    protected readonly selectedProfile = computed(() => this.profiles().find((p) => p.code === this.sourceProfile()));
    /** E-vet yedeği aşı, muayene, randevu ve bakiye içerir; ayrı yükleme alanları ve zorunlu klinikle gider. */
    protected readonly isEVet = computed(() => this.sourceProfile() === 'EVet');
    /** Profil listesi gelmediyse program sorusu sorulmaz. */
    protected readonly hasProgramScreen = computed(() => this.profiles().length > 0);

    protected readonly screens = computed<UploadScreen[]>(() => {
        if (!this.sourceProfile()) {
            return ['program'];
        }

        const start: UploadScreen[] = this.hasProgramScreen() ? ['program'] : [];

        return this.isEVet() ? [...start, ...EVET_UPLOAD_FILES.map((f) => f.slot), 'summary'] : [...start, 'file'];
    });
    protected readonly screen = computed(() => this.screens()[Math.min(this.index(), this.screens().length - 1)]);
    protected readonly currentEVetFile = computed(() => EVET_UPLOAD_FILES.find((f) => f.slot === this.screen()) ?? null);
    protected readonly evetFileIndex = computed(() => EVET_UPLOAD_FILES.findIndex((f) => f.slot === this.screen()));

    /** Genel yolda başlık: adı bilinen programda "Kolayvet dosyanızı yükleyin". */
    protected readonly fileTitle = computed(() => {
        const p = this.selectedProfile();

        return p && p.code !== 'Generic' ? `${p.displayName} dosyanızı yükleyin` : 'Dosyanızı yükleyin';
    });

    private readonly hasFile = computed(() => {
        if (this.isEVet()) {
            return !!this.evetFiles().backup;
        }

        return this.mode() === 'xlsx' ? !!this.xlsxFile() : Object.values(this.csvFiles()).some(Boolean);
    });

    protected readonly clinicRequired = computed(() => {
        const files = this.csvFiles();

        return this.isEVet() || (this.mode() === 'csv' && needsClinic(IMPORT_TABLES.filter((t) => !!files[t])));
    });

    protected readonly clinicHint = computed(() =>
        this.isEVet() ? 'Yedekteki aşı, muayene, randevu ve açık bakiye bu kliniğe yazılır.' : 'Aşı, klinik geçmiş, hesap hareketi, randevu ve açık bakiye bu kliniğe yazılır. Bu listelerden biri varsa klinik gereklidir.'
    );

    /** Tek klinik varsa ve o seçiliyse seçim yerine bilgi satırı gösterilir. */
    protected readonly singleClinicName = computed(() => {
        const options = this.clinicOptions();

        return options.length === 1 && options[0].value === this.clinicId() ? options[0].label : null;
    });

    /** Gönderilemiyorsa düğmenin yanında yazan neden; gönderilebiliyorsa null. */
    protected readonly blockedReason = computed<string | null>(() => {
        if (!this.hasFile()) {
            return this.isEVet() ? 'Önce E-vet yedeğini seçin.' : this.mode() === 'csv' ? 'Önce en az bir CSV dosyası seçin.' : 'Önce dosyanızı seçin.';
        }

        return this.clinicRequired() && !this.clinicId() ? 'Kayıtların yazılacağı kliniği seçin.' : null;
    });

    /** Aynı yükleme tekrarında aynı parti dönsün diye dosya değişene kadar sabit. */
    private requestId = crypto.randomUUID();

    ngOnInit(): void {
        // Liste gelmezse program sorusu atlanır; yükleme genel eş anlamlılarla sürer (içe aktarma kilitlenmez).
        this.imports.getSourceProfiles().subscribe({
            next: (list) => this.setProfiles(list),
            error: () => this.setProfiles([])
        });
        // Liste okunamazsa ipucu gösterilmez; yükleme etkilenmez.
        this.imports.listBatches(1, 20).subscribe({
            next: (page) => this.openDrafts.set((page.items ?? []).filter((b) => isDiscardable(b.status) || b.status === 'Validating')),
            error: () => this.openDrafts.set([])
        });
        this.clinicId.set(this.auth.getClinicId());
        this.clinicsLoading.set(true);
        this.clinics.listClinics().subscribe({
            next: (list) => {
                this.clinicOptions.set(list.filter((c) => c.isActive !== false).map((c) => ({ label: c.name, value: c.id })));
                this.clinicsLoading.set(false);
            },
            error: () => this.clinicsLoading.set(false)
        });
    }

    /** Program seçilir ve o programın ilk ekranı açılır; program değiştiyse dosyalar temizlenir. */
    chooseProfile(code: ImportSourceProfileCode): void {
        if (this.sourceProfile() !== code) {
            this.sourceProfile.set(code);
            this.onProfileChange();
        }

        this.go(1);
    }

    /** Önceki profilin dosyaları yeni profille gönderilmesin diye tüm seçimler temizlenir. */
    onProfileChange(): void {
        this.xlsxFile.set(null);
        this.csvFiles.set(NO_CSV_FILES);
        this.evetFiles.set(NO_EVET_FILES);
        this.resetAttempt();
    }

    setMode(mode: UploadMode): void {
        this.mode.set(mode);
        this.resetAttempt();
    }

    setEVet(slot: EVetUploadSlot, file: File | null): void {
        this.evetFiles.update((cur) => ({ ...cur, [slot]: file }));
        this.resetAttempt();
    }

    setXlsx(file: File | null): void {
        this.xlsxFile.set(file);
        this.resetAttempt();
    }

    setCsv(table: ImportTable, file: File | null): void {
        this.csvFiles.update((cur) => ({ ...cur, [table]: file }));
        this.resetAttempt();
    }

    protected go(i: number): void {
        this.index.set(Math.max(0, Math.min(i, this.screens().length - 1)));
    }

    protected goTo(screen: UploadScreen): void {
        this.go(this.screens().indexOf(screen));
    }

    /** "Genel > Yedek Al" → ["Genel", "Yedek Al"] */
    protected menuPath(menu: string): string[] {
        return menu.split(' > ');
    }

    template(format: ImportFileFormat, table?: ImportTable): void {
        this.templateBusy.set(table ?? format);
        this.imports.downloadTemplate(format, table).subscribe({
            next: (res) => {
                this.templateBusy.set(null);
                saveDownload(res, format === 'xlsx' || !table ? 'vetinity-iceaktar-sablon.xlsx' : IMPORT_CSV_TEMPLATE_FILE[table]);
            },
            error: (e: unknown) => {
                this.templateBusy.set(null);
                this.error.set(importErrorMessage(e, 'Şablon indirilemedi.'));
            }
        });
    }

    submit(): void {
        if (this.blockedReason() || this.submitting()) {
            return;
        }

        const form = new FormData();
        const profile = this.sourceProfile() ?? 'Generic';

        form.append('requestId', this.requestId);

        if (this.isEVet()) {
            const files = this.evetFiles();

            for (const f of EVET_UPLOAD_FILES) {
                const file = files[f.slot];

                if (file) form.append(f.field, file);
            }
        } else if (this.mode() === 'xlsx') {
            form.append('file', this.xlsxFile()!);
        } else {
            const files = this.csvFiles();

            for (const t of IMPORT_TABLES) {
                const file = files[t];

                if (file) form.append(IMPORT_CSV_FIELD[t], file);
            }

            if (this.encoding()) form.append('encoding', this.encoding());
            if (this.delimiter()) form.append('delimiter', this.delimiter());
        }

        if (this.clinicId()) form.append('clinicId', this.clinicId()!);
        // Ad verilmezse listede hangi dosyayla oluştuğu anlaşılsın diye ana dosyanın adı kullanılır.
        const name = (this.name().trim() || this.primaryFileName()).slice(0, MAX_BATCH_NAME_LENGTH);

        if (name) form.append('name', name);
        if (profile !== 'Generic') form.append('sourceProfile', profile);

        this.error.set(null);
        this.trialLimited.set(false);
        this.duplicateId.set(null);
        this.uploadPercent.set(0);
        this.submitting.set(true);
        this.imports.createBatch(form).subscribe({
            next: (event) => {
                if (event.type === 'progress') {
                    this.uploadPercent.set(event.percent);

                    return;
                }

                this.submitting.set(false);
                void this.router.navigate([IMPORTS_ROUTE, event.batch.id], { state: { warnings: event.batch.warnings ?? [] } });
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                this.duplicateId.set(duplicateBatchId(e));
                this.trialLimited.set(isTrialLimitError(e));
                this.error.set(importErrorMessage(e, 'Dosya yüklenemedi. Tekrar deneyin.'));
            }
        });
    }

    protected statusLabel = importStatusLabel;

    protected formatDate(utc: string): string {
        return formatUtcIsoAsLocalDateTimeDisplay(utc);
    }

    resetAttempt(): void {
        this.requestId = crypto.randomUUID();
        this.error.set(null);
        this.trialLimited.set(false);
        this.duplicateId.set(null);
    }

    /** Liste boşsa genel yol kendiliğinden seçilir ve doğrudan dosya ekranı açılır. */
    private setProfiles(list: ImportSourceProfileDto[]): void {
        this.profiles.set(list);

        if (list.length === 0) {
            this.sourceProfile.set('Generic');
        }

        this.profilesReady.set(true);
    }

    /** Ana dosyanın adı: E-vet yedeği, Excel dosyası ya da ilk CSV. */
    private primaryFileName(): string {
        if (this.isEVet()) {
            return this.evetFiles().backup?.name ?? '';
        }

        return this.mode() === 'xlsx' ? (this.xlsxFile()?.name ?? '') : (Object.values(this.csvFiles()).find(Boolean)?.name ?? '');
    }
}
