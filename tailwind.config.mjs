const defaultTheme = require('tailwindcss/defaultTheme')

const token = (name) => `rgb(var(--color-${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'selector',
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--font-body, ui-sans-serif)', ...defaultTheme.fontFamily.sans],
                display: ['var(--font-display, ui-sans-serif)', ...defaultTheme.fontFamily.sans],
                mono: ['var(--font-mono, ui-monospace)', ...defaultTheme.fontFamily.mono],
            },
            colors: {
                accent: token('accent'),
                // Theme-aware: values flip under .dark in global.scss, so no dark: variant is needed.
                paper: token('paper'),
                surface: token('surface'),
                ink: token('ink'),
                body: token('body'),
                muted: token('muted'),
                rule: token('rule'),
                marker: token('marker'),
                'marker-text': token('marker-text'),
                brand: {
                    "primary": "#023452",
                    "secondary": "#f47d20",
                },
                dark: {
                    "background": "#0a161e",
                    "surface": "#0f1e28",
                },
            },
            borderRadius: {
                control: '8px',
                card: '12px',
                photo: '12px',
                chip: '6px',
                marker: '2px',
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
