import template from './sw-cms-el-ict-shop-the-look.html.twig';
import './sw-cms-el-ict-shop-the-look.scss';

const { Component, Mixin } = Shopware;

/**
 * Administration preview component for the 'ict-shop-the-look' CMS element.
 * Renders a read-only preview of the configured look image and hotspot products
 * inside the CMS page builder canvas.
 */
Component.register('sw-cms-el-ict-shop-the-look', {
    template,
    mixins: [
        Mixin.getByName('cms-element'),
        Mixin.getByName('ict-asset-filter'),
    ],
    computed: {
        lookImageUrl() {
            const element = this.element || {};
            const val = (element.config || {}).lookImage?.value;

            if (!val || typeof val !== 'object') {
                return null;
            }

            return val.mediaUrl || val.url || null;
        },
        hotspots() {
            const element = this.element || {};
            const config = element.config || {};
            const hotspots = config.hotspots || {};
            return hotspots.value || [];
        },
        layoutStyle() {
            const element = this.element || {};
            const config = element.config || {};
            const layoutStyle = config.layoutStyle || {};
            return layoutStyle.value || 'image-products';
        },
        showImage() {
            return ['image-products', 'products-image', 'only-image'].includes(this.layoutStyle);
        },
        showProducts() {
            return ['image-products', 'products-image', 'only-products'].includes(this.layoutStyle);
        },
        addSingleProduct() {
            const element = this.element || {};
            const config = element.config || {};
            const addSingleProduct = config.addSingleProduct || {};
            return addSingleProduct.value !== false;
        },
        addAllToCart() {
            const element = this.element || {};
            const config = element.config || {};
            const addAllToCart = config.addAllToCart || {};
            return addAllToCart.value !== false;
        },
        assetFilter() {
            return Shopware.Filter.getByName('asset');
        },
    },
    created() {
        this.initElementConfig('ict-shop-the-look');
    },
});
