import Plugin from 'src/plugin-system/plugin.class';

export default class ShopLookSlider extends Plugin {

    init() {
        try {
            this._options      = this._parseOptions();
            this.container     = this.el.querySelector('.ict-slider-container');
            this.prevBtn       = this.el.querySelector('.ict-slider-prev');
            this.nextBtn       = this.el.querySelector('.ict-slider-next');
            this.dotsContainer = this.el.querySelector('.ict-slider-dots');
            this.currentIndex  = 0;
            this.itemsPerView  = 6;
            this.realCount     = 0;
            this.cloneOffset   = 0;
            this.autoplayInterval = null;
            this._boundResize = this._handleResize.bind(this);
            this._boundTransitionEnd = this._handleTransitionEnd.bind(this);

            if (!this.container) return;
            const rawSlides = this.container.querySelectorAll('.ict-slide');
            if (rawSlides.length === 0) return;

            this._setup();
        } catch (e) {
            console.warn('[ShopLookSlider] init error:', e);
        }
    }

    _parseOptions() {
        try {
            return JSON.parse(this.el.getAttribute('data-shop-look-slider-options') || '{}');
        } catch (e) {
            return {};
        }
    }

    _updateItemsPerView() {
        const w = window.innerWidth;
        if (w >= 1200)     this.itemsPerView = 6;
        else if (w >= 992) this.itemsPerView = 4;
        else if (w >= 768) this.itemsPerView = 3;
        else               this.itemsPerView = 2;
    }

    _buildSlides() {
        this.container.querySelectorAll('.ict-slide--clone').forEach(c => c.remove());

        const originals = Array.from(this.container.querySelectorAll('.ict-slide:not(.ict-slide--clone)'));
        this.realCount = originals.length;
        this.cloneOffset = this._options.autoSlide ? Math.min(this.itemsPerView, this.realCount) : 0;

        if (this._options.autoSlide && this.cloneOffset > 0) {
            originals.slice(-this.cloneOffset).forEach(slide => {
                const clone = slide.cloneNode(true);
                clone.classList.add('ict-slide--clone');
                this.container.insertBefore(clone, this.container.firstChild);
            });

            originals.slice(0, this.cloneOffset).forEach(slide => {
                const clone = slide.cloneNode(true);
                clone.classList.add('ict-slide--clone');
                this.container.appendChild(clone);
            });
        }

        this.slides = Array.from(this.container.querySelectorAll('.ict-slide'));

        const total = this.slides.length;
        this.container.style.width = `${(total / this.itemsPerView) * 100}%`;
        this.slides.forEach(slide => {
            slide.style.flex = `0 0 ${100 / total}%`;
            slide.style.boxSizing = 'border-box';
        });
    }

    _getMaxRealIndex() {
        return Math.max(0, this.realCount - this.itemsPerView);
    }

    _getLoopEndIndex() {
        return this.cloneOffset + this.realCount;
    }

