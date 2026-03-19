import template from './sw-cms-preview-ict-shop-the-look-block.html.twig';
import './sw-cms-preview-ict-shop-the-look-block.scss';

Shopware.Component.register('sw-cms-preview-ict-shop-the-look-block', {
    template,
    computed: {
        assetFilter() {
            return Shopware.Filter.getByName('asset');
        }
    }
});
