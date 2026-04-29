export default function Pricing({ tiers }) {
    return (
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tiers.map((tier) => (
                <div
                    key={tier.id}
                    className={`relative flex flex-col rounded-xl border p-6 transition-all duration-200 ${
                        tier.mostPopular
                            ? 'border-accent/40 bg-accent/[0.03] dark:bg-brand-secondary/[0.05] shadow-sm shadow-accent/10'
                            : 'border-gray-200/60 dark:border-gray-700/30 bg-white dark:bg-white/[0.03] hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="text-base font-semibold text-brand-primary dark:text-white">
                            {tier.name}
                        </h3>
                        {tier.mostPopular && (
                            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                                Most frequently selected 
                            </span>
                        )}
                    </div>

                    <p className="mt-2 text-xs leading-relaxed text-brand-grey dark:text-gray-400">
                        {tier.description}
                    </p>

                    <p className="mt-4 flex items-baseline gap-x-1">
                        <span className="text-2xl font-bold tracking-tight text-brand-primary dark:text-white">
                            {tier.price}
                        </span>
                        {tier.period && (
                            <span className="text-sm text-brand-grey dark:text-gray-400">
                                /{tier.period}
                            </span>
                        )}
                    </p>

                    <ul role="list" className="mt-5 flex-1 space-y-2.5">
                        {tier.features.map((feature) => (
                            <li key={feature} className="flex items-start gap-2.5 text-sm text-brand-grey dark:text-gray-300">
                                <svg className="h-4 w-4 shrink-0 mt-0.5 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                                {feature}
                            </li>
                        ))}
                    </ul>

                    <a
                        href="mailto:support@elixir.no"
                        className={`mt-6 block rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                            tier.mostPopular
                                ? 'bg-brand-primary text-white hover:bg-brand-primary/90'
                                : 'border border-gray-200/60 dark:border-gray-700/30 text-brand-primary dark:text-white hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                    >
                        Contact us
                    </a>
                </div>
            ))}
        </div>
    );
}
