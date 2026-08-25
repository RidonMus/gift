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
        /* Jigsaw pieces cannot move to acknowledge a tap — they are clipped to
         * a silhouette that an outline layer traces exactly, and any transform
         * would slide the picture out from under its own cut line. So the
         * feedback is a flash of light instead of a nudge. */
        'piece-pop': {
          '0%': { filter: 'brightness(1)' },
          '40%': { filter: 'brightness(1.28) saturate(1.15)' },
          '100%': { filter: 'brightness(1)' },
        },
        'heart-beat': {
          '0%, 100%': { transform: 'scale(1)' },
          '25%': { transform: 'scale(1.18)' },
          '50%': { transform: 'scale(1)' },
          '75%': { transform: 'scale(1.12)' },
        },
        /* The jar rocks on its base, so the origin sits at the bottom. */
        'jar-shake': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '15%': { transform: 'rotate(-7deg)' },
          '30%': { transform: 'rotate(6deg)' },
          '45%': { transform: 'rotate(-5deg)' },
          '60%': { transform: 'rotate(4deg)' },
          '80%': { transform: 'rotate(-2deg)' },
        },
        /* A folded slip lifting out of the jar's mouth and tumbling upward. */
        'paper-fly': {
          '0%': { opacity: '0', transform: 'translate(-50%, 0) scale(0.35) rotate(0deg)' },
          '25%': { opacity: '1', transform: 'translate(-50%, -40px) scale(0.6) rotate(-14deg)' },
          '70%': { opacity: '1', transform: 'translate(-50%, -120px) scale(0.85) rotate(12deg)' },
          '100%': { opacity: '0', transform: 'translate(-50%, -170px) scale(1.1) rotate(-6deg)' },
        },
        /* Each leaf swings from the string it hangs by, not its middle. */
        'leaf-sway': {
          '0%, 100%': { transform: 'rotate(-3.5deg)' },
          '50%': { transform: 'rotate(3.5deg)' },
        },
        /* The whole tree rocking when she shakes it. */
        'tree-rock': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '15%': { transform: 'rotate(-2.2deg)' },
          '35%': { transform: 'rotate(1.8deg)' },
          '55%': { transform: 'rotate(-1.2deg)' },
          '75%': { transform: 'rotate(0.8deg)' },
        },
        /* A petal shaken loose, drifting sideways as it falls. */
        'petal-fall': {
          '0%': { opacity: '0', transform: 'translate(0, 0) rotate(0deg)' },
          '12%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'translate(var(--drift, 30px), 240px) rotate(320deg)' },
        },
        /* Fireflies, once the sun is down over Tashkent. */
        'firefly-drift': {
          '0%, 100%': { opacity: '0.15', transform: 'translate(0, 0)' },
          '25%': { opacity: '0.9', transform: 'translate(14px, -12px)' },
          '50%': { opacity: '0.35', transform: 'translate(-8px, -22px)' },
          '75%': { opacity: '0.85', transform: 'translate(-16px, -8px)' },
        },
        /* Snow, in a Tashkent winter. */
        'snow-fall': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '15%': { opacity: '0.9' },
          '100%': { opacity: '0', transform: 'translateY(300px)' },
        },
        /* The note that flutters down when the tree is shaken. */
        'flutter-down': {
          '0%': { opacity: '0', transform: 'translate(-50%, -140px) rotate(-18deg) scale(0.5)' },
          '30%': { opacity: '1', transform: 'translate(-50%, -70px) rotate(14deg) scale(0.7)' },
          '65%': { transform: 'translate(-50%, -20px) rotate(-8deg) scale(0.9)' },
          '100%': { opacity: '1', transform: 'translate(-50%, 0) rotate(0deg) scale(1)' },
        },
        /* A new stage of growth arriving. */
        'grow-in': {
          '0%': { opacity: '0', transform: 'scale(0.7)' },
          '60%': { opacity: '1', transform: 'scale(1.08)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        /* The note unfolding: a squashed slip springing open into a square. */
        'note-unfold': {
          '0%': { opacity: '0', transform: 'scale(0.2, 0.05) rotate(-12deg)' },
          '45%': { opacity: '1', transform: 'scale(1.04, 0.55) rotate(4deg)' },
          '70%': { transform: 'scale(0.98, 1.05) rotate(-2deg)' },
          '100%': { opacity: '1', transform: 'scale(1, 1) rotate(-1deg)' },
        },
      },
      animation: {
        'float-soft': 'float-soft 6s ease-in-out infinite',
        'pop-in': 'pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'fade-up': 'fade-up 0.6s ease-out both',
        wiggle: 'wiggle 1.6s ease-in-out infinite',
        'tile-pop': 'tile-pop 0.32s ease-out',
        'piece-pop': 'piece-pop 0.42s ease-out',
        'heart-beat': 'heart-beat 1.8s ease-in-out infinite',
        'jar-shake': 'jar-shake 0.55s ease-in-out',
        'leaf-sway': 'leaf-sway 4s ease-in-out infinite',
        'tree-rock': 'tree-rock 0.9s ease-in-out',
        'petal-fall': 'petal-fall 2.6s ease-in forwards',
        'firefly-drift': 'firefly-drift 6s ease-in-out infinite',
        'snow-fall': 'snow-fall 9s linear infinite',
        'flutter-down': 'flutter-down 0.9s cubic-bezier(0.34, 1.4, 0.64, 1) both',
        'grow-in': 'grow-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'paper-fly': 'paper-fly 0.85s ease-out forwards',
        'note-unfold': 'note-unfold 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      },
    },
  },
  plugins: [],
}
