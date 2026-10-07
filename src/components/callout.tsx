import React from 'react';

const variants = {
    info: 'bg-blue-600 dark:bg-blue-400',
    success: 'bg-green-600 dark:bg-green-400',
    warn: 'bg-marker',
    danger: 'bg-red-600 dark:bg-red-400',
};

const Callout = ({ variant = 'info', title, children }) => {
    const square = variants[variant] || variants.info;

    return (
        <div className="my-6 rounded-card border border-rule bg-surface px-5 py-4">
            <div className="flex items-start gap-3">
                <span className={`mt-2 h-2 w-2 shrink-0 ${square}`} aria-hidden="true" />
                <div className="min-w-0">
                    {title && <p className="text-base font-semibold text-ink">{title}</p>}
                    <div className={`mt-1 text-base leading-relaxed text-body [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-2 [&_p]:text-base [&_p:first-child]:mt-0`}>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Callout;
