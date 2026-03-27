import React from 'react';

export default function BranchPill({ branch }: { branch: string }) {
    return (
        <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-mono bg-white/[0.05] px-2 py-0.5 rounded-full">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
            </svg>
            {branch}
        </span>
    );
}
