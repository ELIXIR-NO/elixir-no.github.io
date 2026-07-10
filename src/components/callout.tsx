import React from 'react';
import {
    CheckCircleIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    XCircleIcon,
} from '@heroicons/react/24/outline';

const variants = {
    info: {
        border: 'border-blue-400 dark:border-blue-500',
        bg: 'bg-blue-50/50 dark:bg-blue-900/10',
        title: 'text-blue-900 dark:text-blue-200',
        text: 'text-blue-800 dark:text-blue-300',
        icon: (
            <InformationCircleIcon className="h-5 w-5 text-blue-500 dark:text-blue-400" aria-hidden="true" />
        ),
    },
    success: {
        border: 'border-green-400 dark:border-green-500',
        bg: 'bg-green-50/50 dark:bg-green-900/10',
        title: 'text-green-900 dark:text-green-200',
        text: 'text-green-800 dark:text-green-300',
        icon: (
            <CheckCircleIcon className="h-5 w-5 text-green-500 dark:text-green-400" aria-hidden="true" />
        ),
    },
    warn: {
        border: 'border-yellow-400 dark:border-yellow-500',
        bg: 'bg-yellow-50/50 dark:bg-yellow-900/10',
        title: 'text-yellow-900 dark:text-yellow-200',
        text: 'text-yellow-800 dark:text-yellow-300',
        icon: (
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 dark:text-yellow-400" aria-hidden="true" />
        ),
    },
    danger: {
        border: 'border-red-400 dark:border-red-500',
        bg: 'bg-red-50/50 dark:bg-red-900/10',
        title: 'text-red-900 dark:text-red-200',
        text: 'text-red-800 dark:text-red-300',
        icon: (
            <XCircleIcon className="h-5 w-5 text-red-500 dark:text-red-400" aria-hidden="true" />
        ),
    },
};

const Callout = ({ variant = 'info', title, children }) => {
    const v = variants[variant] || variants.info;

    return (
        <div className={`my-6 rounded-lg border-l-4 ${v.border} ${v.bg} px-5 py-4`}>
            <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">{v.icon}</div>
                <div className="min-w-0">
                    {title && <p className={`text-base font-semibold ${v.title}`}>{title}</p>}
                    <div className={`mt-1 text-base leading-relaxed ${v.text} [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-2 [&_p]:text-base [&_p:first-child]:mt-0`}>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Callout;
