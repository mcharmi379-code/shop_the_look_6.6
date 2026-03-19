import ShopLookSlider from './js/shop-look-slider';
import './js/shop-the-look';

// Initialise all ShopLookSlider instances once the DOM is ready.
// shop-the-look.js self-initialises via its own DOMContentLoaded listener.
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.ict-shop-look-slider').forEach(el => new ShopLookSlider(el));
});
