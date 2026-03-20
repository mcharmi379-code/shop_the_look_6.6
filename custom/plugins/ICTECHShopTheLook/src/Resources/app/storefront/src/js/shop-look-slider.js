import Plugin from 'src/plugin-system/plugin.class';

export default class ShopLookSlider extends Plugin {

    init() {
        this.container      = this.el.querySelector('.ict-slider-container');
        this.slides         = this.container ? this.container.querySelectorAll('.ict-slide') : [];
        this.prevBtn        = this.el.querySelector('.ict-slider-prev');
        this.nextBtn        = this.el.querySelector('.ict-slider-next');
        this.dotsContainer  = this.el.querySelector('.ict-slider-dots');
        this.options        = JSON.parse(this.el.dataset.shopLookSliderOptions || '{}');
        this.currentIndex   = 0;
        this.itemsPerView   = 6;
        this.autoplayInterval = null;

        if (!this.container || this.slides.length === 0) return;

        this._init();
    }

    _updateItemsPerView() {
        const breakpoints = [
            { min: 1200, items: 6 },
            { min: 992,  items: 4 },
            { min: 768,  items: 3 },
            { min: 0,    items: 2 },
        ];
        this.itemsPerView = breakpoints.find(bp => window.innerWidth >= bp.min).items;
    }

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

    _updateSlider() {
        const slideWidth = 100 / this.itemsPerView;
        this.container.style.transform = `translateX(${-(this.currentIndex * slideWidth)}%)`;

        if (this.dotsContainer) {
            this.dotsContainer.querySelectorAll('.ict-slider-dot').forEach((dot, i) => {
                dot.classList.toggle('active', i === Math.floor(this.currentIndex / this.itemsPerView));
            });
        }
    }

    _goToSlide(index) {
        this.currentIndex = Math.max(0, Math.min(index, this.slides.length - this.itemsPerView));
        this._updateSlider();
    }

    _nextSlide() {
        this.currentIndex = this.currentIndex < this.slides.length - this.itemsPerView
            ? this.currentIndex + 1
            : 0;
        this._updateSlider();
    }

    _prevSlide() {
        this.currentIndex = this.currentIndex > 0
            ? this.currentIndex - 1
            : this.slides.length - this.itemsPerView;
        this._updateSlider();
    }

    _init() {
        this._updateItemsPerView();

        this.container.style.display    = 'flex';
        this.container.style.transition = `transform ${this.options.speed || 300}ms ease`;
        this.container.style.width      = `${this.slides.length * (100 / this.itemsPerView)}%`;
        this.slides.forEach(slide => {
            slide.style.flex = `0 0 ${100 / this.slides.length}%`;
        });

        this._createDots();
        this._updateSlider();

        if (this.prevBtn) this.prevBtn.addEventListener('click', () => this._prevSlide());
        if (this.nextBtn) this.nextBtn.addEventListener('click', () => this._nextSlide());

        if (this.options.autoSlide) {
            this.autoplayInterval = setInterval(() => this._nextSlide(), this.options.autoplayTimeout || 5000);
            this.el.addEventListener('mouseenter', () => clearInterval(this.autoplayInterval));
            this.el.addEventListener('mouseleave', () => {
                if (this.options.autoSlide) {
                    this.autoplayInterval = setInterval(() => this._nextSlide(), this.options.autoplayTimeout || 5000);
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