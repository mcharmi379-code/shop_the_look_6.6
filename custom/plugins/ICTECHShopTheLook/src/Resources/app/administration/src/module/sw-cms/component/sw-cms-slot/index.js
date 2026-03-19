const { Component } = Shopware;

/**
 * Overrides the core sw-cms-slot component to inject validation
 * before the settings modal is allowed to close.
 *
 * If the active element component exposes a validate() method
 * (e.g. sw-cms-el-config-ict-shop-the-look), it is called first.
 * Returning false from validate() blocks the modal from closing,
 * allowing the config component to show an inline error to the user.
 */
Component.override('sw-cms-slot', {
    methods: {
        onCloseSettingsModal() {
            const ref = this.$refs.elementComponentRef;
            // Only block close if the element component explicitly returns false
            if (ref && typeof ref.validate === 'function') {
                if (!ref.validate()) {
                    return;
                }
            }
            this.$super('onCloseSettingsModal');
        },
    },
});
