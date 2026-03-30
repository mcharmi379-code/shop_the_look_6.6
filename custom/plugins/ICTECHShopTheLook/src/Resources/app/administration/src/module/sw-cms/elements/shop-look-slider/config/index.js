import template from './sw-cms-el-config-ict-shop-look-slider.html.twig';
import './sw-cms-el-config-ict-shop-look-slider.scss';

const { Component, Mixin } = Shopware;
const { moveItem, object: { cloneDeep } } = Shopware.Utils;
const Criteria = Shopware.Data.Criteria;

Component.register('sw-cms-el-config-ict-shop-look-slider', {
    template,
    inject: ['repositoryFactory'],

    emits: ['element-update'],

    mixins: [
        Mixin.getByName('cms-element'),
    ],

    data() {
        return {
            mediaModalIsOpen: false,
            entity: this.element,
            mediaItems: [],
            seoUrlOptions: [],
            isMounted: false,
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
            const cmsPageState = this.cmsPageState || {};
            return cmsPageState.entityName || cmsPageState._entityName || cmsPageState.pageEntityName || '';
        },

        items() {
            const element = this.element || {};
            const config = element.config || {};
            const sliderItems = config.sliderItems || {};
            return sliderItems.value || [];
        },

        categoryCriteria() {
            const criteria = new Criteria(1, 25);
            criteria.addSorting(Criteria.sort('name', 'ASC'));
            return criteria;
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
                { value: 'outside', label: this.$t('sw-cms.elements.imageSlider.config.label.navigationPositionOutside') },
            ];
        },

        navigationDotsValueOptions() {
            return [
                { value: 'none', label: this.$t('sw-cms.elements.imageSlider.config.label.navigationPositionNone') },
                { value: 'inside', label: this.$t('sw-cms.elements.imageSlider.config.label.navigationPositionInside') },
                { value: 'outside', label: this.$t('sw-cms.elements.imageSlider.config.label.navigationPositionOutside') },
            ];
        },
    },

    created() {
        this.initElementConfig('ict-shop-look-slider');
        this.initSliderItems();
        this.loadSeoUrls();
    },

    mounted() {
        this.$nextTick(() => {
            this.isMounted = true;
        });
    },

    methods: {
        async initSliderItems() {
            if (this.element.config.sliderItems.value.length > 0) {
                const mediaIds = this.element.config.sliderItems.value.map(item => item.mediaId);
                const criteria = new Criteria(1, 25);
                criteria.setIds(mediaIds);
                const searchResult = await this.mediaRepository.search(criteria);
                this.mediaItems = mediaIds.map(id => searchResult.get(id)).filter(item => item !== null);
            }
        },

        async onImageUpload(mediaItem) {
            const resolvedMediaItem = await this.getMediaItem(mediaItem);
            if (!resolvedMediaItem) return;

            const sliderItems = this.element.config.sliderItems;
            if (sliderItems.source === 'default') {
                sliderItems.value = [];
                sliderItems.source = 'static';
            }

            sliderItems.value.push({
                mediaUrl: resolvedMediaItem.url,
                mediaId: resolvedMediaItem.id,
                cmsPageId: null,
                url: null,
                newTab: false,
            });

            this.mediaItems.push(resolvedMediaItem);
            this.updateMediaDataValue();
            this.emitUpdateEl();
        },

        async getMediaItem(mediaItem) {
            if (mediaItem && mediaItem.targetId) {
                return this.mediaRepository.get(mediaItem.targetId);
            }

            return mediaItem;
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
                    cmsPageId: null,
                    url: null,
                    newTab: false,
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
            const domainCriteria = new Criteria(1, 25);
            domainCriteria.addFilter(Criteria.contains('url', 'http'));
            const domains = await this.salesChannelDomainRepository.search(domainCriteria, Shopware.Context.api);
            const storefrontDomain = domains.find(d => d.url && d.url.startsWith('http') && !d.url.includes('https'))
                || domains.find(d => d.url && d.url.startsWith('http'));
            const base = storefrontDomain && storefrontDomain.url ? storefrontDomain.url.replace(/\/$/, '') : '';

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

        onCmsPageChange(index, value) {
            this.element.config.sliderItems.value[index].cmsPageId = value || null;
            this.updateMediaDataValue();
            this.emitUpdateEl();
        },

        onUrlChange(index, value) {
            this.element.config.sliderItems.value[index].url = value || null;
            this.updateMediaDataValue();
            this.emitUpdateEl();
        },

        onChangeAutoSlide(value) {
            if (!value) {
                this.element.config.autoplayTimeout.value = this.autoplayTimeoutDefault;
                this.element.config.speed.value = this.speedDefault;
            }
            this.emitUpdateEl();
        },
    },
});
