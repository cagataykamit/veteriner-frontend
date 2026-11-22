import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Portal teması: panelle aynı birincil (logo turkuazı, `src/app/core/theme/vetinity-preset.ts`). Portal paketi panel kodunu
 * içe almadığından ton ailesi burada da durur. Aura'nın varsayılan zümrüt birincili (#10b981) beyaz yazıyla 2,5:1 kalıyor,
 * "Randevu talep et" eyleminin koyu turkuazından farklı ikinci bir ana renk oluşturuyordu (PO-01). Tek ana renk:
 * açıkta #0c8079 + beyaz 4,8:1, koyuda #42d7cd + #042f2e 8,2:1. `.portal-action-link--primary` de bu renkleri kullanır.
 */
const LOGO_TEAL_FAMILY = {
    50: '#eefcfb',
    100: '#d8f8f6',
    200: '#b1f1ed',
    300: '#7de8e1',
    400: '#42d7cd',
    500: '#0fa39a',
    600: '#0c8079',
    700: '#0a655f',
    800: '#084f4a',
    900: '#073f3b',
    950: '#042a27'
};

export const PortalPreset = definePreset(Aura, {
    semantic: {
        primary: LOGO_TEAL_FAMILY,
        colorScheme: {
            light: {
                primary: { color: '{primary.600}', contrastColor: '#ffffff', hoverColor: '{primary.700}', activeColor: '{primary.800}' }
            },
            dark: {
                primary: { color: '{primary.400}', contrastColor: '#042f2e', hoverColor: '{primary.300}', activeColor: '{primary.200}' }
            }
        }
    }
});
