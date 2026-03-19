/**
 * ShopLookSlider
 *
 * Vanilla JS slider for the 'ict-shop-look-slider' CMS element.
 * Handles responsive items-per-view, navigation arrows, dot indicators,
 * autoplay, and window resize recalculation.
 *
 * Usage: new ShopLookSlider(el) where el is the .ict-shop-look-slider DOM element.
 * Options are read from the element's data-shop-look-slider-options JSON attribute.
 */
export default class ShopLookSlider {
    /**
     * @param {HTMLElement} el - The root slider element (.ict-shop-look-slider)
     */
    constructor(el) {
        this.el             = el;
        this.container      = el.querySelector('.ict-slider-container');
        this.slides         = this.container.querySelectorAll('.ict-slide');
        this.prevBtn        = el.querySelector('.ict-slider-prev');
        this.nextBtn        = el.querySelector('.ict-slider-next');
        this.dotsContainer  = el.querySelector('.ict-slider-dots');
        // Options are passed from Twig via a JSON data attribute
        this.options        = JSON.parse(el.dataset.shopLookSliderOptions || '{}');
        this.currentIndex   = 0;
        this.itemsPerView   = 6;
        this.autoplayInterval = null;

        if (this.slides.length === 0) return;

        this._init();
    }

    /**
     * Updates itemsPerView based on the current viewport width.
     * Breakpoints: ≥1200 → 6, ≥992 → 4, ≥768 → 3, <768 → 2
     */
    _updateItemsPerView() {
        const viewportWidth = window.innerWidth;
        if (viewportWidth >= 1200)      this.itemsPerView = 6;
        else if (viewportWidth >= 992)  this.itemsPerView = 4;
        else if (viewportWidth >= 768)  this.itemsPerView = 3;
        else                            this.itemsPerView = 2;
    }

    /**
     * Rebuilds the dot navigation indicators.
     * One dot per page (group of itemsPerView slides).
     * Each dot click jumps to the corresponding page.
     */
    _createDots() {
        if (!this.dotsContainer) return;
        this.dotsContainer.innerHTML = '';
        const totalDotPages = Math.ceil(this.slides.length / this.itemsPerView);
        for (let dotIndex = 0; dotIndex < totalDotPages; dotIndex++) {
            const dot = document.createElement('button');
            dot.classList.add('ict-slider-dot');
            if (dotIndex === 0) dot.classList.add('active');
            dot.addEventListener('click', () => this._goToSlide(dotIndex * this.itemsPerView));
            this.dotsContainer.appendChild(dot);
        }
    }

    /**
     * Applies the CSS transform to slide the container to the current index
     * and updates the active dot indicator.
     *
     * Uses percentage-based translateX so the slider is fully responsive
     * without needing to know pixel widths.
     */
    _updateSlider() {
        const slideWidth = 100 / this.itemsPerView;
        this.container.style.transform = `translateX(${-(this.currentIndex * slideWidth)}%)`;

        if (this.dotsContainer) {
            this.dotsContainer.querySelectorAll('.ict-slider-dot').forEach((dot, i) => {
                dot.classList.toggle('active', i === Math.floor(this.currentIndex / this.itemsPerView));
            });
        }
    }

    /**
     * Navigates to a specific slide index, clamped to valid bounds.
     *
     * @param {number} index - Target slide index
     */
    _goToSlide(index) {
        this.currentIndex = Math.max(0, Math.min(index, this.slides.length - this.itemsPerView));
        this._updateSlider();
    }

    /**
     * Advances to the next slide. Wraps around to the first slide
     * when the end is reached (used by autoplay and next button).
     */
    _nextSlide() {
        this.currentIndex = this.currentIndex < this.slides.length - this.itemsPerView
            ? this.currentIndex + 1
            : 0;
        this._updateSlider();
    }

    /**
     * Goes back to the previous slide. Wraps around to the last slide
     * when at the beginning (used by prev button).
     */
    _prevSlide() {
        this.currentIndex = this.currentIndex > 0
            ? this.currentIndex - 1
            : this.slides.length - this.itemsPerView;
        this._updateSlider();
    }

    /**
     * Initialises the slider:
     * - Sets responsive items-per-view
     * - Applies flex layout and transition to the container
     * - Calculates slide widths as fractions of the total container width
     * - Creates dot indicators
     * - Binds prev/next button click events
     * - Starts autoplay if configured (pauses on hover)
     * - Recalculates layout on window resize
     */
    _init() {
        this._updateItemsPerView();

        this.container.style.display    = 'flex';
        this.container.style.transition = `transform ${this.options.speed || 300}ms ease`;
        // Total container width = number of slides × (100% / itemsPerView)
        this.container.style.width      = `${this.slides.length * (100 / this.itemsPerView)}%`;
        this.slides.forEach(slide => {
            // Each slide takes an equal fraction of the total container width
            slide.style.flex = `0 0 ${100 / this.slides.length}%`;
        });

        this._createDots();
        this._updateSlider();

        if (this.prevBtn) this.prevBtn.addEventListener('click', () => this._prevSlide());
        if (this.nextBtn) this.nextBtn.addEventListener('click', () => this._nextSlide());

        // Autoplay: start interval, pause on hover, resume on mouse leave
        if (this.options.autoSlide) {
            this.autoplayInterval = setInterval(() => this._nextSlide(), this.options.autoplayTimeout || 5000);
            this.el.addEventListener('mouseenter', () => clearInterval(this.autoplayInterval));
            this.el.addEventListener('mouseleave', () => {
                if (this.options.autoSlide) {
                    this.autoplayInterval = setInterval(() => this._nextSlide(), this.options.autoplayTimeout || 5000);
                }
            });
        }

        // On resize: recalculate items-per-view, rebuild dots, and reset to first slide
        window.addEventListener('resize', () => {
            this._updateItemsPerView();
            this._createDots();
            this._goToSlide(0);
        });
    }
}
