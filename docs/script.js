// ============================================
// Suki AI Companion - Landing Page Scripts
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide icons
    lucide.createIcons();

    // Create floating particles
    createParticles();

    // Smooth scroll for anchor links
    setupSmoothScroll();

    // Typing animation for hero
    setupTypingAnimation();

    // Navbar background on scroll
    setupNavbarScroll();
});

// ============================================
// Floating Particles
// ============================================

function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    const particleCount = 30;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 10}s`;
        particle.style.animationDuration = `${8 + Math.random() * 8}s`;
        particle.style.width = `${2 + Math.random() * 4}px`;
        particle.style.height = particle.style.width;
        container.appendChild(particle);
    }
}

// ============================================
// Smooth Scroll
// ============================================

function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// ============================================
// Typing Animation
// ============================================

function setupTypingAnimation() {
    const typingElement = document.querySelector('.typing-text');
    if (!typingElement) return;

    const text = typingElement.textContent;
    typingElement.textContent = '';
    typingElement.style.borderRight = '2px solid var(--ani-primary)';

    let index = 0;
    const typeChar = () => {
        if (index < text.length) {
            typingElement.textContent += text.charAt(index);
            index++;
            setTimeout(typeChar, 50);
        } else {
            // Remove cursor after typing
            setTimeout(() => {
                typingElement.style.borderRight = 'none';
            }, 1000);
        }
    };

    // Start typing after a delay
    setTimeout(typeChar, 500);
}

// ============================================
// Navbar Scroll Effect
// ============================================

function setupNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 50) {
            navbar.style.background = 'rgba(2, 1, 4, 0.95)';
        } else {
            navbar.style.background = 'rgba(2, 1, 4, 0.8)';
        }

        lastScroll = currentScroll;
    });
}

// ============================================
// Intersection Observer for Animations
// ============================================

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
        }
    });
}, observerOptions);

// Observe elements for scroll animations
document.querySelectorAll('.feature-card, .level-card, .customize-item').forEach(el => {
    observer.observe(el);
});
