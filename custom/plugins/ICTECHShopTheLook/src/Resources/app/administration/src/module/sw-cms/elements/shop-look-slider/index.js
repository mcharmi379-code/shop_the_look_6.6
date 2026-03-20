import './component';
import './config';
import './preview';

Shopware.Service('cmsService').registerCmsElement({

    name: 'ict-shop-look-slider',

    label: 'Shop Look Slider',

    component: 'sw-cms-el-ict-shop-look-slider',

    configComponent: 'sw-cms-el-config-ict-shop-look-slider',

    previewComponent: 'sw-cms-el-preview-ict-shop-look-slider',

    defaultConfig: {

        sliderItems: {
            source: 'static',
            value: []
        },

        navigationArrows: {
            source: 'static',
            value: 'outside'
        },

        navigationDots: {
            source: 'static',
            value: 'none'
        },

        speed: {
            source: 'static',
            value: 300
        },

        autoSlide: {
            source: 'static',
            value: false
        },

        autoplayTimeout: {
            source: 'static',
            value: 5000
        }

    }

});