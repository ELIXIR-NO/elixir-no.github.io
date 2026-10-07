import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

type Variant = 'primary' | 'link';
type Size = 'md' | 'sm';

type OwnProps = {
    variant?: Variant;
    size?: Size;
    /** Primary shows an orange chip with an arrow, link a trailing arrow. */
    arrow?: boolean;
    /** Opens in a new tab; the global a[target=_blank] rule adds the screen-reader hint. */
    external?: boolean;
    /** Layout only (margins, width, alignment); the look comes from the variant. */
    className?: string;
    children: ReactNode;
};

type AnchorProps = OwnProps & { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof OwnProps | 'href'>;
type NativeButtonProps = OwnProps & { href?: undefined } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof OwnProps>;
export type ButtonProps = AnchorProps | NativeButtonProps;

const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ');

const FOCUS = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper';
const DISABLED = 'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50';

const VARIANTS: Record<Variant, Record<Size, string>> = {
    primary: {
        md: 'h-12 gap-3 pl-[22px] text-[15px]',
        sm: 'h-10 gap-2.5 pl-4 text-sm',
    },
    link: {
        md: 'h-12 gap-1.5 text-[15px]',
        sm: 'gap-1.5 py-1 text-sm',
    },
};

function classesFor(variant: Variant, size: Size, arrow: boolean, className?: string) {
    const shape = variant === 'primary'
        ? cx(
            'rounded-full bg-ink text-paper transition-[filter] duration-200 ease-out hover:brightness-90',
            arrow ? (size === 'md' ? 'pr-2.5' : 'pr-2') : (size === 'md' ? 'pr-[22px]' : 'pr-4'),
        )
        : 'rounded-control px-1 text-ink';
    return cx('group inline-flex items-center font-semibold', VARIANTS[variant][size], shape, FOCUS, DISABLED, className);
}

function Content({ variant, size, arrow, children }: Required<Pick<OwnProps, 'variant' | 'size' | 'arrow'>> & { children: ReactNode }) {
    if (variant === 'primary') {
        return (
            <>
                {children}
                {arrow && (
                    <span className={cx('grid shrink-0 place-items-center rounded-full bg-marker text-brand-primary', size === 'md' ? 'h-7 w-7' : 'h-6 w-6')} aria-hidden="true">
                        <ArrowRightIcon className="h-3.5 w-3.5 -rotate-45 stroke-2 transition-transform duration-200 ease-out group-hover:rotate-0 motion-reduce:rotate-0 motion-reduce:transition-none" />
                    </span>
                )}
            </>
        );
    }
    return (
        <>
            <span className="relative">
                {children}
                <span className="absolute inset-x-0 -bottom-1.5 h-0.5 origin-left scale-x-0 rounded-marker bg-marker transition-transform duration-200 ease-out group-hover:scale-x-100 motion-reduce:transition-none" aria-hidden="true" />
            </span>
            {arrow && (
                <ArrowRightIcon className={cx('shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none', size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5')} aria-hidden="true" />
            )}
        </>
    );
}

/** The site's call-to-action: an ink pill with an orange arrow chip (primary) or an underlined text link (link). */
export default function Button(props: ButtonProps) {
    const { variant = 'primary', size = 'md', arrow = true, external = false, className, children, ...rest } = props;
    const classes = classesFor(variant, size, arrow, className);
    const content = <Content variant={variant} size={size} arrow={arrow}>{children}</Content>;

    if (rest.href !== undefined) {
        const anchorRest = rest as Omit<AnchorProps, keyof OwnProps>;
        return (
            <a {...anchorRest} className={classes} {...(external && { target: '_blank', rel: 'noopener noreferrer' })}>
                {content}
            </a>
        );
    }

    const { type = 'button', ...buttonRest } = rest as Omit<NativeButtonProps, keyof OwnProps>;
    return (
        <button {...buttonRest} type={type} className={classes}>
            {content}
        </button>
    );
}
