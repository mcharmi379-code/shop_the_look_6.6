import template from './sw-cms-preview-ict-shop-the-look-block.html.twig';
import './sw-cms-preview-ict-shop-the-look-block.scss';

Shopware.Component.register('sw-cms-preview-ict-shop-the-look-block', {
    template,
    mixins: [Shopware.Mixin.getByName('ict-asset-filter')],
});
