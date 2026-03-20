import template from './sw-cms-preview-ict-shop-look-slider-block.html.twig';
import './sw-cms-preview-ict-shop-look-slider-block.scss';

Shopware.Component.register('sw-cms-preview-ict-shop-look-slider-block', {
    template,
    mixins: [Shopware.Mixin.getByName('ict-asset-filter')],
});
