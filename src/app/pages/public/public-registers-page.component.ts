import { DOCUMENT } from '@angular/common';
import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import {
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

/** Defterler ve KVKK (tasarım belgesi 5.3): A defterler tablosu, B KVKK 4 adım, C erişim ve iz. */
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

        <div class="mx-auto max-w-6xl px-4 md:px-6">
            <section class="public-section" aria-labelledby="registers-title">
                <h2 id="registers-title" class="public-h2 m-0">Kayıt defterleri</h2>
                <p class="public-lead m-0 mt-3 max-w-2xl">Ayrı defter tutmazsınız; muayene, reçete, aşı ve ilaç kayıtları ilgili deftere kendiliğinden işlenir.</p>
                <div class="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-14">
                    <div class="public-card overflow-x-auto">
                        <table class="w-full border-collapse text-left text-sm">
                            <thead>
                                <tr class="border-b border-[var(--public-border)] text-xs uppercase tracking-wide text-muted-color">
                                    <th scope="col" class="px-4 py-3 font-semibold">Defter</th>
                                    <th scope="col" class="px-4 py-3 font-semibold">Ne zaman dolar</th>
                                    <th scope="col" class="px-4 py-3 font-semibold">Çıktı</th>
                                </tr>
                            </thead>
                            <tbody>
                                @for (register of registers; track register.name) {
                                    <tr class="border-b border-[var(--public-border)] last:border-b-0">
                                        <th scope="row" class="px-4 py-3 font-semibold text-surface-900 dark:text-surface-0">{{ register.name }}</th>
                                        <td class="px-4 py-3 text-surface-700 dark:text-surface-200">{{ register.fills }}</td>
                                        <td class="px-4 py-3 text-surface-700 dark:text-surface-200">{{ register.output }}</td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                    <app-public-screenshot shot="asiDefteri" />
                </div>
                <p class="public-note m-0 mt-6">{{ registersNote }}</p>
            </section>

            <section class="public-section" aria-labelledby="kvkk-title">
                <h2 id="kvkk-title" class="public-h2 m-0">KVKK</h2>
                <p class="public-lead m-0 mt-3 max-w-2xl">Aydınlatmadan veri kopyasına dört adım; hangi müşterinin hangi metne ne zaman rıza verdiği kayıtlıdır.</p>
                <div class="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-14">
                    <ol class="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2">
                        @for (step of kvkkSteps; track step.title; let i = $index) {
                            <li class="public-card p-5">
                                <span class="public-step-badge" aria-hidden="true"><i [class]="step.icon"></i></span>
                                <h3 class="m-0 mt-3 text-base font-semibold text-surface-900 dark:text-surface-0">{{ i + 1 }}. {{ step.title }}</h3>
                                <p class="m-0 mt-1.5 text-sm text-surface-600 dark:text-surface-300">{{ step.description }}</p>
                            </li>
                        }
                    </ol>
                    <app-public-screenshot shot="kvkkFormu" />
                </div>
                <p class="public-note m-0 mt-6">{{ kvkkNote }}</p>
            </section>

            <section class="public-section" aria-labelledby="access-title">
                <h2 id="access-title" class="public-h2 m-0">Erişim ve iz</h2>
                <p class="public-lead m-0 mt-3 max-w-2xl">Kayıtlarınız güvende ve dürüst: kim ne zaman ne yaptı, her zaman belli.</p>
                <div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    @for (item of accessItems; track item.title) {
                        <article class="public-card p-5">
                            <span class="public-step-badge" aria-hidden="true"><i [class]="item.icon"></i></span>
                            <h3 class="m-0 mt-3 text-base font-semibold text-surface-900 dark:text-surface-0">{{ item.title }}</h3>
                            <p class="m-0 mt-1.5 text-sm text-surface-600 dark:text-surface-300">{{ item.description }}</p>
                        </article>
                    }
                </div>
            </section>
        </div>

        <app-public-cta />
    `
})
export class PublicRegistersPageComponent implements OnInit {
    private readonly title = inject(Title);
    private readonly meta = inject(Meta);
    private readonly document = inject(DOCUMENT);

    readonly registers = PUBLIC_REGISTERS;
    readonly registersNote = PUBLIC_REGISTERS_NOTE;
    readonly kvkkSteps = PUBLIC_KVKK_STEPS;
    readonly kvkkNote = PUBLIC_KVKK_NOTE;
    readonly accessItems = PUBLIC_RECORD_SAFETY_ITEMS;

    ngOnInit(): void {
        setPublicPageMeta(this.title, this.meta, PUBLIC_REGISTERS_PAGE_META, this.document);
    }
}
