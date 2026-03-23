import './component';
import './preview';

Shopware.Service('cmsService').registerCmsBlock({
    name: 'ict-shop-the-look-block',
    label: 'Shop The Look Block',
    category: 'commerce',
    component: 'sw-cms-block-ict-shop-the-look-block',
    previewComponent: 'sw-cms-preview-ict-shop-the-look-block',
    defaultConfig: {
        marginBottom: '20px',
        marginTop: '20px',
        marginLeft: '20px',
        marginRight: '20px',
        sizingMode: 'boxed'
    },
    slots: {
        content: 'ict-shop-the-look'
    }
});
