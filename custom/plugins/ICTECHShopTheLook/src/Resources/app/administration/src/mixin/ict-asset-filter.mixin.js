const { Mixin } = Shopware;

Mixin.register('ict-asset-filter', {
    computed: {
        assetFilter() {
            return Shopware.Filter.getByName('asset');
        },
    },
});
