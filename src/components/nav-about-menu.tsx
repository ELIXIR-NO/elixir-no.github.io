import { aboutNodes, aboutSections, aboutOverviewHref, type SectionIcon } from '../data/nav-menu';

const isActive = (pathname: string, href: string) =>
    pathname === href || pathname.startsWith(href + '/');

const SectionGlyph = ({ icon }: { icon: SectionIcon }) => {
    const cls = 'h-[15px] w-[15px]';
    switch (icon) {
        case 'people':
            return (
                <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                    <circle cx="9" cy="8" r="3" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 20a6 6 0 0 1 12 0M16 7a3 3 0 0 1 0 6M15 20a6 6 0 0 1 6-3" />
                </svg>
            );
        case 'cases':
            return (
                <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 8h6M9 12h6M9 16h6M5 4h14v16H5z" />
                </svg>
            );
        case 'impact':
            return (
                <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M6 21V9l6-4 6 4v12M10 13h4" />
                </svg>
            );
        case 'publications':
            return (
                <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16M4 12h16M4 19h10" />
                </svg>
            );
        default:
            return null;
    }
};

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
    const panel = variant === 'panel';
    const rowBase = `group flex items-center gap-3 rounded-xl px-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${panel ? 'py-2' : 'py-3'}`;
    const headCls = 'px-2.5 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400';
    const rowState = (active: boolean) =>
        active ? 'bg-accent/10' : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]';

    const nodes = (
        <div>
            <p className={headCls}>Our nodes</p>
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
        </div>
    );

    const sections = (
        <div>
            <p className={headCls}>Explore</p>
            {aboutSections.map((section) => {
                const active = isActive(pathname, section.href);
                return (
                    <a
                        key={section.href}
                        href={section.href}
                        onClick={onNavigate}
                        aria-current={active ? 'page' : undefined}
                        className={`${rowBase} ${rowState(active)}`}
                    >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent" aria-hidden="true">
                            <SectionGlyph icon={section.icon} />
                        </span>
                        <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-accent">{section.name}</span>
                            <span className="block truncate text-xs text-gray-600 dark:text-gray-400">{section.desc}</span>
                        </span>
                    </a>
                );
            })}
        </div>
    );

    return (
        <div>
            <div className={panel ? 'grid grid-cols-2 gap-2' : 'space-y-1'}>
                {nodes}
                {sections}
            </div>
            <div className="mt-1 border-t border-gray-200/70 pt-1.5 dark:border-gray-700/40">
                <a
                    href={aboutOverviewHref}
                    onClick={onNavigate}
                    aria-current={pathname === aboutOverviewHref ? 'page' : undefined}
                    className={`group flex items-center gap-2 rounded-xl px-2.5 ${panel ? 'py-2' : 'py-3'} text-sm font-semibold text-accent transition-colors hover:bg-accent/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
                >
                    About ELIXIR Norway — overview
                    <ArrowIcon />
                </a>
            </div>
        </div>
    );
}
