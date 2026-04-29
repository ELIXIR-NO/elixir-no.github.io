import { useEffect, useRef, useState } from 'react';

interface Props {
    url: string;
    title: string;
    summary?: string;
}

export default function ShareButtons({ url, title, summary = '' }: Props) {
    const [copied, setCopied] = useState(false);
    const resetTimer = useRef<number | null>(null);

    const flagCopied = () => {
        setCopied(true);
        if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
        resetTimer.current = window.setTimeout(() => {
            setCopied(false);
            resetTimer.current = null;
        }, 2000);
    };

    useEffect(() => () => {
        if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    }, []);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            flagCopied();
            return;
        } catch { /* fall through to legacy copy */ }

        const ta = document.createElement('textarea');
        ta.value = url;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            if (document.execCommand('copy')) flagCopied();
        } catch { /* no-op */ }
        document.body.removeChild(ta);
    };

    const enc = encodeURIComponent;
    const links = {
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
        x: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`,
        bluesky: `https://bsky.app/intent/compose?text=${enc(`${title} ${url}`)}`,
        email: `mailto:?subject=${enc(title)}&body=${enc(`${summary ? summary + '\n\n' : ''}${url}`)}`,
    };

    const btn =
        'inline-flex items-center justify-center h-11 w-11 rounded-lg ' +
        'border border-gray-200 dark:border-gray-700 ' +
        'text-gray-600 dark:text-gray-400 ' +
        'hover:text-accent hover:border-accent/40 ' +
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ' +
        'focus-visible:ring-offset-white dark:focus-visible:ring-offset-dark-background ' +
        'transition-colors';

    return (
        <div className="not-prose mt-12 pt-6 border-t border-gray-200 dark:border-gray-800">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Share
                </span>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleCopy}
                        aria-label={copied ? 'Link copied' : 'Copy link'}
                        className={btn}
                    >
                        {copied ? (
                            <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                        ) : (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                            </svg>
                        )}
                    </button>
                    <a
                        href={links.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Share on LinkedIn"
                        className={btn}
                    >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M20.452 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.137 1.446-2.137 2.94v5.666H9.355V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.6 0 4.268 2.37 4.268 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.114 20.452H3.557V9h3.557v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        </svg>
                    </a>
                    <a
                        href={links.x}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Share on X"
                        className={btn}
                    >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                    </a>
                    <a
                        href={links.bluesky}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Share on Bluesky"
                        className={btn}
                    >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M5.92 3.45c3.13 2.35 6.5 7.12 7.74 9.68 1.24-2.56 4.61-7.33 7.74-9.68 2.26-1.7 5.92-3.01 5.92 1.16 0 .83-.48 6.99-.76 8-.97 3.5-4.55 4.4-7.73 3.86 5.56.95 6.98 4.08 3.93 7.22-5.79 5.95-8.32-1.49-8.97-3.4l-.13-.4-.13.4c-.65 1.91-3.18 9.35-8.97 3.4-3.05-3.14-1.63-6.27 3.93-7.22-3.18.54-6.76-.36-7.73-3.86-.28-1.01-.76-7.17-.76-8C0 .44 3.66 1.75 5.92 3.45z" />
                        </svg>
                    </a>
                    <a
                        href={links.email}
                        aria-label="Share via email"
                        className={btn}
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                        </svg>
                    </a>
                </div>
                <span
                    role="status"
                    aria-live="polite"
                    className={`text-xs text-accent transition-opacity ${copied ? 'opacity-100' : 'opacity-0'}`}
                >
                    {copied ? 'Link copied to clipboard' : ''}
                </span>
            </div>
        </div>
    );
}
