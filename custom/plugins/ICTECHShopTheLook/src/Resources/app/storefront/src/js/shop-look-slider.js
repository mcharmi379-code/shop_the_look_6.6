import Plugin from 'src/plugin-system/plugin.class';

export default class ShopLookSlider extends Plugin {

    init() {
        try {
            this._options     = this._parseOptions();
            this.container    = this.el.querySelector('.ict-slider-container');
            this.slides       = this.container ? Array.from(this.container.querySelectorAll('.ict-slide')) : [];
            this.prevBtn      = this.el.querySelector('.ict-slider-prev');
            this.nextBtn      = this.el.querySelector('.ict-slider-next');
            this.dotsContainer = this.el.querySelector('.ict-slider-dots');
            this.currentIndex  = 0;
            this.itemsPerView  = 6;
            this.autoplayInterval = null;

            if (!this.container || this.slides.length === 0) return;

            this._setup();
        } catch (e) {
            console.warn('[ShopLookSlider] init error:', e);
        }
    }

    _parseOptions() {
        try {
            const raw = this.el.getAttribute('data-shop-look-slider-options') || '{}';
            return JSON.parse(raw);
        } catch (e) {
            return {};
        }
    }

    _updateItemsPerView() {
        const w = window.innerWidth;
        if (w >= 1200)      this.itemsPerView = 6;
        else if (w >= 992)  this.itemsPerView = 4;
        else if (w >= 768)  this.itemsPerView = 3;
        else                this.itemsPerView = 2;
    }

    _createDots() {
        if (!this.dotsContainer) return;
        this.dotsContainer.innerHTML = '';
        const totalPages = Math.ceil(this.slides.length / this.itemsPerView);
        for (let i = 0; i < totalPages; i++) {
            const dot = document.createElement('button');
            dot.classList.add('ict-slider-dot');
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => this._goToSlide(i * this.itemsPerView));
            this.dotsContainer.appendChild(dot);
        }
    }

    _updateSlider() {
        if (!this.container) return;
        const slideWidth = 100 / this.itemsPerView;
        this.container.style.transform = `translateX(${-(this.currentIndex * slideWidth)}%)`;

        if (this.dotsContainer) {
            this.dotsContainer.querySelectorAll('.ict-slider-dot').forEach((dot, i) => {
                dot.classList.toggle('active', i === Math.floor(this.currentIndex / this.itemsPerView));
            });
        }
    }

    _goToSlide(index) {
        const max = Math.max(0, this.slides.length - this.itemsPerView);
        this.currentIndex = Math.max(0, Math.min(index, max));
        this._updateSlider();
    }

    _nextSlide() {
        const max = Math.max(0, this.slides.length - this.itemsPerView);
        this.currentIndex = this.currentIndex < max ? this.currentIndex + 1 : 0;
        this._updateSlider();
    }

    _prevSlide() {
        const max = Math.max(0, this.slides.length - this.itemsPerView);
        this.currentIndex = this.currentIndex > 0 ? this.currentIndex - 1 : max;
        this._updateSlider();
    }

    _setup() {
        this._updateItemsPerView();

        const speed = this._options.speed || 300;
        this.container.style.display    = 'flex';
        this.container.style.transition = `transform ${speed}ms ease`;
        this.container.style.width      = `${this.slides.length * (100 / this.itemsPerView)}%`;
        this.slides.forEach(slide => {
            slide.style.flex = `0 0 ${100 / this.slides.length}%`;
        });

        this._createDots();
        this._updateSlider();

        if (this.prevBtn) this.prevBtn.addEventListener('click', () => this._prevSlide());
        if (this.nextBtn) this.nextBtn.addEventListener('click', () => this._nextSlide());

        if (this._options.autoSlide) {
            const timeout = this._options.autoplayTimeout || 5000;
            this.autoplayInterval = setInterval(() => this._nextSlide(), timeout);
            this.el.addEventListener('mouseenter', () => clearInterval(this.autoplayInterval));
            this.el.addEventListener('mouseleave', () => {
                if (this._options.autoSlide) {
                    this.autoplayInterval = setInterval(() => this._nextSlide(), timeout);
                }
            });
        }

        window.addEventListener('resize', () => {
            this._updateItemsPerView();
            this._createDots();
            this._goToSlide(0);
        });
    }
}