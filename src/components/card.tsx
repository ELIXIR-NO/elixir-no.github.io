import type { ReactNode } from "react";

export type CardTypeProps = {
    title: string;
    icon?: any;
    children?: ReactNode;
    margin?: boolean;
    className?: string;
}

export default function Card({ title, icon: Icon, children, margin = true, className = "" }: CardTypeProps) {
    return (
        <div className={`${margin ? "my-8" : ''} rounded-xl border border-rule bg-surface ${className}`}>
            <div className="px-5 py-4 border-b border-rule flex gap-x-3 items-center">
                {Icon && <Icon className="w-5 h-5 text-accent shrink-0"/>}
                <h3 className="font-semibold text-lg text-ink">{title}</h3>
            </div>
            <div className="px-5 py-4 text-sm leading-relaxed text-body [&_p]:text-sm [&_p]:leading-relaxed [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
                {children}
            </div>
        </div>
    )
}
