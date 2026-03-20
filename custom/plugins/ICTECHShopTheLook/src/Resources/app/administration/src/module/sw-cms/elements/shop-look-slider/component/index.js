import template from './sw-cms-el-ict-shop-look-slider.html.twig';
import './sw-cms-el-ict-shop-look-slider.scss';

const { Component, Mixin } = Shopware;

Component.register('sw-cms-el-ict-shop-look-slider', {
    template,

    mixins: [
        Mixin.getByName('cms-element'),
        Mixin.getByName('ict-asset-filter'),
    ],

    data() {
        return {
            sliderPos: 0,
        };
    },

    computed: {
        sliderItems() {
            var configItems = this.element
                && this.element.config
                && this.element.config.sliderItems
                && this.element.config.sliderItems.value;
            return (configItems && configItems.length) ? configItems : [];
        },

        visibleItems() {
            if (!this.sliderItems.length) {
                return new Array(6).fill(null);
            }
            return this.sliderItems.slice(this.sliderPos, this.sliderPos + 6);
        },
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
        },
    },
});