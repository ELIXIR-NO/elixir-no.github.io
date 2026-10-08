import { aboutNodes, aboutOverviewHref } from '../data/nav-menu';
import { needsDarkOutline } from '../lib/utils';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

const isActive = (pathname: string, href: string) =>
    pathname === href || pathname.startsWith(href + '/');

const ArrowIcon = () => (
    <ArrowRightIcon className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
);

type Props = {
    pathname: string;
    variant: 'panel' | 'accordion';
    onNavigate?: () => void;
};

export default function NavAboutMenu({ pathname, variant, onNavigate }: Props) {
    const pad = variant === 'panel' ? 'py-2' : 'py-3';
    const rowBase = `group flex items-center gap-3 rounded-r-control border-l-2 px-2.5 ${pad} transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent`;
    const rowState = (active: boolean) =>
        active ? 'border-marker bg-paper' : 'border-transparent hover:bg-paper';

    return (
        <div>
            <p className="px-2.5 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-muted">Our nodes</p>
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
                        <span className={`h-2 w-2 rounded-marker shrink-0 ${needsDarkOutline(node.color) ? 'dark:ring-1 dark:ring-ink/50' : ''}`} style={{ backgroundColor: node.color }} aria-hidden="true" />
                        <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-ink">{node.nodeName}</span>
                            <span className="block truncate text-xs text-muted">{node.universityShort}</span>
                        </span>
                    </a>
                );
            })}
            <div className="mt-1 border-t border-rule pt-1.5">
                <a
                    href={aboutOverviewHref}
                    onClick={onNavigate}
                    aria-current={pathname === aboutOverviewHref ? 'page' : undefined}
                    className={`group flex items-center gap-2 rounded-control px-2.5 ${pad} text-sm font-semibold text-ink transition-colors hover:bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
                >
                    About ELIXIR Norway — overview
                    <ArrowIcon />
                </a>
            </div>
        </div>
    );
}
