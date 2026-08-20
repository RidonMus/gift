/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FBF9F5',
        'paper-deep': '#F7F4EE',
        ink: '#3C3A38',
        'ink-soft': '#6E6864',
        'ink-faint': '#A29A93',
        blush: {
          DEFAULT: '#F3C4CB',
          soft: '#FAE3E6',
          deep: '#E39BA6',
        },
        sage: {
          DEFAULT: '#C3D5BC',
          soft: '#E4EDE0',
          deep: '#9DB795',
        },
        butter: {
          DEFAULT: '#F6E3A8',
          soft: '#FBF2D6',
          deep: '#E8CB74',
        },
        sky: {
          DEFAULT: '#C2DCE8',
          soft: '#E2EFF5',
          deep: '#95BFD2',
        },
        peach: '#F7D2B6',
        lilac: '#D9CDE8',
        clay: '#DFA98E',
      },
      fontFamily: {
        hand: ['Caveat', 'Bradley Hand', 'Segoe Print', 'cursive'],
        body: ['Nunito', 'Avenir Next', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        sketch: '2px 3px 0 rgba(60, 58, 56, 0.10)',
        'sketch-lg': '4px 6px 0 rgba(60, 58, 56, 0.10)',
        lifted: '0 10px 30px -12px rgba(60, 58, 56, 0.28)',
      },
      keyframes: {
        'float-soft': {
          '0%, 100%': { transform: 'translateY(0) rotate(-1deg)' },
          '50%': { transform: 'translateY(-8px) rotate(1deg)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.9) translateY(10px)' },
          '60%': { opacity: '1', transform: 'scale(1.02) translateY(0)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        'tile-pop': {
          '0%': { transform: 'scale(1)' },
          '45%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)' },
        },
        'heart-beat': {
          '0%, 100%': { transform: 'scale(1)' },
          '25%': { transform: 'scale(1.18)' },
          '50%': { transform: 'scale(1)' },
          '75%': { transform: 'scale(1.12)' },
        },
      },
      animation: {
        'float-soft': 'float-soft 6s ease-in-out infinite',
        'pop-in': 'pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'fade-up': 'fade-up 0.6s ease-out both',
        wiggle: 'wiggle 1.6s ease-in-out infinite',
        'tile-pop': 'tile-pop 0.32s ease-out',
        'heart-beat': 'heart-beat 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
