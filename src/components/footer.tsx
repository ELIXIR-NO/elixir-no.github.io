import { SiLinkedin, SiYoutube, SiFlickr } from "react-icons/si";
import React from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

const footerLinks = [
    { href: `${BASE}/about`, label: "About" },
    { href: `${BASE}/research-support`, label: "Research Support" },
    { href: `${BASE}/services`, label: "Services" },
    { href: `${BASE}/funding-and-projects`, label: "Funding & Projects" },
    { href: `${BASE}/news`, label: "News" },
    { href: `${BASE}/events`, label: "Events" },
    { href: `${BASE}/training`, label: "Training" },
    { href: `${BASE}/accessibility`, label: "Accessibility" },
];

const socials = [
    { name: "LinkedIn", href: "https://www.linkedin.com/company/elixir-norway", icon: SiLinkedin },
    { name: "YouTube", href: "https://www.youtube.com/channel/UCvwFIw5HomylguGOGxR8B8w", icon: SiYoutube },
    { name: "Flickr", href: "https://www.flickr.com/photos/elixir-europe/", icon: SiFlickr },
];

const partners = [
    { href: "https://uib.no/", src: `${BASE}/assets/logos/orgs/uib.svg`, alt: "University of Bergen" },
    { href: "https://uio.no/", src: `${BASE}/assets/logos/orgs/uio.svg`, alt: "University of Oslo" },
    { href: "https://uit.no/", src: `${BASE}/assets/logos/orgs/uit.svg`, alt: "UiT The Arctic University of Norway" },
    { href: "https://ntnu.no/", src: `${BASE}/assets/logos/orgs/ntnu.svg`, alt: "NTNU" },
    { href: "https://nmbu.no/", src: `${BASE}/assets/logos/orgs/nmbu.svg`, alt: "NMBU" },
];

const funders = [
    { href: "https://forskningsradet.no/", src: `${BASE}/assets/logos/orgs/nfr.svg`, alt: "Research Council of Norway" },
    { href: "https://www.nordforsk.org", src: `${BASE}/assets/logos/orgs/nordforsk.svg`, alt: "NordForsk" },
    { href: "https://research-and-innovation.ec.europa.eu/", src: `${BASE}/assets/logos/orgs/eu.svg`, alt: "Co-funded by the European Union" },
];

const Footer = () => {
    return (
        <footer className="mt-24 border-t border-gray-200 dark:border-gray-800" aria-labelledby="footer-heading">
            <h2 id="footer-heading" className="sr-only">Footer</h2>

            {/* Main footer content */}
            <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">

                    {/* Brand column */}
                    <div className="lg:col-span-4 flex flex-col items-center lg:items-start gap-6">
                        <a href={`${BASE}/`}>
                            <img
                                alt="ELIXIR Norway logo"
                                src={`${BASE}/assets/logos/elixir-no-light.svg`}
                                className="hidden dark:block h-24 w-auto"
                                width="192"
                                height="96"
                            />
                            <img
                                alt="ELIXIR Norway logo"
                                src={`${BASE}/assets/logos/elixir-no-dark.svg`}
                                className="block dark:hidden h-24 w-auto"
                                width="192"
                                height="96"
                            />
                        </a>
                        <p className="text-balance text-sm text-brand-grey dark:text-gray-400 text-center lg:text-left leading-relaxed max-w-xs">
                            ELIXIR Norway is the Norwegian Node of{' '}
                            <a
                                href="https://elixir-europe.org"
                                className="font-bold text-accent hover:underline"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                ELIXIR
                            </a>
                            {' '} the European infrastructure for life science data.
                        </p>
                        <div className="flex gap-3">
                            {socials.map(({ name, href, icon: Icon }) => (
                                <a
                                    key={name}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg text-brand-grey dark:text-gray-400 hover:text-brand-primary dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                    aria-label={name}
                                >
                                    <Icon className="h-5 w-5" aria-hidden="true" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Links column */}
                    <div className="lg:col-span-2">
                        <h3 className="text-sm font-bold text-brand-primary dark:text-white mb-4">Navigation</h3>
                        <ul className="space-y-2">
                            {footerLinks.map(({ href, label }) => (
                                <li key={label}>
                                    <a
                                        href={href}
                                        className="text-sm text-brand-grey dark:text-gray-400 hover:text-brand-primary dark:hover:text-white transition-colors"
                                    >
                                        {label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact column */}
                    <div className="lg:col-span-2">
                        <h3 className="text-sm font-bold text-brand-primary dark:text-white mb-4">Contact</h3>
                        <ul className="space-y-2 text-sm text-brand-grey dark:text-gray-400">
                            <li>
                                <a href="mailto:support@elixir.no" className="hover:text-brand-primary dark:hover:text-white transition-colors">
                                    support@elixir.no
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://elixir-europe.org/about-us/vacancies"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-brand-primary dark:hover:text-white transition-colors"
                                >
                                    Careers at ELIXIR
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Partners column */}
                    <div className="lg:col-span-4">
                        <h3 className="text-sm font-bold text-brand-primary dark:text-white mb-4">Partner institutions</h3>
                        <div className="flex flex-wrap items-center gap-4">
                            {partners.map(({ href, src, alt }) => (
                                <a
                                    key={alt}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="opacity-60 dark:opacity-40 hover:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
                                >
                                    <img
                                        src={src}
                                        alt={alt}
                                        className="h-10 w-auto dark:invert-85"
                                    />
                                </a>
                            ))}
                        </div>
                        <h3 className="text-sm font-bold text-brand-primary dark:text-white mt-6 mb-4">Funded by</h3>
                        <div className="flex flex-wrap items-center gap-4">
                            {funders.map(({ href, src, alt }) => (
                                <a
                                    key={alt}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="opacity-60 dark:opacity-40 hover:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
                                >
                                    <img
                                        src={src}
                                        alt={alt}
                                        className="h-10 w-auto dark:invert-85"
                                    />
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom bar */}
            <div className="border-t border-gray-200 dark:border-gray-800">
                <div className="mx-auto max-w-7xl px-6 py-6 lg:px-8">
                    <p className="text-xs text-center text-gray-500 dark:text-gray-500">
                        Financed by the Research Council of Norway (grants 208481, 270068, 295932, 350529),
                        its partner institutions, NordForsk, and co-funded by the European Union.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
