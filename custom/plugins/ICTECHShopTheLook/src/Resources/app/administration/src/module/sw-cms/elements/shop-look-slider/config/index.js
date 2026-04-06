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
            _processingIds: new Set(),
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

        linkTypeOptions() {
            return [
                { value: 'shopPage', label: this.$t('ict-shop-look-slider.config.linkType.options.shopPage') },
                { value: 'seoUrl', label: this.$t('ict-shop-look-slider.config.linkType.options.seoUrl') },
                { value: 'customUrl', label: this.$t('ict-shop-look-slider.config.linkType.options.customUrl') },
            ];
        },
    },

    created() {
        this.initElementConfig('ict-shop-look-slider');
        this.initializeConfigValues();
        this.initSliderItems();
        this.loadSeoUrls();
    },

    mounted() {
        this.$nextTick(() => {
            this.isMounted = true;
        });
    },

    methods: {
        initializeConfigValues() {
            this.ensureConfigField('speed', this.speedDefault);
            this.ensureConfigField('autoSlide', false);
            this.ensureConfigField(
                'autoplayTimeout',
                this.element?.config?.delay?.value ?? this.autoplayTimeoutDefault
            );

            // Keep the legacy `delay` field aligned so older saved CMS elements
            // and storefront fallbacks continue to work after editing.
            this.ensureConfigField('delay', this.element.config.autoplayTimeout.value);
            this.syncAutoplayTimeout(this.element.config.autoplayTimeout.value);
        },

        ensureConfigField(configKey, defaultValue) {
            if (!this.element.config[configKey]) {
                this.element.config[configKey] = {
                    source: 'static',
                    value: defaultValue,
                };

                return;
            }

            if (this.element.config[configKey].value === undefined || this.element.config[configKey].value === null) {
                this.element.config[configKey].value = defaultValue;
            }
        },

        syncAutoplayTimeout(value) {
            const normalizedValue = Number.isFinite(Number(value))
                ? parseInt(value, 10)
                : this.autoplayTimeoutDefault;

            this.element.config.autoplayTimeout.value = normalizedValue;

            if (this.element.config.delay) {
                this.element.config.delay.value = normalizedValue;
            }
        },

        async initSliderItems() {
            this.normalizeSliderItems();

            if (this.element.config.sliderItems.value.length > 0) {
                const mediaIds = this.element.config.sliderItems.value.map(item => item.mediaId);
                const criteria = new Criteria(1, 25);
                criteria.setIds(mediaIds);
                const searchResult = await this.mediaRepository.search(criteria, Shopware.Context.api);
                this.mediaItems = mediaIds.map(id => searchResult.get(id)).filter(item => item !== null);
            }
        },

        async onImageUpload(mediaItem) {
            const targetId = mediaItem?.targetId || mediaItem?.id;
            if (!targetId) return;

            if (this._processingIds.has(targetId)) return;
            this._processingIds.add(targetId);

            const resolvedMediaItem = await this.getMediaItem(mediaItem);
            this._processingIds.delete(targetId);

            if (!resolvedMediaItem) return;

            const sliderItems = this.element.config.sliderItems;
            if (sliderItems.source === 'default') {
                sliderItems.value = [];
                sliderItems.source = 'static';
            }

            if (sliderItems.value.some(item => item.mediaId === resolvedMediaItem.id)) {
                return;
            }

            sliderItems.value.push({
                mediaUrl: resolvedMediaItem.url,
                mediaId: resolvedMediaItem.id,
                linkType: 'shopPage',
                cmsPageId: null,
                seoUrl: null,
                customUrl: null,
                url: null,
                newTab: false,
            });

            this.mediaItems.push(resolvedMediaItem);
            this.updateMediaDataValue();
            this.emitUpdateEl();
        },

        async getMediaItem(mediaItem) {
            if (mediaItem && mediaItem.targetId) {
                return this.mediaRepository.get(mediaItem.targetId, Shopware.Context.api);
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
                    linkType: 'shopPage',
                    cmsPageId: null,
                    seoUrl: null,
                    customUrl: null,
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

        onBooleanFieldChange(configKey, value) {
            this.element.config[configKey].value = value;
            this.emitUpdateEl();
        },

        onAutoplayTimeoutChange(value) {
            this.syncAutoplayTimeout(value);
            this.emitUpdateEl();
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

        normalizeSliderItems() {
            if (!Array.isArray(this.element.config.sliderItems.value)) {
                return;
            }

            this.element.config.sliderItems.value = this.element.config.sliderItems.value.map((item) => {
                const normalizedItem = {
                    linkType: 'shopPage',
                    cmsPageId: null,
                    seoUrl: null,
                    customUrl: null,
                    url: null,
                    newTab: false,
                    ...item,
                };

                if (!normalizedItem.linkType) {
                    if (normalizedItem.cmsPageId) {
                        normalizedItem.linkType = 'shopPage';
                    } else if (normalizedItem.url) {
                        normalizedItem.linkType = 'seoUrl';
                        normalizedItem.seoUrl = normalizedItem.url;
                    } else {
                        normalizedItem.linkType = 'shopPage';
                    }
                }

                if (!normalizedItem.seoUrl && normalizedItem.linkType === 'seoUrl' && normalizedItem.url) {
                    normalizedItem.seoUrl = normalizedItem.url;
                }

                if (!normalizedItem.customUrl && normalizedItem.linkType === 'customUrl' && normalizedItem.url) {
                    normalizedItem.customUrl = normalizedItem.url;
                }

                if (normalizedItem.linkType === 'customUrl' && normalizedItem.customUrl) {
                    normalizedItem.customUrl = this.normalizeCustomUrl(normalizedItem.customUrl);
                    normalizedItem.url = normalizedItem.customUrl;
                }

                return normalizedItem;
            });

            this.updateMediaDataValue();
            this.emitUpdateEl();
        },

        onLinkTypeChange(index, value) {
            const item = this.element.config.sliderItems.value[index];
            item.linkType = value;

            if (value !== 'shopPage') {
                item.cmsPageId = null;
            }

            if (value !== 'seoUrl') {
                item.seoUrl = null;
            }

            if (value !== 'customUrl') {
                item.customUrl = null;
            }

            item.url = this.getResolvedUrl(item);
            this.updateMediaDataValue();
            this.emitUpdateEl();
        },

        onCmsPageChange(index, value) {
            const item = this.element.config.sliderItems.value[index];
            item.cmsPageId = value || null;
            if (value) {
                item.linkType = 'shopPage';
            }
            item.url = this.getResolvedUrl(item);
            this.updateMediaDataValue();
            this.emitUpdateEl();
        },

        onUrlChange(index, value) {
            const item = this.element.config.sliderItems.value[index];
            item.seoUrl = value || null;
            item.linkType = 'seoUrl';
            item.url = this.getResolvedUrl(item);
            this.updateMediaDataValue();
            this.emitUpdateEl();
        },

        onCustomUrlChange(index, value) {
            const item = this.element.config.sliderItems.value[index];
            item.customUrl = this.normalizeCustomUrl(value);
            item.linkType = 'customUrl';
            item.url = this.getResolvedUrl(item);
            this.updateMediaDataValue();
            this.emitUpdateEl();
        },

        getResolvedUrl(item) {
            if (item.linkType === 'seoUrl') {
                return item.seoUrl || null;
            }

            if (item.linkType === 'customUrl') {
                return this.normalizeCustomUrl(item.customUrl);
            }

            return null;
        },

        normalizeCustomUrl(value) {
            if (typeof value !== 'string') {
                return null;
            }

            const normalizedValue = value.trim();

            if (!normalizedValue) {
                return null;
            }

            // Keep explicit schemes and true relative URLs unchanged.
            if (
                /^(?:[a-z][a-z\d+\-.]*:)?\/\//i.test(normalizedValue)
                || /^[a-z][a-z\d+\-.]*:/i.test(normalizedValue)
                || /^[/?#]/.test(normalizedValue)
            ) {
                return normalizedValue;
            }

            return `https://${normalizedValue}`;
        },
    },
});
