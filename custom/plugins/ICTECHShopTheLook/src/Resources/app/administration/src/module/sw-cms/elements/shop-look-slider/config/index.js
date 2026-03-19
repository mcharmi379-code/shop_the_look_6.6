import template from './sw-cms-el-config-ict-shop-look-slider.html.twig';
import './sw-cms-el-config-ict-shop-look-slider.scss';

const { Component, Mixin } = Shopware;
const { moveItem, object: { cloneDeep } } = Shopware.Utils;
const Criteria = Shopware.Data.Criteria;

/**
 * Configuration panel component for the 'ict-shop-look-slider' CMS element.
 * Allows editors to manage the slider image list (upload, reorder, remove),
 * assign optional click-through URLs to each slide, and configure
 * autoplay / navigation settings.
 */
Component.register('sw-cms-el-config-ict-shop-look-slider', {
    template,

    inject: ['repositoryFactory'],

    emits: ['element-update'],

    mixins: [
        Mixin.getByName('cms-element')
    ],

    data() {
        return {
            mediaModalIsOpen: false,
            entity: this.element,
            mediaItems: [],
            seoUrlOptions: []
        };
    },

    computed: {
        uploadTag() {
            return `cms-element-media-config-${this.element.id}`;
        },

        mediaRepository() {
            return this.repositoryFactory.create('media');
        },

        salesChannelDomainRepository() {
            return this.repositoryFactory.create('sales_channel_domain');
        },

        seoUrlRepository() {
            return this.repositoryFactory.create('seo_url');
        },

        defaultFolderName() {
            return this.cmsPageState.pageEntityName;
        },

        items() {
            return this.element.config?.sliderItems?.value || [];
        },

        speedDefault() {
            return 300;
        },

        autoplayTimeoutDefault() {
            return 5000;
        },

        navigationArrowsValueOptions() {
            return [
                { value: 'none', label: this.$t('sw-cms.elements.imageSlider.config.label.navigationPositionNone') },
                { value: 'inside', label: this.$t('sw-cms.elements.imageSlider.config.label.navigationPositionInside') },
                { value: 'outside', label: this.$t('sw-cms.elements.imageSlider.config.label.navigationPositionOutside') }
            ];
        },

        navigationDotsValueOptions() {
            return [
                { value: 'none', label: this.$t('sw-cms.elements.imageSlider.config.label.navigationPositionNone') },
                { value: 'inside', label: this.$t('sw-cms.elements.imageSlider.config.label.navigationPositionInside') },
                { value: 'outside', label: this.$t('sw-cms.elements.imageSlider.config.label.navigationPositionOutside') }
            ];
        }
    },

    created() {
        this.initElementConfig('ict-shop-look-slider');
        this.initSliderItems();
        this.loadSeoUrls();
    },

    methods: {
        async initSliderItems() {
            // Pre-load media entities for any already-configured slider items
            // so the config UI can display thumbnails immediately on open
            if (this.element.config.sliderItems.value.length > 0) {
                const mediaIds = this.element.config.sliderItems.value.map(item => item.mediaId);
                const criteria = new Criteria(1, 25);
                criteria.setIds(mediaIds);
                const searchResult = await this.mediaRepository.search(criteria);
                this.mediaItems = mediaIds.map(id => searchResult.get(id)).filter(item => item !== null);
            }
        },

        async onImageUpload(mediaItem) {
            // Resolve the uploaded item to a full media entity before appending,
            // because the upload event may only carry a targetId, not the full object
            const resolvedMediaItem = await this.getMediaItem(mediaItem);
            if (!resolvedMediaItem) return;

            const sliderItems = this.element.config.sliderItems;
            // Reset source from 'default' to 'static' on first real upload
            if (sliderItems.source === 'default') {
                sliderItems.value = [];
                sliderItems.source = 'static';
            }

            sliderItems.value.push({
                mediaUrl: resolvedMediaItem.url,
                mediaId: resolvedMediaItem.id,
                url: null,
                newTab: false
            });

            this.mediaItems.push(resolvedMediaItem);
            this.updateMediaDataValue();
            this.emitUpdateEl();
        },

        async getMediaItem(mediaItem) {
            return mediaItem?.targetId ? this.mediaRepository.get(mediaItem.targetId) : mediaItem;
        },

        onItemRemove(mediaItem, index) {
            this.element.config.sliderItems.value = this.element.config.sliderItems.value.filter((item, i) => 
                item.mediaId !== mediaItem.id || i !== index
            );
            this.mediaItems = this.mediaItems.filter((item, i) => item.id !== mediaItem.id || i !== index);
            this.updateMediaDataValue();
            this.emitUpdateEl();
        },

        onCloseMediaModal() {
            this.mediaModalIsOpen = false;
        },

        onMediaSelectionChange(mediaItems) {
            const sliderItems = this.element.config.sliderItems;
            if (sliderItems.source === 'default') {
                sliderItems.value = [];
                sliderItems.source = 'static';
            }

            mediaItems.forEach(item => {
                sliderItems.value.push({
                    mediaUrl: item.url,
                    mediaId: item.id,
                    url: null,
                    newTab: false
                });
            });

            this.mediaItems.push(...mediaItems);
            this.updateMediaDataValue();
            this.emitUpdateEl();
        },

        onItemSort(dragData, dropData) {
            moveItem(this.mediaItems, dragData.position, dropData.position);
            moveItem(this.element.config.sliderItems.value, dragData.position, dropData.position);
            this.updateMediaDataValue();
            this.emitUpdateEl();
        },

        updateMediaDataValue() {
            // Keeps element.data.sliderItems in sync with element.config.sliderItems
            // by merging the resolved media entity objects back into the config values.
            // element.data is what the preview component reads.
            if (this.element.config.sliderItems.value) {
                const sliderItems = cloneDeep(this.element.config.sliderItems.value);
                sliderItems.forEach(sliderItem => {
                    this.mediaItems.forEach(mediaItem => {
                        if (sliderItem.mediaId === mediaItem.id) {
                            sliderItem.media = mediaItem;
                        }
                    });
                });
                this.element.data = { sliderItems };
            }
        },

        onOpenMediaModal() {
            this.mediaModalIsOpen = true;
        },

        emitUpdateEl() {
            this.$emit('element-update', this.element);
        },

        async loadSeoUrls() {
            // Fetch all canonical, non-deleted SEO URLs and prefix them with the
            // storefront domain so editors can pick a full URL from a dropdown.
            // Headless/non-HTTP domains are excluded to avoid invalid URLs.
            // Get storefront domain URL (exclude headless/non-http)
            const domainCriteria = new Criteria(1, 25);
            domainCriteria.addFilter(Criteria.contains('url', 'http'));
            const domains = await this.salesChannelDomainRepository.search(domainCriteria, Shopware.Context.api);
            const storefrontDomain = domains.find(d => d.url && d.url.startsWith('http') && !d.url.includes('https'))
                || domains.find(d => d.url && d.url.startsWith('http'));
            const base = storefrontDomain?.url?.replace(/\/$/, '') || '';

            const criteria = new Criteria(1, 500);
            criteria.addFilter(Criteria.equals('isCanonical', true));
            criteria.addFilter(Criteria.equals('isDeleted', false));
            criteria.addSorting(Criteria.sort('seoPathInfo', 'ASC'));

            const result = await this.seoUrlRepository.search(criteria, Shopware.Context.api);
            const seen = new Set();
            this.seoUrlOptions = result.reduce((acc, seoUrl) => {
                const fullUrl = `${base}/${seoUrl.seoPathInfo}`;
                if (!seen.has(fullUrl)) {
                    seen.add(fullUrl);
                    acc.push({ value: fullUrl, label: fullUrl });
                }
                return acc;
            }, []);
        },

        onUrlChange(index, value) {
            this.element.config.sliderItems.value[index].url = value || null;
            this.updateMediaDataValue();
            this.emitUpdateEl();
        },

        onChangeAutoSlide(value) {
            // Reset speed and autoplay timeout to defaults when autoplay is disabled
            // to avoid stale values persisting in the config
            if (!value) {
                this.element.config.autoplayTimeout.value = this.autoplayTimeoutDefault;
                this.element.config.speed.value = this.speedDefault;
            }
            this.emitUpdateEl();
        }
    }
});