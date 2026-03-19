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
    mixins: [Mixin.getByName('cms-element')],
    computed: {
        lookImageUrl() {
            return this.element?.config?.lookImage?.value?.url || null;
        },
        hotspots() {
            return this.element?.config?.hotspots?.value || [];
        },
        layoutStyle() {
            return this.element?.config?.layoutStyle?.value || 'image-products';
        },
        // Controls whether the look image section is rendered in the preview
        showImage() {
            return ['image-products', 'products-image', 'only-image'].includes(this.layoutStyle);
        },
        // Controls whether the product list section is rendered in the preview
        showProducts() {
            return ['image-products', 'products-image', 'only-products'].includes(this.layoutStyle);
        },
        addSingleProduct() {
            return this.element?.config?.addSingleProduct?.value !== false;
        },
        addAllToCart() {
            return this.element?.config?.addAllToCart?.value !== false;
        },
        assetFilter() {
            return Shopware.Filter.getByName('asset');
        }
    },
    created() {
        // Merges defaultConfig values into element.config for any missing keys
        this.initElementConfig('ict-shop-the-look');
    }
});
