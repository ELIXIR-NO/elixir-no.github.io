import {test} from 'node:test';
import assert from 'node:assert/strict';
import {writeCaptions, fallbackText, properNounsOk} from './caption-agent.mjs';

const newSlide = (id, title, summary) => ({
    src: `/data/slides/2026-${id}.png`, alt: null, caption: null,
    sourceArticle: `news/2026/${id}`,
    _candidate: {id: `news/2026/${id}`, title, summary},
});

test('falls back to summary/title when the agent returns nothing', async () => {
    const s = [newSlide('x', 'GDI go-live', 'ELIXIR Norway deploys GDI infrastructure.')];
    const out = await writeCaptions(s, {runAgent: async () => ''});
    assert.equal(out[0].alt, 'GDI go-live');
    assert.equal(out[0].caption, 'ELIXIR Norway deploys GDI infrastructure.');
});

test('uses valid agent text', async () => {
    const s = [newSlide('x', 'GDI go-live', 'ELIXIR Norway deploys GDI infrastructure.')];
    const agent = async () => JSON.stringify([{id: 'news/2026/x', alt: 'A network diagram', caption: 'ELIXIR Norway deploys GDI infrastructure across Europe.'}]);
    const out = await writeCaptions(s, {runAgent: agent});
    assert.equal(out[0].alt, 'A network diagram');
});

test('rejects hallucinated proper nouns', () => {
    assert.equal(properNounsOk('Written by Jane Doe', {title: 'GDI', summary: 'about gdi'}), false);
    assert.equal(properNounsOk('About the GDI project', {title: 'GDI project', summary: 'the GDI project'}), true);
});
