import fs from 'node:fs';
import {collect} from './collect-candidates.mjs';
import {selectSlides} from './select.mjs';
import {writeCaptions} from './caption-agent.mjs';
import {apply} from './apply-slides.mjs';
import {validateSlides, diffScopeViolations} from './validate-slides.mjs';

function setOutput(result) {
    const out = process.env.GITHUB_OUTPUT;
    if (out) fs.appendFileSync(out, `result=${result}\n`);
    console.log(`result=${result}`);
}

export async function refresh({diffScope = false} = {}) {
    const {current, candidates} = collect(new Date());
    const {slides, changed, blocked, budget} = selectSlides({current, candidates});
    if (blocked) {
        console.error(`Cannot refresh: ${blocked}.`);
        return 1;
    }
    if (budget === 0) console.warn('Every slot is pinned; the bot has nothing to rotate.');
    if (!changed) {
        console.log('No slide changes needed.');
        setOutput('noop');
        return 0;
    }

    await writeCaptions(slides);
    const {deleted, slides: applied} = apply(slides);

    const violations = validateSlides(applied);
    if (diffScope) violations.push(...diffScopeViolations());
    if (violations.length) {
        console.error('Validation failed after apply:\n' + violations.map(m => '  - ' + m).join('\n'));
        return 1;
    }

    console.log(`Applied ${applied.length} slides; deleted ${deleted.length} stale file(s).`);
    setOutput('changed');
    return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    refresh({diffScope: process.argv.includes('--diff-scope')})
        .then(code => process.exit(code))
        .catch(e => {console.error(e); process.exit(1);});
}
