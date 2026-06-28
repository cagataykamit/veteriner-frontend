import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AppFloatingConfigurator } from '../../layout/component/app.floatingconfigurator';
import { VETINITY_BRAND_LOGOS } from '@/app/core/brand/vetinity-brand.constants';

@Component({
    selector: 'app-notfound',
    standalone: true,
    imports: [RouterModule, AppFloatingConfigurator, ButtonModule],
    template: ` <app-floating-configurator />
        <div class="public-page bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen overflow-hidden">
            <div class="flex flex-col items-center justify-center">
                <div class="public-auth-card-frame">
                    <div class="public-auth-card-inner w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20 flex flex-col items-center">
                        <img
                            [src]="brand.icon"
                            alt="Vetinity"
                            class="mb-4 h-[52px] w-[52px] md:h-[58px] md:w-[58px] shrink-0 object-contain dark:hidden"
                            width="58"
                            height="58"
                        />
                        <img
                            [src]="brand.iconDark"
                            alt="Vetinity"
                            class="mb-4 hidden h-[52px] w-[52px] md:h-[58px] md:w-[58px] shrink-0 object-contain dark:block"
                            width="58"
                            height="58"
                        />
                        <span class="public-notfound-code font-bold text-3xl">404</span>
                        <h1 class="text-surface-900 dark:text-surface-0 font-bold text-3xl lg:text-5xl mb-2">Sayfa bulunamadı</h1>
                        <div class="text-surface-600 dark:text-surface-200 mb-8">Aradığınız sayfa mevcut değil veya taşınmış olabilir.</div>
                        <a [routerLink]="['/']" fragment="faq" class="w-full flex items-center py-8 border-surface-300 dark:border-surface-500 border-b">
                            <span class="public-notfound-icon-box flex justify-center items-center rounded-border" style="height: 3.5rem; width: 3.5rem">
                                <i class="pi pi-fw pi-table text-2xl!"></i>
                            </span>
                            <span class="ml-6 flex flex-col">
                                <span class="text-surface-900 dark:text-surface-0 lg:text-xl font-medium mb-0 block">Sık sorulan sorular</span>
                                <span class="text-surface-600 dark:text-surface-200 lg:text-xl">Merak edilen cevaplara göz atın.</span>
                            </span>
                        </a>
                        <a routerLink="/pricing" class="w-full flex items-center py-8 border-surface-300 dark:border-surface-500 border-b">
                            <span class="public-notfound-icon-box flex justify-center items-center rounded-border" style="height: 3.5rem; width: 3.5rem">
                                <i class="pi pi-fw pi-question-circle text-2xl!"></i>
                            </span>
                            <span class="ml-6 flex flex-col">
                                <span class="text-surface-900 dark:text-surface-0 lg:text-xl font-medium mb-0">Paketler</span>
                                <span class="text-surface-600 dark:text-surface-200 lg:text-xl">Kliniğinize uygun planları inceleyin.</span>
                            </span>
                        </a>
                        <a routerLink="/auth/login" class="w-full flex items-center mb-8 py-8 border-surface-300 dark:border-surface-500 border-b">
                            <span class="public-notfound-icon-box flex justify-center items-center rounded-border" style="height: 3.5rem; width: 3.5rem">
                                <i class="pi pi-fw pi-unlock text-2xl!"></i>
                            </span>
                            <span class="ml-6 flex flex-col">
                                <span class="text-surface-900 dark:text-surface-0 lg:text-xl font-medium mb-0">Giriş sayfası</span>
                                <span class="text-surface-600 dark:text-surface-200 lg:text-xl">Vetinity panelinize giriş yapın.</span>
                            </span>
                        </a>
                        <p-button label="Ana sayfaya dön" routerLink="/" styleClass="public-notfound-submit" />
                    </div>
                </div>
            </div>
        </div>`
})
export class Notfound {
    readonly brand = VETINITY_BRAND_LOGOS;
}
