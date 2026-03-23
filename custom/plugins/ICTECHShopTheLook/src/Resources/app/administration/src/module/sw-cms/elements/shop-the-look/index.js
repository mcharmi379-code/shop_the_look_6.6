import './component';
import './config';
import './preview';

Shopware.Service('cmsService').registerCmsElement({
    name: 'ict-shop-the-look',
    label: 'Shop The Look',
    component: 'sw-cms-el-ict-shop-the-look',
    configComponent: 'sw-cms-el-config-ict-shop-the-look',
    previewComponent: 'sw-cms-el-preview-ict-shop-the-look',

    defaultConfig: {
        lookImage: {
            source: 'static',
            value: null
        },

        imageDimension: {
            source: 'static',
            value: '300x300'
        },

        customWidth: {
            source: 'static',
            value: 300
        },

        customHeight: {
            source: 'static',
            value: 300
        },

        hotspots: {
            source: 'static',
            value: []
        },

        productListWidth: {
            source: 'static',
            value: '300px'
        },

        layoutStyle: {
            source: 'static',
            value: 'image-products'
        },

        showPrices: {
            source: 'static',
            value: true
        },

        showVariantSwitch: {
            source: 'static',
            value: true
        },

        addAllToCart: {
            source: 'static',
            value: true
        },

        addSingleProduct: {
            source: 'static',
            value: true
        }
    }
});