    _createDots() {
        if (!this.dotsContainer) return;
        this.dotsContainer.innerHTML = '';
        const pages = Math.ceil(this.realCount / this.itemsPerView);
        for (let i = 0; i < pages; i++) {
            const dot = document.createElement('button');
            dot.classList.add('ict-slider-dot');
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => this._goToSlide(i * this.itemsPerView));
            this.dotsContainer.appendChild(dot);
        }
    }

    _applyTransform(animate) {
        const speed = this._options.speed || 300;
        this.container.style.transition = animate ? `transform ${speed}ms ease` : 'none';
        const slideEl = this.slides[0];
        const slideWidth = slideEl ? slideEl.offsetWidth : 0;
        this.container.style.transform = `translateX(${-(this.currentIndex * slideWidth)}px)`;
    }

    _updateButtons() {
        const realIndex = this._getRealIndex();
        if (this.prevBtn) this.prevBtn.disabled = !this._options.autoSlide && realIndex <= 0;
        if (this.nextBtn) this.nextBtn.disabled = !this._options.autoSlide && realIndex >= this.realCount - this.itemsPerView;
    }

    _updateDots() {
        if (!this.dotsContainer) return;
        const activeDot = Math.floor(this._getRealIndex() / this.itemsPerView);
        this.dotsContainer.querySelectorAll('.ict-slider-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === activeDot);
        });
    }

    _goToSlide(index) {
        const bounded = Math.max(0, Math.min(index, this._getMaxRealIndex()));
        this.currentIndex = this._options.autoSlide ? bounded + this.cloneOffset : bounded;
        this._applyTransform(true);
        this._updateButtons();
        this._updateDots();
    }

    _nextSlide(wrap = false) {
        if (this._isResetting) return;

        const maxReal = this._getMaxRealIndex();
        const realIndex = this._getRealIndex();

        if (realIndex < maxReal) {
            this.currentIndex++;
            this._applyTransform(true);
            this._updateButtons();
            this._updateDots();
        } else if (wrap) {
            this.currentIndex++;
            this._applyTransform(true);
            this._updateButtons();
            this._updateDots();
        }
    }

    _prevSlide() {
        if (this._getRealIndex() > 0) {
            this.currentIndex--;
            this._applyTransform(true);
            this._updateButtons();
            this._updateDots();
        }
    }

    _getRealIndex() {
        if (!this._options.autoSlide || this.realCount === 0) {
            return this.currentIndex;
        }

        const normalizedIndex = (this.currentIndex - this.cloneOffset + this.realCount) % this.realCount;
        return Math.min(normalizedIndex, this._getMaxRealIndex());
    }

    _handleTransitionEnd() {
        if (!this._options.autoSlide || this.cloneOffset === 0) {
            return;
        }

        const loopEndIndex = this._getLoopEndIndex();

        if (this.currentIndex < this.cloneOffset || this.currentIndex >= loopEndIndex) {
            this._isResetting = true;

            if (this.currentIndex >= loopEndIndex) {
                this.currentIndex -= this.realCount;
            } else if (this.currentIndex < this.cloneOffset) {
                this.currentIndex += this.realCount;
            }

            this._applyTransform(false);
            this._updateButtons();
            this._updateDots();

            requestAnimationFrame(() => {
                this._isResetting = false;
            });
        }
    }

    _handleResize() {
        clearInterval(this.autoplayInterval);
        this._isResetting = false;
        this._updateItemsPerView();
        this._buildSlides();
        this._createDots();
        this.currentIndex = this._options.autoSlide ? this.cloneOffset : 0;
        this._applyTransform(false);
        this._updateButtons();
        this._updateDots();

        if (this._options.autoSlide) {
            this._startAutoplay();
        }
    }

    _startAutoplay() {
        clearInterval(this.autoplayInterval);
        this.autoplayInterval = setInterval(
            () => this._nextSlide(true),
            this._options.autoplayTimeout || 5000
        );
    }

    _setup() {
        this._isResetting = false;
        this._updateItemsPerView();
        this.container.style.display = 'flex';
        this._buildSlides();
        this._createDots();

        // Start positioned at cloneOffset so prepended clones are hidden left
        if (this._options.autoSlide) {
            this.currentIndex = this.cloneOffset;
        }

        this._applyTransform(false);
        this._updateButtons();
        this._updateDots();
        this.container.removeEventListener('transitionend', this._boundTransitionEnd);
        this.container.addEventListener('transitionend', this._boundTransitionEnd);

        if (this.prevBtn) this.prevBtn.addEventListener('click', () => this._prevSlide());
        if (this.nextBtn) this.nextBtn.addEventListener('click', () => this._nextSlide(false));

        if (this._options.autoSlide) {
            this._startAutoplay();
            this.el.addEventListener('mouseenter', () => {
                clearInterval(this.autoplayInterval);
            });
            this.el.addEventListener('mouseleave', () => {
                if (!this._isResetting) this._startAutoplay();
            });
        }

        window.removeEventListener('resize', this._boundResize);
        window.addEventListener('resize', this._boundResize);
    }
}
