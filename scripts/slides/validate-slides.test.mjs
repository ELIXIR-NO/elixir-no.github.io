import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateSlides} from './validate-slides.mjs';
import {SLIDES_DIR} from './constants.mjs';

const ok = {src: '/data/slides/nels.png', alt: 'NeLS landing page', caption: 'The Norwegian e-Infrastructure for Life Sciences.', evergreen: true};

test('flags empty slide set', () => {
    const v = validateSlides([], {slidesDir: SLIDES_DIR});
    assert.ok(v.some(m => /count/i.test(m)));
});

test('flags a bad src and a too-long caption', () => {
    const v = validateSlides([
        {src: '/data/slides/BAD NAME.png', alt: 'a', caption: 'c', evergreen: true},
        {...ok, caption: 'x'.repeat(400)},
    ], {slidesDir: SLIDES_DIR});
    assert.ok(v.some(m => /src/i.test(m)));
    assert.ok(v.some(m => /caption/i.test(m)));
});

test('accepts a valid evergreen slide backed by a real image', () => {
    const v = validateSlides([ok], {slidesDir: SLIDES_DIR});
    assert.deepEqual(v, []);
});
