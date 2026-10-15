import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import prettier from 'eslint-config-prettier';

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
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-inferrable-types': 'off',
            // `_` önekli parametre bilinçli kullanılmıyor demektir (arayüz imzası); `...rest` ile ayıklanan alan da kullanılmaz.
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', ignoreRestSiblings: true }],
            'arrow-body-style': ['error', 'as-needed'],
            curly: 0,
            '@typescript-eslint/member-ordering': [
                'warn',
                {
                    default: ['public-static-field', 'static-field', 'instance-field', 'public-instance-method', 'public-static-field']
                }
            ],
            'no-console': 0,
            'prefer-const': 0
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
