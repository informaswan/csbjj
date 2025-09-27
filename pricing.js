/**
 * PricingCarousel - A reusable carousel component for pricing cards
 * Usage: new PricingCarousel('carousel-id', options)
 */
class PricingCarousel {
  constructor(carouselId, options = {}) {
    // Default options
    this.options = {
      cardsPerView: 3,
      autoSlide: false,
      autoSlideInterval: 5000,
      enableTouch: true,
      enableDots: true,
      enableArrows: true,
      ...options
    };

    // DOM elements
    this.carousel = document.getElementById(carouselId);
    this.carouselContainer = this.carousel?.parentElement;
    this.prevBtn = null;
    this.nextBtn = null;
    this.dotsContainer = null;

    // State
    this.cards = [];
    this.totalCards = 0;
    this.maxSlide = 0;
    this.currentSlide = 0;
    this.autoSlideTimer = null;

    // Touch handling
    this.startX = 0;
    this.isDragging = false;

    if (!this.carousel) {
      console.error(`Carousel element with id "${carouselId}" not found`);
      return;
    }

    this.init();
  }

  init() {
    this.setupElements();
    this.createNavigation();
    this.bindEvents();
    this.updateCarousel();
    
    if (this.options.autoSlide) {
      this.startAutoSlide();
    }
  }

  setupElements() {
    this.cards = Array.from(this.carousel.children);
    this.totalCards = this.cards.length;
    this.maxSlide = Math.max(0, this.totalCards - this.options.cardsPerView);
  }

  createNavigation() {
    if (!this.carouselContainer) return;

    // Create navigation arrows
    if (this.options.enableArrows && this.maxSlide > 0) {
      this.prevBtn = this.createElement('button', 'carousel-nav prev');
      this.nextBtn = this.createElement('button', 'carousel-nav next');
      
      this.carouselContainer.appendChild(this.prevBtn);
      this.carouselContainer.appendChild(this.nextBtn);
    }

    // Create dots indicator
    if (this.options.enableDots && this.maxSlide > 0) {
      this.dotsContainer = this.createElement('div', 'carousel-dots');
      
      for (let i = 0; i <= this.maxSlide; i++) {
        const dot = this.createElement('div', `dot ${i === 0 ? 'active' : ''}`);
        dot.dataset.slide = i;
        this.dotsContainer.appendChild(dot);
      }
      
      this.carouselContainer.appendChild(this.dotsContainer);
    }
  }

  createElement(tag, className) {
    const element = document.createElement(tag);
    element.className = className;
    return element;
  }

  bindEvents() {
    // Arrow navigation
    if (this.prevBtn && this.nextBtn) {
      this.prevBtn.addEventListener('click', () => this.prevSlide());
      this.nextBtn.addEventListener('click', () => this.nextSlide());
    }

    // Dot navigation
    if (this.dotsContainer) {
      this.dotsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('dot')) {
          const slideIndex = parseInt(e.target.dataset.slide);
          this.goToSlide(slideIndex);
        }
      });
    }

    // Touch/swipe support
    if (this.options.enableTouch) {
      this.carousel.addEventListener('touchstart', (e) => this.handleTouchStart(e));
      this.carousel.addEventListener('touchmove', (e) => this.handleTouchMove(e));
      this.carousel.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    }

    // Window resize
    window.addEventListener('resize', () => this.handleResize());

    // Pause auto-slide on hover
    if (this.options.autoSlide) {
      this.carouselContainer.addEventListener('mouseenter', () => this.pauseAutoSlide());
      this.carouselContainer.addEventListener('mouseleave', () => this.startAutoSlide());
    }
  }

  updateCarousel() {
    // Show/hide cards based on current slide
    this.cards.forEach((card, index) => {
      if (index >= this.currentSlide && index < this.currentSlide + this.options.cardsPerView) {
        card.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
      }
    });

    // Update dots
    if (this.dotsContainer) {
      const dots = this.dotsContainer.querySelectorAll('.dot');
      dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === this.currentSlide);
      });
    }

    // Update arrow states
    this.updateArrowStates();
  }

  updateArrowStates() {
    if (!this.prevBtn || !this.nextBtn) return;

    this.prevBtn.classList.toggle('disabled', this.currentSlide === 0);
    this.nextBtn.classList.toggle('disabled', this.currentSlide === this.maxSlide);
  }

  goToSlide(slideIndex) {
    const newSlide = Math.max(0, Math.min(slideIndex, this.maxSlide));
    if (newSlide !== this.currentSlide) {
      this.currentSlide = newSlide;
      this.updateCarousel();
      this.resetAutoSlide();
    }
  }

  nextSlide() {
    if (this.currentSlide < this.maxSlide) {
      this.goToSlide(this.currentSlide + 1);
    } else if (this.options.autoSlide) {
      // Loop back to start for auto-slide
      this.goToSlide(0);
    }
  }

  prevSlide() {
    if (this.currentSlide > 0) {
      this.goToSlide(this.currentSlide - 1);
    } else if (this.options.autoSlide) {
      // Loop to end for auto-slide
      this.goToSlide(this.maxSlide);
    }
  }

  handleTouchStart(e) {
  this.startX = e.touches[0].clientX;
  this.startY = e.touches[0].clientY;
  this.isDragging = true;
  this.pauseAutoSlide();
}

