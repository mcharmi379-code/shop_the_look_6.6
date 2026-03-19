
import template from './sw-cms-el-preview-ict-shop-look-slider.html.twig';
import './sw-cms-el-preview-ict-shop-look-slider.scss';

Shopware.Component.register('sw-cms-el-preview-ict-shop-look-slider', {
    template,
      computed: {
        assetFilter() {
            return Shopware.Filter.getByName('asset');
        },
    },
});