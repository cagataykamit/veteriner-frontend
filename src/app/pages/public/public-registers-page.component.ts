import { DOCUMENT } from '@angular/common';
import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { publicSiteToneClass } from '@/app/features/public/utils/public-site-tone.utils';
import {
    PUBLIC_DATA_EXPORT_PLANS,
    PUBLIC_DATA_EXPORT_POINTS,
    PUBLIC_KVKK_NOTE,
    PUBLIC_KVKK_STEPS,
    PUBLIC_RECORD_SAFETY_ITEMS,
    PUBLIC_REGISTERS,
    PUBLIC_REGISTERS_NOTE
} from '@/app/features/public/utils/public-registers-content.utils';
import { PUBLIC_REGISTERS_PAGE_META, setPublicPageMeta } from '@/app/features/public/utils/public-seo.utils';
import { PublicCtaComponent } from './components/public-cta.component';
import { PublicPageHeaderComponent } from './components/public-page-header.component';
import { PublicScreenshotComponent } from './components/public-screenshot.component';

/** Defterler ve KVKK (tasarım belgesi 5.3): A defterler (tablo değil satır listesi, yanında defter ekranı), B KVKK 4 adım, tüm veriyi dışa aktarma, C erişim ve iz. */
@Component({
    selector: 'app-public-registers-page',
    standalone: true,
    imports: [PublicPageHeaderComponent, PublicScreenshotComponent, PublicCtaComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-public-page-header
            eyebrow="Defterler ve KVKK"
            title="Defterleriniz ve KVKK evrakınız kendiliğinden tutulur"
            lead="Türkiye'deki kliniğin yükümlülükleri için hazır: kayıt defterleri her kayıtla dolar, KVKK formları ve rıza kaydı tek yerde."
        />

        <!-- A Kayıt defterleri: tablo yerine satır listesi; yanında defter ekranı -->
        <section class="ps-section ps-section--tight" aria-labelledby="registers-title">
            <div class="ps-wrap">
                <div class="ps-panel ps-tone-mint ps-split">
                    <div>
                        <h2 id="registers-title" class="public-h2">Kayıt defterleri</h2>
                        <p class="public-lead">Ayrı defter tutmazsınız; muayene, reçete, aşı ve ilaç kayıtları ilgili deftere kendiliğinden işlenir.</p>
                        <ul class="ps-list ps-minis ps-minis--rows" data-registers>
                            @for (register of registers; track register.name) {
                                <li>
                                    <span class="ps-round ps-round--small" aria-hidden="true"><i class="pi pi-book"></i></span>
                                    <strong data-register-name>{{ register.name }}</strong>
                                    <p>{{ register.fills }}</p>
                                    <p class="ps-plan">{{ register.output }}</p>
                                </li>
                            }
                        </ul>
                    </div>
                    <app-public-screenshot crop="defterIcerik" phoneCrop="defterDar" />
                </div>
                <p class="public-note">{{ registersNote }}</p>
            </div>
        </section>

        <!-- B KVKK: dört adım noktalı yolda; yanında KVKK formu -->
        <section class="ps-section ps-section--band" aria-labelledby="kvkk-title">
            <div class="ps-wrap">
                <header class="ps-head ps-head--center">
                    <h2 id="kvkk-title" class="public-h2">KVKK</h2>
                    <p class="public-lead">Aydınlatmadan veri kopyasına dört adım; hangi müşterinin hangi metne ne zaman rıza verdiği kayıtlıdır.</p>
                </header>
                <div class="ps-split">
                    <ol class="ps-list ps-steps">
                        @for (step of kvkkSteps; track step.title; let i = $index) {
                            <li [class]="toneOf(i)">
                                <span class="ps-bubble ps-bubble--big" aria-hidden="true">{{ i + 1 }}</span>
                                <div>
                                    <h3 class="ps-h3 ps-h3--first"><i [class]="step.icon" aria-hidden="true"></i> {{ step.title }}</h3>
                                    <p>{{ step.description }}</p>
                                </div>
                            </li>
                        }
                    </ol>
                    <app-public-screenshot shot="kvkkFormu" />
                </div>
                <p class="public-note">{{ kvkkNote }}</p>
            </div>
        </section>

        <!-- C Tüm veriyi dışa aktarma -->
        <section class="ps-section ps-section--tight" aria-labelledby="data-export-title">
            <div class="ps-wrap">
                <div class="ps-panel ps-tone-sky ps-feature">
                    <header class="ps-feature-head">
                        <span class="ps-bubble ps-bubble--big" aria-hidden="true"><i class="pi pi-download"></i></span>
                        <div>
                            <p class="ps-tagline"><span class="ps-chip">Veriniz sizde kalır</span><span class="ps-plan">{{ dataExportPlans }}</span></p>
                            <h2 id="data-export-title" class="public-h2">Tüm verinizi dışa aktarın</h2>
                            <p class="public-lead">Kayıtlarınız sizindir: başka bir sisteme geçerken ya da arşiv için hepsini tek pakette alırsınız. {{ dataExportPlans }}.</p>
                        </div>
                    </header>
                    <ul class="ps-list ps-points ps-points--two" data-testid="data-export-points">
                        @for (point of dataExportPoints; track point) {
                            <li><i class="pi pi-check" aria-hidden="true"></i><span>{{ point }}</span></li>
                        }
                    </ul>
                </div>
            </div>
        </section>

        <!-- D Erişim ve iz -->
        <section class="ps-section ps-section--tight" aria-labelledby="access-title">
            <div class="ps-wrap">
                <header class="ps-head ps-head--center">
                    <h2 id="access-title" class="public-h2">Erişim ve iz</h2>
                    <p class="public-lead">Kayıtlarınız güvende ve dürüst: kim ne zaman ne yaptı, her zaman belli.</p>
                </header>
                <div class="ps-cards4">
                    @for (item of accessItems; track item.title; let i = $index) {
                        <article [class]="'ps-card ' + toneOf(i)">
                            <span class="ps-round" aria-hidden="true"><i [class]="item.icon"></i></span>
                            <h3 class="ps-h3">{{ item.title }}</h3>
                            <p>{{ item.description }}</p>
                        </article>
                    }
                </div>
            </div>
        </section>

        <app-public-cta />
    `
})
export class PublicRegistersPageComponent implements OnInit {
    private readonly title = inject(Title);
    private readonly meta = inject(Meta);
    private readonly document = inject(DOCUMENT);

    readonly toneOf = publicSiteToneClass;

    readonly registers = PUBLIC_REGISTERS;
    readonly registersNote = PUBLIC_REGISTERS_NOTE;
    readonly kvkkSteps = PUBLIC_KVKK_STEPS;
    readonly kvkkNote = PUBLIC_KVKK_NOTE;
    readonly dataExportPoints = PUBLIC_DATA_EXPORT_POINTS;
    readonly dataExportPlans = PUBLIC_DATA_EXPORT_PLANS;
    readonly accessItems = PUBLIC_RECORD_SAFETY_ITEMS;

    ngOnInit(): void {
        setPublicPageMeta(this.title, this.meta, PUBLIC_REGISTERS_PAGE_META, this.document);
    }
}
