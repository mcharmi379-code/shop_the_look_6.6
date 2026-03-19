import template from './sw-cms-el-preview-ict-shop-the-look.html.twig';
import './sw-cms-el-preview-ict-shop-the-look.scss';

Shopware.Component.register('sw-cms-el-preview-ict-shop-the-look', {
    template,
    computed: {
        assetFilter() {
            return Shopware.Filter.getByName('asset');
        }
    }
});
