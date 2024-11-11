module.exports = {
  content: ['./public/*.html', './public/*.js'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E40AF', // Blu scuro
          light: '#60A5FA',   // Blu chiaro
        },
        secondary: {
          DEFAULT: '#FBBF24', // Giallo
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
};
