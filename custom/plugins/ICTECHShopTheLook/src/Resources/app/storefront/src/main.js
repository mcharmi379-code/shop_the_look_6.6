import ShopLookSliderPlugin from './js/shop-look-slider';
import ShopTheLookPlugin from './js/shop-the-look';

const PluginManager = window.PluginManager;

PluginManager.register('ShopLookSlider', ShopLookSliderPlugin, '[data-shop-look-slider-options]');