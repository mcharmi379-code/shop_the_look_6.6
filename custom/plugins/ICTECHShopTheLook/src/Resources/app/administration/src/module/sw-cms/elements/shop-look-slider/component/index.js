import template from './sw-cms-el-ict-shop-look-slider.html.twig';
import './sw-cms-el-ict-shop-look-slider.scss';

const { Component, Mixin, Filter } = Shopware;

/**
 * Administration preview component for the 'ict-shop-look-slider' CMS element.
 * Renders a paginated preview of the configured slider images inside the
 * CMS page builder canvas (shows 6 items at a time).
 */
Component.register('sw-cms-el-ict-shop-look-slider', {
    template,

    mixins: [
        Mixin.getByName('cms-element')
    ],

    data() {
        return {
            sliderPos: 0
        };
    },

    computed: {

        sliderItems() {
            const configItems = this.element?.config?.sliderItems?.value;
            if (configItems && configItems.length) {
                return configItems;
            }
            return [];
        },

        visibleItems() {
            // Show placeholder nulls when no items are configured so the
            // template can render default preview images in the canvas
            if (!this.sliderItems.length) {
                return new Array(6).fill(null);
            }

            // Return a window of 6 items starting at the current slider position
            const start = this.sliderPos;
            const end = start + 6;

            return this.sliderItems.slice(start, end);

        },

        assetFilter() {
            return Filter.getByName('asset');
        }

    },

    created() {

        this.initElementConfig('ict-shop-look-slider');
        this.initElementData('ict-shop-look-slider');

    },

    methods: {

        nextSlide() {

            if (this.sliderPos + 6 < this.sliderItems.length) {
                this.sliderPos++;
            }

        },

        prevSlide() {

            if (this.sliderPos > 0) {
                this.sliderPos--;
            }

        }

    }
});