// CI için Karma yapılandırması: `ng test --karma-config=karma.ci.conf.cjs --watch=false`.
// Yerel geliştirmede Angular'ın varsayılan yapılandırması kullanılır.
module.exports = function (config) {
    config.set({
        basePath: '',
        frameworks: ['jasmine', '@angular-devkit/build-angular'],
        plugins: [
            require('karma-jasmine'),
            require('karma-chrome-launcher'),
            require('@angular-devkit/build-angular/plugins/karma')
        ],
        reporters: ['progress'],
        browsers: ['ChromeHeadlessCI'],
        customLaunchers: {
            // Ubuntu runner'larında kullanıcı ad alanı kısıtı nedeniyle sandbox kapalı gerekir.
            ChromeHeadlessCI: {
                base: 'ChromeHeadless',
                flags: ['--no-sandbox', '--disable-gpu']
            }
        },
        singleRun: true,
        restartOnFileChange: false
    });
};
