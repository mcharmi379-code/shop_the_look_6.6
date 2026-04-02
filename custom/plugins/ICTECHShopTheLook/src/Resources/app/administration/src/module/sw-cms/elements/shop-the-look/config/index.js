import template from './sw-cms-el-config-ict-shop-the-look.html.twig';

const { Component, Mixin } = Shopware;
const { Criteria } = Shopware.Data;
const { object: { cloneDeep } } = Shopware.Utils;

Component.register('sw-cms-el-config-ict-shop-the-look', {
    template,

    inject: ['repositoryFactory'],

    mixins: [
        Mixin.getByName('cms-element'),
        Mixin.getByName('notification'),
    ],

    emits: ['element-update'],

    data() {
        return {
            mediaModalOpen: false,
            hotspots: [],
            showError: false,
        };
    },

    watch: {
        'element.config.imageDimension.value'() {
            this.cleanupDimensionConfig();
            this.onElementUpdate();
        },
        'element.config.layoutStyle.value'() {
            this.showError = false;
        },
        hotspots: {
            deep: true,
            handler() {
                if (this.showError && !this.hasProductError) {
                    this.showError = false;
                }
            },
        },
    },

    computed: {
        mediaRepository() {
            return this.repositoryFactory.create('media');
        },

        productRepository() {
            return this.repositoryFactory.create('product');
        },

        uploadTag() {
            return `cms-element-media-config-${this.element.id}`;
        },

        defaultFolderName() {
            const cmsPageState = this.cmsPageState || {};
            return cmsPageState.entityName || cmsPageState._entityName || cmsPageState.pageEntityName || '';
        },

        productCriteria() {
            const criteria = new Criteria(1, 25);
            criteria.addAssociation('cover');
            criteria.addFilter(Criteria.equals('parentId', null));
            return criteria;
        },

        productContext() {
            return { ...Shopware.Context.api, inheritance: true };
        },

        imageDimensionOptions() {
            return [
                { value: '90x90', label: '90 x 90' },
                { value: '120x120', label: '120 x 120' },
                { value: '150x150', label: '150 x 150' },
                { value: '200x200', label: '200 x 200' },
                { value: '300x300', label: '300 x 300' },
                { value: '400x400', label: '400 x 400' },
                { value: '500x500', label: '500 x 500' },
                { value: 'custom', label: 'Custom' },
            ];
        },

        layoutOptions() {
            return [
                { value: 'image-products', label: 'Image → Products' },
                { value: 'products-image', label: 'Products → Image' },
                { value: 'only-image', label: 'Only Image' },
                { value: 'only-products', label: 'Only Products' },
            ];
        },

        layoutStyle() {
            const element = this.element || {};
            const config = element.config || {};
            const layoutStyle = config.layoutStyle || {};
            return layoutStyle.value || 'image-products';
        },

        requiresProducts() {
            return ['image-products', 'products-image', 'only-products'].includes(this.layoutStyle);
        },

        hasProductError() {
            if (!this.requiresProducts) return false;
            return this.hotspots.length === 0 || this.hotspots.some(h => !h.productId);
        },

        lookImageData() {
            const val = ((this.element && this.element.config) || {}).lookImage?.value;

            if (!val || typeof val !== 'object') {
                return null;
            }

            if (val.mediaUrl) {
                return {
                    mediaId: val.mediaId || val.id || null,
                    mediaUrl: val.mediaUrl,
                };
            }

            if (val.url) {
                return {
                    mediaId: val.mediaId || val.id || null,
                    mediaUrl: val.url,
                };
            }

            return null;
        },
    },

    created() {
        this.initElementConfig('ict-shop-the-look');
        this.ensureDimensionDefaults();
        this.ensureBooleanDefaults();
        this.loadHotspots();
        this.loadLookImage();
    },

    methods: {
        ensureDimensionDefaults() {
            const config = (this.element && this.element.config) || {};

            if (config.imageDimension && !config.imageDimension.value) {
                config.imageDimension.value = '300x300';
            }

            if (config.customWidth && !config.customWidth.value) {
                config.customWidth.value = 300;
            }

            if (config.customHeight && !config.customHeight.value) {
                config.customHeight.value = 300;
            }
        },

        ensureBooleanDefaults() {
            const config = (this.element && this.element.config) || {};
            ['showPrices', 'showVariantSwitch', 'addAllToCart', 'addSingleProduct'].forEach(key => {
                if (config[key] && config[key].value !== false) {
                    config[key].value = true;
                }
            });
        },
        async loadLookImage() {
            // No async fetch needed — mediaUrl is stored directly in config.lookImage.value
        },

        validate() {
            if (this.hasProductError) {
                this.showError = true;
                this.createNotificationError({
                    message: 'Please add at least one hotspot with a product selected before saving.',
                });
                return false;
            }
            return true;
        },

        onElementUpdate() {
            this.cleanupDimensionConfig();
            this.$emit('element-update', this.element);
        },

        onImageDimensionChange(value) {
            this.element.config.imageDimension.value = value || '300x300';
            this.onElementUpdate();
        },

        onCustomDimensionChange(configKey, value) {
            const normalizedValue = this.normalizeDimensionValue(value);
            this.element.config[configKey].value = normalizedValue;
            this.onElementUpdate();
        },

        onLayoutStyleChange(value) {
            this.element.config.layoutStyle.value = value || 'image-products';
            this.showError = false;
            this.onElementUpdate();
        },

        cleanupDimensionConfig() {
            const element = this.element || {};
            const config = element.config || {};
            const imageDimension = config.imageDimension || {};

            if (imageDimension.value !== 'custom') {
                if (config.customWidth) {
                    config.customWidth.value = null;
                }

                if (config.customHeight) {
                    config.customHeight.value = null;
                }
            }
        },

        loadHotspots() {
            const element = this.element || {};
            const config = element.config || {};
            const hotspots = config.hotspots || {};
            const hotspotValues = Array.isArray(hotspots.value) ? hotspots.value : [];

            this.hotspots = hotspotValues.map((hotspot) => ({
                id: hotspot.id || this.generateId(),
                xPosition: this.normalizePosition(hotspot.xPosition),
                yPosition: this.normalizePosition(hotspot.yPosition),
                productId: hotspot.productId || null,
                productName: hotspot.productName || null,
                productCoverUrl: hotspot.productCoverUrl || null,
            }));
        },

        addHotspot() {
            this.hotspots = [
                ...this.hotspots,
                {
                id: this.generateId(),
                xPosition: 50,
                yPosition: 50,
                productId: null,
                productName: null,
                productCoverUrl: null,
                },
            ];
            this.saveHotspots();
        },

        removeHotspot(index) {
            this.hotspots = this.hotspots.filter((_, hotspotIndex) => hotspotIndex !== index);
            this.saveHotspots();
        },

        async onHotspotProductChange(index) {
            const hotspot = this.hotspots[index];
            if (!hotspot.productId) {
                hotspot.productName = null;
                hotspot.productCoverUrl = null;
                this.saveHotspots();
                return;
            }
            const criteria = new Criteria(1, 1);
            criteria.addAssociation('cover.media');
            const product = await this.productRepository.get(hotspot.productId, Shopware.Context.api, criteria);
            if (product) {
                const translated = product.translated || {};
                hotspot.productName = translated.name || product.name || '';

                const cover = product.cover || null;
                const coverMedia = cover && cover.media ? cover.media : null;
                hotspot.productCoverUrl = coverMedia && coverMedia.url ? coverMedia.url : null;
            }
            this.saveHotspots();
        },

        onHotspotPositionChange(index, positionKey, value) {
            const hotspot = this.hotspots[index];

            if (!hotspot) {
                return;
            }

            hotspot[positionKey] = this.normalizePosition(value);
            this.saveHotspots();
        },

        saveHotspots() {
            const normalizedHotspots = this.hotspots.map((hotspot) => ({
                ...hotspot,
                xPosition: this.normalizePosition(hotspot.xPosition),
                yPosition: this.normalizePosition(hotspot.yPosition),
            }));

            this.hotspots = normalizedHotspots;
            this.element.config.hotspots.value = cloneDeep(normalizedHotspots);
            this.onElementUpdate();
        },

        normalizeDimensionValue(value) {
            const numericValue = Number.parseInt(value, 10);

            if (!Number.isFinite(numericValue)) {
                return 300;
            }

            return Math.min(2000, Math.max(50, numericValue));
        },

        normalizePosition(value) {
            const numericValue = Number.parseFloat(value);

            if (!Number.isFinite(numericValue)) {
                return 50;
            }

            return Math.min(100, Math.max(0, numericValue));
        },

        generateId() {
            return 'hotspot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        },

        onMediaSelect(selection) {
            const item = selection && selection.length ? selection[0] : null;
            this.element.config.lookImage.value = item ? { mediaId: item.id, mediaUrl: item.url } : null;
            this.mediaModalOpen = false;
            this.onElementUpdate();
        },

        onMediaUpload(mediaItem) {
            this.setMediaItem({ targetId: mediaItem.targetId });
        },

        async setMediaItem({ targetId }) {
            const media = await this.mediaRepository.get(targetId);
            this.element.config.lookImage.value = media ? { mediaId: media.id, mediaUrl: media.url } : null;
            this.onElementUpdate();
        },

        onMediaUploadOpen() {
            this.mediaModalOpen = true;
        },

        onMediaModalClose() {
            this.mediaModalOpen = false;
        },

        onRemoveImage() {
            this.element.config.lookImage.value = null;
            this.onElementUpdate();
        },
    },
});
