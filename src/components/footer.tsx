import { SiLinkedin, SiYoutube, SiFlickr } from "react-icons/si";
import React from "react";
import { site } from "../lib/site";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

const { navigation, careers, partners, funders, fundingNote } = site.footer;
const { supportEmail } = site.contact;

const socials = [
    { name: "LinkedIn", href: site.footer.socials.linkedin, icon: SiLinkedin },
    { name: "YouTube", href: site.footer.socials.youtube, icon: SiYoutube },
    { name: "Flickr", href: site.footer.socials.flickr, icon: SiFlickr },
];

const Footer = () => {
    return (
        <footer className="mt-24 border-t border-rule bg-surface" aria-labelledby="footer-heading">
            <h2 id="footer-heading" className="sr-only">Footer</h2>

            {/* Main footer content */}
            <div className="mx-auto max-w-7xl px-6 sm:px-8 py-16">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">

                    {/* Brand column */}
                    <div className="lg:col-span-4 flex flex-col items-center lg:items-start gap-6">
                        <a href={`${BASE}/`} className="rounded-control focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
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
                        <p className="text-balance text-sm text-body text-center lg:text-left leading-relaxed max-w-xs">
                            ELIXIR Norway is the Norwegian Node of{' '}
                            <a
                                href="https://elixir-europe.org"
                                className="font-semibold text-ink underline decoration-marker decoration-2 underline-offset-4 rounded-control focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                ELIXIR
                            </a>
                            {' '}&ndash; the European infrastructure for life science data.
                        </p>
                        <div className="flex gap-3">
                            {socials.map(({ name, href, icon: Icon }) => (
                                <a
                                    key={name}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="grid h-10 w-10 place-items-center rounded-control border border-rule text-ink hover:border-ink transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                    aria-label={name}
                                >
                                    <Icon className="h-5 w-5" aria-hidden="true" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Links column */}
                    <div className="lg:col-span-2">
                        <h3 className="text-sm font-semibold text-ink mb-4">Navigation</h3>
                        <ul className="space-y-2">
                            {navigation.map(({ href, label }) => (
                                <li key={label}>
                                    <a
                                        href={href}
                                        className="text-sm text-body hover:text-ink decoration-marker decoration-2 underline-offset-4 hover:underline transition-colors rounded-control focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                    >
                                        {label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact column */}
                    <div className="lg:col-span-2">
                        <h3 className="text-sm font-semibold text-ink mb-4">Contact</h3>
                        <ul className="space-y-2 text-sm text-body">
                            <li>
                                <a href={`mailto:${supportEmail}`} className="hover:text-ink decoration-marker decoration-2 underline-offset-4 hover:underline transition-colors rounded-control focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                                    {supportEmail}
                                </a>
                            </li>
                            <li>
                                <a
                                    href={careers.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-ink decoration-marker decoration-2 underline-offset-4 hover:underline transition-colors rounded-control focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                >
                                    {careers.label}
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Partners column */}
                    <div className="lg:col-span-4">
                        <h3 className="text-sm font-semibold text-ink mb-4">Partner institutions</h3>
                        <div className="flex flex-wrap items-center gap-4">
                            {partners.map(({ name, href, logo }) => (
                                <a
                                    key={name}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="opacity-80 hover:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-control"
                                >
                                    <img
                                        src={logo}
                                        alt={name}
                                        className="h-10 w-auto dark:invert-85"
                                    />
                                </a>
                            ))}
                        </div>
                        <h3 className="text-sm font-semibold text-ink mt-6 mb-4">Funded by</h3>
                        <div className="flex flex-wrap items-center gap-4">
                            {funders.map(({ name, href, logo }) => (
                                <a
                                    key={name}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="opacity-80 hover:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-control"
                                >
                                    <img
                                        src={logo}
                                        alt={name}
                                        className="h-10 w-auto dark:invert-85"
                                    />
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom bar */}
            <div className="border-t border-rule">
                <div className="mx-auto max-w-7xl px-6 sm:px-8 py-6">
                    <p className="text-xs text-center text-balance text-muted">
                        {fundingNote}
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
