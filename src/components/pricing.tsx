import { CheckIcon } from '@heroicons/react/24/outline';
import Button from './button';

export default function Pricing({ tiers }) {
    return (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tiers.map((tier) => (
                <div
                    key={tier.id}
                    className={`relative flex flex-col rounded-card border bg-surface p-5 ${
                        tier.mostPopular
                            ? 'border-ink'
                            : 'border-rule'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="text-base font-semibold text-ink">
                            {tier.name}
                        </h3>
                        {tier.mostPopular && (
                            <span className="inline-flex items-center gap-1.5 rounded-chip border border-rule px-2 py-0.5 text-xs font-medium text-ink">
                                <span className="h-1.5 w-1.5 rounded-marker bg-marker" aria-hidden="true" />
                                Most frequently selected 
                            </span>
                        )}
                    </div>

                    <p className="mt-2 text-xs leading-relaxed text-body">
                        {tier.description}
                    </p>

                    <p className="mt-4 flex items-baseline gap-x-1">
                        <span className="text-2xl font-semibold tracking-tight text-ink">
                            {tier.price}
                        </span>
                        {tier.period && (
                            <span className="text-sm text-body">
                                /{tier.period}
                            </span>
                        )}
                    </p>

                    <ul role="list" className="mt-5 flex-1 space-y-2.5">
                        {tier.features.map((feature) => (
                            <li key={feature} className="flex items-start gap-2.5 text-sm text-body">
                                <CheckIcon className="h-4 w-4 shrink-0 mt-0.5 text-accent" aria-hidden="true" />
                                {feature}
                            </li>
                        ))}
                    </ul>

                    <Button
                        href="mailto:support@elixir.no"
                        variant={tier.mostPopular ? 'primary' : 'link'}
                        size="sm"
                        className="mt-6 self-center"
                    >
                        Contact us
                    </Button>
                </div>
            ))}
        </div>
    );
}
