// Angular test derleyicisinin (`@angular/build:unit-test`, angular.json'da `runnerConfig: true`) panel ve portal için
// birleştirdiği ortak Vitest ayarları. Dosya keşfi, tarayıcı ve izleme angular.json'dan gelir.
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Jasmine her testten sonra spyOn casuslarını kaldırırdı; Vitest kaldırmaz. Test dosyaları Karma'daki gibi aynı
        // sayfada koştuğundan (isolate: false) kalan casus (Storage.prototype.setItem, HTMLAnchorElement.prototype.click,
        // window.matchMedia...) sonraki dosyalara sızıyordu. Her testten önce vi.spyOn casusları geri alınır.
        restoreMocks: true
    }
});
