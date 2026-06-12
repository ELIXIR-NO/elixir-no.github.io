import { aboutNodes, aboutOverviewHref } from '../data/nav-menu';

const isActive = (pathname: string, href: string) =>
    pathname === href || pathname.startsWith(href + '/');

const ArrowIcon = () => (
    <svg className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
);

type Props = {
    pathname: string;
    variant: 'panel' | 'accordion';
    onNavigate?: () => void;
};

export default function NavAboutMenu({ pathname, variant, onNavigate }: Props) {
    const pad = variant === 'panel' ? 'py-2' : 'py-3';
    const rowBase = `group flex items-center gap-3 rounded-xl px-2.5 ${pad} transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent`;
    const rowState = (active: boolean) =>
        active ? 'bg-accent/10' : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]';

    return (
        <div>
            <p className="px-2.5 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Our nodes</p>
            {aboutNodes.map((node) => {
                const active = isActive(pathname, node.href);
                return (
                    <a
                        key={node.href}
                        href={node.href}
                        onClick={onNavigate}
                        aria-current={active ? 'page' : undefined}
                        className={`${rowBase} ${rowState(active)}`}
                    >
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: node.color }} aria-hidden="true" />
                        <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-accent">{node.nodeName}</span>
                            <span className="block truncate text-xs text-gray-600 dark:text-gray-400">{node.universityShort}</span>
                        </span>
                    </a>
                );
            })}
            <div className="mt-1 border-t border-gray-200/70 pt-1.5 dark:border-gray-700/40">
                <a
                    href={aboutOverviewHref}
                    onClick={onNavigate}
                    aria-current={pathname === aboutOverviewHref ? 'page' : undefined}
                    className={`group flex items-center gap-2 rounded-xl px-2.5 ${pad} text-sm font-semibold text-accent transition-colors hover:bg-accent/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
                >
                    About ELIXIR Norway — overview
                    <ArrowIcon />
                </a>
            </div>
        </div>
    );
}