handleTouchMove(e) {
  if (!this.isDragging) return;

  const currentX = e.touches[0].clientX;
  const currentY = e.touches[0].clientY;

  const diffX = Math.abs(currentX - this.startX);
  const diffY = Math.abs(currentY - this.startY);

  // Only prevent vertical scroll if it's mostly horizontal swipe
  if (diffX > diffY) {
    e.preventDefault();
  }
}

handleTouchEnd(e) {
  if (!this.isDragging) return;
  this.isDragging = false;

  const endX = e.changedTouches[0].clientX;
  const endY = e.changedTouches[0].clientY;
  const diffX = this.startX - endX;
  const diffY = this.startY - endY;

  // Check if it's a swipe (significant horizontal movement)
  if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
    if (diffX > 0) {
      this.nextSlide();
    } else {
      this.prevSlide();
    }
  } else {
    // Treat as tap → let click/link happen naturally
    const target = e.target.closest("a, button");
    if (target) {
      target.click();
    }
  }

  this.startAutoSlide();
}

  // Auto-slide functionality
  startAutoSlide() {
    if (!this.options.autoSlide || this.maxSlide === 0) return;
    
    this.pauseAutoSlide();
    this.autoSlideTimer = setInterval(() => {
      this.nextSlide();
    }, this.options.autoSlideInterval);
  }

  pauseAutoSlide() {
    if (this.autoSlideTimer) {
      clearInterval(this.autoSlideTimer);
      this.autoSlideTimer = null;
    }
  }

  resetAutoSlide() {
    if (this.options.autoSlide) {
      this.pauseAutoSlide();
      this.startAutoSlide();
    }
  }

  handleResize() {
    // Recalculate on resize if needed
    this.updateCarousel();
  }

  // Public methods for external control
  destroy() {
    this.pauseAutoSlide();
    
    // Remove event listeners
    window.removeEventListener('resize', this.handleResize);
    
    // Remove created elements
    if (this.prevBtn) this.prevBtn.remove();
    if (this.nextBtn) this.nextBtn.remove();
    if (this.dotsContainer) this.dotsContainer.remove();
  }

  refresh() {
    this.setupElements();
    this.updateCarousel();
  }

  getCurrentSlide() {
    return this.currentSlide;
  }

  getTotalSlides() {
    return this.maxSlide + 1;
  }
}

// Utility function to load external HTML content
class HTMLLoader {
  static loadComponent(elementId, htmlFile) {
    return fetch(htmlFile)
      .then(res => res.text())
      .then(html => {
        const element = document.getElementById(elementId);
        if (element) {
          element.innerHTML = html;
        }
        return html;
      })
      .catch(err => {
        console.error(`Error loading ${htmlFile}:`, err);
        throw err;
      });
  }

  static loadHead(htmlFile) {
    return fetch(htmlFile)
      .then(res => res.text())
      .then(html => {
        document.head.insertAdjacentHTML("beforeend", html);
        return html;
      })
      .catch(err => {
        console.error(`Error loading head ${htmlFile}:`, err);
        throw err;
      });
  }
}

// Export for use in other files (if using modules)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PricingCarousel, HTMLLoader };
}