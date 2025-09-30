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
    this.currentSlide = 0;
    this.autoSlideTimer = null;

    // Touch handling
    this.startX = 0;
    this.startY = 0;
    this.isDragging = false;
    this.hasMoved = false;

    if (!this.carousel) {
      console.error(`Carousel element with id "${carouselId}" not found`);
      return;
    }

    this.init();
  }

  init() {
    this.setupElements();
    this.findOrCreateNavigation();
    this.bindEvents();
    
    // Mark carousel as initialized to enable CSS transitions
    this.carousel.classList.add('carousel-initialized');
    this.carouselContainer.classList.add('carousel-ready');
    
    this.updateCarousel();
    
    if (this.options.autoSlide) {
      this.startAutoSlide();
    }
  }

  setupElements() {
    this.cards = Array.from(this.carousel.children);
    this.totalCards = this.cards.length;
  }

  findOrCreateNavigation() {
    if (!this.carouselContainer) return;

    // Try to find existing navigation arrows (they should be siblings of the carousel in the container)
    if (this.options.enableArrows) {
      this.prevBtn = this.carouselContainer.querySelector('.carousel-nav.prev');
      this.nextBtn = this.carouselContainer.querySelector('.carousel-nav.next');
      
      // Create if they don't exist
      if (!this.prevBtn) {
        this.prevBtn = this.createElement('button', 'carousel-nav prev');
        this.prevBtn.id = 'prevBtn';
        this.prevBtn.setAttribute('aria-label', 'Previous slide');
        this.carouselContainer.appendChild(this.prevBtn);
      }
      
      if (!this.nextBtn) {
        this.nextBtn = this.createElement('button', 'carousel-nav next');
        this.nextBtn.id = 'nextBtn';
        this.nextBtn.setAttribute('aria-label', 'Next slide');
        this.carouselContainer.appendChild(this.nextBtn);
      }
    }

    // Try to find existing dots container (it's a sibling of carousel-container)
    if (this.options.enableDots) {
      this.dotsContainer = document.querySelector('#carouselDots');
      
      if (!this.dotsContainer) {
        this.dotsContainer = this.createElement('div', 'carousel-dots');
        this.dotsContainer.id = 'carouselDots';
        
        for (let i = 0; i < this.totalCards; i++) {
          const dot = this.createElement('div', `dot ${i === 0 ? 'active' : ''}`);
          dot.dataset.slide = i;
          this.dotsContainer.appendChild(dot);
        }
        
        // Insert after carousel container
        this.carouselContainer.insertAdjacentElement('afterend', this.dotsContainer);
      }
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
    // Calculate which cards should be visible
    const visibleIndices = [];
    for (let i = 0; i < this.options.cardsPerView; i++) {
      const index = (this.currentSlide + i) % this.totalCards;
      visibleIndices.push(index);
    }

    // Reorder the cards in the DOM to match the visible order
    // Clear the carousel
    this.carousel.innerHTML = '';
    
    // Add visible cards in order
    visibleIndices.forEach(index => {
      this.carousel.appendChild(this.cards[index]);
    });

    // Update dots
    if (this.dotsContainer) {
      const dots = this.dotsContainer.querySelectorAll('.dot');
      dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === this.currentSlide);
      });
    }
  }

  goToSlide(slideIndex) {
    // Normalize the slide index to wrap around
    let newSlide = slideIndex % this.totalCards;
    if (newSlide < 0) {
      newSlide = this.totalCards + newSlide;
    }
    
    this.currentSlide = newSlide;
    this.updateCarousel();
    this.resetAutoSlide();
  }

  nextSlide() {
    this.goToSlide(this.currentSlide + 1);
  }

  prevSlide() {
    this.goToSlide(this.currentSlide - 1);
  }

  handleTouchStart(e) {
    this.startX = e.touches[0].clientX;
    this.startY = e.touches[0].clientY;
    this.isDragging = false;
    this.hasMoved = false;
    this.pauseAutoSlide();
  }

  handleTouchMove(e) {
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;

    const diffX = Math.abs(currentX - this.startX);
    const diffY = Math.abs(currentY - this.startY);

    if (diffX > 10 || diffY > 10) {
      this.hasMoved = true;
    }

    if (diffX > 15 && diffX > diffY * 1.5) {
      this.isDragging = true;
      e.preventDefault();
    }
  }

  handleTouchEnd(e) {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = this.startX - endX;
    const diffY = Math.abs(this.startY - endY);

    if (this.isDragging && Math.abs(diffX) > 80 && Math.abs(diffX) > diffY * 2) {
      e.preventDefault();
      if (diffX > 0) {
        this.nextSlide();
      } else {
        this.prevSlide();
      }
    } else if (!this.hasMoved) {
      const target = e.target.closest("a, button");
      if (target) {
        target.click();
      }
    }

    this.isDragging = false;
    this.hasMoved = false;
    this.startAutoSlide();
  }

  startAutoSlide() {
    if (!this.options.autoSlide) return;
    
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
    this.updateCarousel();
  }

  destroy() {
    this.pauseAutoSlide();
    window.removeEventListener('resize', this.handleResize);
    
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
    return this.totalCards;
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