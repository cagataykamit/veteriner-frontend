import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import prettier from 'eslint-config-prettier';

// Katman yönü: core/shared ← features ← layout/pages (uygulama kabuğu ve rota sayfaları). Alt katman üst katmanı içe aktarmaz.
// Tip importu (sözleşme) serbesttir. Tek istisna: tema/yerleşim durumu LayoutService'tedir; grafik gibi bileşenler tema
// değişince yeniden çizmek için onu okuyabilir.
const shellImports = {
    regex: '^@/app/(pages/|layout/(?!service/layout\\.service$))',
    allowTypeImports: true,
    message: 'Uygulama kabuğu (layout) ve rota sayfaları (pages) en üst katmandır; alt katman onları içe aktarmaz. Paylaşılan servisi core altına taşıyın.'
};

export default tseslint.config(
    {
        ignores: ['**/dist/**', '.angular/**', 'node_modules/**']
    },
    {
        files: ['**/*.ts'],
        extends: [eslint.configs.recommended, ...tseslint.configs.recommended, ...angular.configs.tsRecommended, prettier],
        processor: angular.processInlineTemplates,
        rules: {
            'padding-line-between-statements': [
                'warn',
                { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
                { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
                { blankLine: 'any', prev: ['case', 'default'], next: 'break' },
                { blankLine: 'any', prev: 'case', next: 'case' },
                { blankLine: 'always', prev: '*', next: 'return' },
                { blankLine: 'always', prev: 'block', next: '*' },
                { blankLine: 'always', prev: '*', next: 'block' },
                { blankLine: 'always', prev: 'block-like', next: '*' },
                { blankLine: 'always', prev: '*', next: 'block-like' },
                { blankLine: 'always', prev: ['import'], next: ['const', 'let', 'var'] }
            ],
            // Önek angular.json'daki proje önekiyle (`app`) aynı; `p` şablondan (PrimeNG) kalmıştı. `<li>` gibi yerel öğeye takılan bileşenler öznitelik seçicisi kullanır.
            '@angular-eslint/component-selector': [
                'warn',
                [
                    { type: 'element', prefix: 'app', style: 'kebab-case' },
                    { type: 'attribute', prefix: 'app', style: 'camelCase' }
                ]
            ],
            '@angular-eslint/directive-selector': ['warn', { type: 'attribute', prefix: 'app', style: 'camelCase' }],
            '@angular-eslint/component-class-suffix': ['error', { suffixes: [''] }],
            '@angular-eslint/no-host-metadata-property': 'off',
            '@angular-eslint/no-output-on-prefix': 'off',
            // Angular 22'de varsayılan OnPush. Geçişte mevcut bileşenler davranış değişmesin diye `Eager` ile işaretlendi
            // (ng update); OnPush'a bileşen bileşen geçilir. Yeni bileşen changeDetection yazmadan OnPush olur.
            '@angular-eslint/prefer-on-push-component-change-detection': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-inferrable-types': 'off',
            // `_` önekli parametre bilinçli kullanılmıyor demektir (arayüz imzası); `...rest` ile ayıklanan alan da kullanılmaz.
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', ignoreRestSiblings: true }],
            'arrow-body-style': ['error', 'as-needed'],
            curly: 0,
            // Kapalı: projede alanlar ilgili bölümün yanında (sinyal/computed/yetki) gruplanır ve ok fonksiyonlu alanlar kural için
            // "metot" sayılır. Uymak için alanları yer değiştirmek, alan başlatma sırasını (inject/computed/effect) değiştirir:
            // davranış riski taşıyan toplu bir yeniden sıralama, okunabilirliğe katkısı yok.
            '@typescript-eslint/member-ordering': 'off',
            'no-console': 0,
            'prefer-const': 0
        }
    },
    {
        // Hasta sahibi portalı (ADR-031 K5) ayrı uygulamadır: kendi seçici öneki var ve klinik paneli kodunu içe aktaramaz.
        files: ['projects/portal/**/*.ts'],
        rules: {
            '@angular-eslint/component-selector': [
                'warn',
                [
                    { type: 'element', prefix: 'portal', style: 'kebab-case' },
                    { type: 'attribute', prefix: 'portal', style: 'camelCase' }
                ]
            ],
            '@angular-eslint/directive-selector': ['warn', { type: 'attribute', prefix: 'portal', style: 'camelCase' }],
            'no-restricted-imports': [
                'error',
                { patterns: [{ group: ['@/*', '**/src/app/**'], message: 'Portal, klinik paneli kodunu içe aktarmaz (ADR-031 K5).' }] }
            ]
        }
    },
    {
        // core ve shared, features'a bağımlı olmaz: özellik servisini kullanan bileşen/servis (arama, hızlı kayıt, hasta eylem
        // çubuğu vb.) shared'da değil o özelliğin altında yaşar.
        files: ['src/app/core/**/*.ts', 'src/app/shared/**/*.ts'],
        rules: {
            '@typescript-eslint/no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['@/app/features/*', '@/app/features/**', '**/features/**'],
                            allowTypeImports: true,
                            message: 'core/shared, features içinden çalışma zamanı kodu içe aktarmaz; paylaşılan servisi/modeli core veya shared altına taşıyın.'
                        },
                        shellImports
                    ]
                }
            ]
        }
    },
    {
        files: ['src/app/features/**/*.ts'],
        rules: {
            '@typescript-eslint/no-restricted-imports': ['error', { patterns: [shellImports] }]
        }
    },
    {
        files: ['**/*.html'],
        extends: [...angular.configs.templateRecommended, prettier],
        rules: {
            '@angular-eslint/template/prefer-control-flow': 'warn',
            '@angular-eslint/template/eqeqeq': ['error', { allowNullOrUndefined: true }]
        }
    }
);
