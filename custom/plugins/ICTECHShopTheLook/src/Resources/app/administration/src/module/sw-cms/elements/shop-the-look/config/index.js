import template from './sw-cms-el-config-ict-shop-the-look.html.twig';

const { Component, Mixin } = Shopware;
const { Criteria } = Shopware.Data;

/**
 * Configuration panel component for the 'ict-shop-the-look' CMS element.
 * Allows editors to:
 * - Upload or select a look image
 * - Add/remove hotspots and assign a product to each
 * - Configure layout style, image dimensions, and cart behaviour
 *
 * Exposes a validate() method consumed by the sw-cms-slot override
 * to block saving when required products are missing.
 */
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
            return this.cmsPageState._entityName;
        },

        productCriteria() {
            // Only show root (non-variant) products in the product search
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
            return this.element?.config?.layoutStyle?.value || 'image-products';
        },

        requiresProducts() {
            // These layout modes must have at least one hotspot with a product
            return ['image-products', 'products-image', 'only-products'].includes(this.layoutStyle);
        },

        hasProductError() {
            // Validation flag: true when a product-requiring layout has no hotspots or an unassigned hotspot
            if (!this.requiresProducts) return false;
            return this.hotspots.length === 0 || this.hotspots.some(h => !h.productId);
        },
    },

    created() {
        this.initElementConfig('ict-shop-the-look');
        this.loadHotspots();
    },

    methods: {
        // Called by sw-cms-slot override before closing the modal.
        // Returns false to block close and show an inline error when products are missing.
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

        cleanupDimensionConfig() {
            // Reset custom width/height when a preset dimension is selected
            const imageDimension = this.element.config.imageDimension?.value;
            if (imageDimension !== 'custom') {
                if (this.element.config.customWidth) this.element.config.customWidth.value = null;
                if (this.element.config.customHeight) this.element.config.customHeight.value = null;
            }
        },

        loadHotspots() {
            this.hotspots = this.element.config.hotspots?.value || [];
        },

        addHotspot() {
            this.hotspots.push({
                id: this.generateId(),
                xPosition: 50,
                yPosition: 50,
                productId: null,
            });
            this.saveHotspots();
        },

        removeHotspot(index) {
            this.hotspots.splice(index, 1);
            this.saveHotspots();
        },

        async onHotspotProductChange(index) {
            // Eagerly fetch the product name and cover image so the config UI
            // can display them without waiting for a full page reload
            const hotspot = this.hotspots[index];
            if (hotspot.productId) {
                const criteria = new Criteria(1, 1);
                criteria.addAssociation('cover.media');
                const product = await this.productRepository.get(hotspot.productId, Shopware.Context.api, criteria);
                if (product) {
                    hotspot.productName = product.translated?.name || product.name || '';
                    hotspot.productCoverUrl = product.cover?.media?.url || null;
                }
            } else {
                hotspot.productName = null;
                hotspot.productCoverUrl = null;
            }
            this.saveHotspots();
        },

        onHotspotChange(index) {
            this.saveHotspots();
        },

        saveHotspots() {
            this.element.config.hotspots.value = this.hotspots;
            this.onElementUpdate();
        },

        generateId() {
            // Combines timestamp + random suffix to guarantee uniqueness within a session
            return 'hotspot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        },

        onMediaSelect(selection) {
            this.element.config.lookImage.value = selection[0];
            this.mediaModalOpen = false;
            this.onElementUpdate();
        },

        onMediaUpload(mediaItem) {
            this.setMediaItem({ targetId: mediaItem.targetId });
        },

        async setMediaItem({ targetId }) {
            // Resolve the uploaded media entity by ID and store it in the element config
            const media = await this.mediaRepository.get(targetId);
            this.element.config.lookImage.value = media;
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
