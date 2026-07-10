import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export type Glider = { left: number; top: number; width: number; height: number };

// useLayoutEffect warns during SSR; nav islands are server-rendered then hydrated.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Tracks a sliding "magic pill" highlight for a horizontal list of items. The
 * pill rests on the active item and follows the hovered one, springing back on
 * mouse-out (hidden when neither applies). Returns the measured rect to render
 * the pill from, a ref registrar to attach to each item, and a hover setter.
 *
 * Usage:
 *   const { glider, registerRef, setHoveredIndex } = useMagicPill(activeIndex);
 *   <div onMouseLeave={() => setHoveredIndex(null)}>
 *     {glider && <motion.span animate={{ ...glider }} />}
 *     {items.map((it, i) => (
 *       <a ref={registerRef(i)} onMouseEnter={() => setHoveredIndex(i)} />
 *     ))}
 *   </div>
 */
export function useMagicPill(activeIndex: number) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [glider, setGlider] = useState<Glider | null>(null);
    const itemRefs = useRef<(HTMLElement | null)[]>([]);

    const targetIndex = hoveredIndex ?? (activeIndex >= 0 ? activeIndex : null);
    // Mirror the target into a ref so the resize/font effects can read the
    // current value without re-subscribing on every hover.
    const targetIndexRef = useRef<number | null>(targetIndex);
    targetIndexRef.current = targetIndex;

    const measure = useCallback((index: number | null) => {
        const el = index == null ? null : itemRefs.current[index];
        if (!el) { setGlider(null); return; }
        setGlider({ left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight });
    }, []);

    useIsomorphicLayoutEffect(() => { measure(targetIndex); }, [targetIndex, measure]);

    useEffect(() => {
        const onResize = () => measure(targetIndexRef.current);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [measure]);

    // Re-measure once web fonts have loaded — item widths shift as the face swaps.
    useEffect(() => {
        if (typeof document === 'undefined' || !('fonts' in document)) return;
        let cancelled = false;
        document.fonts.ready.then(() => { if (!cancelled) measure(targetIndexRef.current); });
        return () => { cancelled = true; };
    }, [measure]);

    const registerRef = useCallback(
        (index: number) => (el: HTMLElement | null) => { itemRefs.current[index] = el; },
        [],
    );

    return { glider, setHoveredIndex, registerRef };
}
