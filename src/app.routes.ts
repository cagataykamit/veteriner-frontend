import { Routes } from '@angular/router';
import { authGuard } from '@/app/core/auth/auth.guard';
import { AppLayout } from './app/layout/component/app.layout';
import { panelHomeRedirect } from '@/app/core/routing/panel-home.redirect';
import { Notfound } from './app/pages/notfound/notfound';
import { PUBLIC_PATHS } from '@/app/features/public/utils/public-navigation.utils';
import { referralCodeRedirect } from '@/app/features/sales-partners/routes/referral-code.redirect';

/** Rota yolu (başındaki `/` olmadan). */
const publicPath = (path: string): string => path.replace(/^\//, '');

export const appRoutes: Routes = [
    {
        // Tanıtım sitesi ve hukuki metinler: ortak iskelet (üst çubuk + alt bilgi), her sayfa lazy.
        path: '',
        loadComponent: () => import('./app/pages/public/public-layout.component').then((m) => m.PublicLayoutComponent),
        children: [
            {
                path: '',
                pathMatch: 'full',
                loadComponent: () => import('./app/pages/public/public-home-page.component').then((m) => m.PublicHomePageComponent)
            },
            {
                path: publicPath(PUBLIC_PATHS.features),
                loadComponent: () => import('./app/pages/public/public-features-page.component').then((m) => m.PublicFeaturesPageComponent)
            },
            {
                path: publicPath(PUBLIC_PATHS.registersAndKvkk),
                loadComponent: () => import('./app/pages/public/public-registers-page.component').then((m) => m.PublicRegistersPageComponent)
            },
            {
                path: publicPath(PUBLIC_PATHS.migration),
                loadComponent: () => import('./app/pages/public/public-migration-page.component').then((m) => m.PublicMigrationPageComponent)
            },
            {
                path: publicPath(PUBLIC_PATHS.packages),
                loadComponent: () => import('./app/pages/public/public-packages-page.component').then((m) => m.PublicPackagesPageComponent)
            },
            { path: 'pricing', redirectTo: publicPath(PUBLIC_PATHS.packages) },
            {
                path: publicPath(PUBLIC_PATHS.faq),
                loadComponent: () => import('./app/pages/public/public-faq-page.component').then((m) => m.PublicFaqPageComponent)
            },
            {
                path: publicPath(PUBLIC_PATHS.contact),
                loadComponent: () => import('./app/pages/public/public-contact-page.component').then((m) => m.PublicContactPageComponent)
            },
            {
                path: publicPath(PUBLIC_PATHS.about),
                loadComponent: () => import('./app/pages/public/public-about-page.component').then((m) => m.PublicAboutPageComponent)
            },
            {
                path: 'gizlilik',
                data: { legalDocument: 'privacy' },
                loadComponent: () => import('./app/pages/public/legal-document-page.component').then((m) => m.LegalDocumentPageComponent)
            },
            {
                path: 'kullanim-sartlari',
                data: { legalDocument: 'terms' },
                loadComponent: () => import('./app/pages/public/legal-document-page.component').then((m) => m.LegalDocumentPageComponent)
            },
            {
                path: 'veri-isleme-sozlesmesi',
                data: { legalDocument: 'dataProcessing' },
                loadComponent: () => import('./app/pages/public/legal-document-page.component').then((m) => m.LegalDocumentPageComponent)
            }
        ]
    },
    {
        path: 'panel',
        component: AppLayout,
        canActivate: [authGuard],
        children: [
            { path: '', pathMatch: 'full', redirectTo: panelHomeRedirect },
            { path: '', loadChildren: () => import('./app/features/panel/panel.routes') }
        ]
    },
    { path: 'notfound', component: Notfound },
    {
        path: 'join/:token',
        loadComponent: () => import('./app/pages/public/join-invite-page.component').then((m) => m.JoinInvitePageComponent)
    },
    { path: 'auth', loadChildren: () => import('./app/features/auth/auth.routes') },
    // Satış ortağı bağlantısı (ADR-037): kodu oturum belleğine alıp kayıt sayfasına yönlendirir.
    { path: 'r/:code', canActivate: [referralCodeRedirect], children: [] },
    { path: '**', redirectTo: '/notfound' }
];
