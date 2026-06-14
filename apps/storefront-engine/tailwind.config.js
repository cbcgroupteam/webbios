/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/storefront-ui/src/**/*.{ts,tsx}"
  ],
  presets: [
    require('../../packages/storefront-ui/tailwind.config.js')
  ]
}
