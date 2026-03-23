import './component';
import './preview';

Shopware.Service('cmsService').registerCmsBlock({
    name: 'ict-shop-look-slider-block',
    label: 'Shop Look Slider Block',
    category: 'commerce',
    component: 'sw-cms-block-ict-shop-look-slider-block',
    previewComponent: 'sw-cms-preview-ict-shop-look-slider-block',
    defaultConfig: {
        marginBottom: '20px',
        marginTop: '20px',
        marginLeft: '20px',
        marginRight: '20px',
        sizingMode: 'boxed'
    },
    slots: {
        content: 'ict-shop-look-slider'
    }
});