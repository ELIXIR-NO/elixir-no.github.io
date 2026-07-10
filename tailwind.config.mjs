const defaultTheme = require('tailwindcss/defaultTheme')
const colors = require('tailwindcss/colors')

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'selector',
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--font-body, ui-sans-serif)', ...defaultTheme.fontFamily.sans],
                display: ['var(--font-display, ui-sans-serif)', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                accent: 'rgb(var(--color-accent) / <alpha-value>)',
                brand: {
                    "primary": "#023452",
                    "secondary": "#f47d20",
                    "grey": "#4d4848",
                },
                light: {
                    "background": colors.white,
                    "surface": "#f8f9fa",
                    "on-background": "#4d4848",
                    "on-surface": "#4d4848",
                },
                dark: {
                    "background": "#121212",
                    "surface": "#202020",
                    "on-background": colors.slate["100"],
                    "on-surface": colors.slate["200"],
                    "on-primary": colors.white,
                },
            },
            invert: {
                85: '.85',
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
    ],
}
