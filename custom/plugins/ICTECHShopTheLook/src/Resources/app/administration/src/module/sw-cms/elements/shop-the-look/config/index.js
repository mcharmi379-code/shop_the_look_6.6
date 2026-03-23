import template from './sw-cms-el-config-ict-shop-the-look.html.twig';

const { Component, Mixin } = Shopware;
const { Criteria } = Shopware.Data;

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
            // config.lookImage.value stores { mediaId, mediaUrl } — persists to DB
            const val = ((this.element && this.element.config) || {}).lookImage?.value;
            if (val && typeof val === 'object' && val.mediaUrl) {
                return val;
            }
            return null;
        },
    },

    created() {
        this.initElementConfig('ict-shop-the-look');
        this.ensureBooleanDefaults();
        this.loadHotspots();
        this.loadLookImage();
    },

    methods: {
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
            this.hotspots = hotspots.value || [];
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

        onHotspotChange() {
            this.saveHotspots();
        },

        saveHotspots() {
            this.element.config.hotspots.value = this.hotspots;
            this.onElementUpdate();
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
