/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Gothic Lolita inspired color palette
                gothic: {
                    black: '#0a0a0a',
                    charcoal: '#1a1a1a',
                    purple: '#2d1b3d',
                    wine: '#4a1c40',
                    rose: '#8b3a62',
                    pink: '#d4a5c9',
                    cream: '#f5f0eb',
                    gold: '#c9a227',
                    silver: '#a8a8a8',
                },
                // Ani's theme colors
                ani: {
                    primary: '#ff6b9d',
                    secondary: '#c44569',
                    accent: '#ffd93d',
                    glow: '#ff9ff3',
                    blush: '#ffb3ba',
                }
            },
            fontFamily: {
                display: ['Outfit', 'sans-serif'],
                body: ['Inter', 'sans-serif'],
                cute: ['Quicksand', 'sans-serif'],
            },
            animation: {
                'float': 'float 3s ease-in-out infinite',
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
                'heart-beat': 'heart-beat 1s ease-in-out infinite',
                'fade-in': 'fade-in 0.5s ease-out',
                'slide-up': 'slide-up 0.3s ease-out',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                'pulse-glow': {
                    '0%, 100%': { boxShadow: '0 0 20px rgba(255, 107, 157, 0.5)' },
                    '50%': { boxShadow: '0 0 40px rgba(255, 107, 157, 0.8)' },
                },
                'heart-beat': {
                    '0%, 100%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.1)' },
                },
                'fade-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                'slide-up': {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
            },
            backdropBlur: {
                xs: '2px',
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}
