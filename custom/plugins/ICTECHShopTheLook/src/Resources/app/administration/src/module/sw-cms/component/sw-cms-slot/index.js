const { Component } = Shopware;

Component.override('sw-cms-slot', {
    methods: {
        onCloseSettingsModal() {
            const ref = this.$refs.elementComponentRef;
            if (ref && typeof ref.validate === 'function' && !ref.validate()) {
                return;
            }
            this.$super('onCloseSettingsModal');
        },
    },
});
