import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { organizations } from "../data/organizations";
import { needsDarkOutline } from "../lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

const universities = [
    { name: 'University of Bergen', location: 'Bergen', logo: `${BASE}/assets/logos/orgs/uib.svg`, href: `${BASE}/about/bergen`, color: organizations.bergen.color },
    { name: 'University of Oslo', location: 'Oslo', logo: `${BASE}/assets/logos/orgs/uio.svg`, href: `${BASE}/about/oslo`, color: organizations.oslo.color },
    { name: 'UiT The Arctic University of Norway', location: 'Troms\u00f8', logo: `${BASE}/assets/logos/orgs/uit.svg`, href: `${BASE}/about/tromso`, color: organizations.tromso.color },
    { name: 'Norwegian University of Life Sciences', location: '\u00c5s', logo: `${BASE}/assets/logos/orgs/nmbu.svg`, href: `${BASE}/about/aas`, color: organizations.aas.color },
    { name: 'Norwegian University of Science and Technology', location: 'Trondheim', logo: `${BASE}/assets/logos/orgs/ntnu.svg`, href: `${BASE}/about/trondheim`, color: organizations.trondheim.color },
];

const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.1 } },
};

const item = {
    hidden: { y: 20 },
    show: { y: 0 },
};

export default function Universities() {
    const shouldReduceMotion = useReducedMotion();

    return (
        <motion.div
            className="flex flex-wrap items-center justify-start lg:justify-between gap-x-12 gap-y-10 sm:gap-x-16 lg:gap-x-20"
            variants={shouldReduceMotion ? undefined : container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-40px' }}
        >
            {universities.map((uni) => (
                <motion.a
                    key={uni.location}
                    href={uni.href}
                    variants={shouldReduceMotion ? undefined : item}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="group flex flex-col items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 rounded-control"
                >
                    <img
                        src={uni.logo}
                        alt={`${uni.name} logo`}
                        className="h-20 sm:h-24 w-auto object-contain opacity-80 dark:invert-85 transition-opacity duration-200 group-hover:opacity-100"
                        loading="lazy"
                    />
                    <span className="relative text-sm font-semibold text-muted transition-colors duration-200 group-hover:text-ink pb-1">
                        {uni.location}
                        <span
                            className={`absolute bottom-0 left-0 right-0 h-0.5 scale-x-0 transition-transform duration-200 origin-left group-hover:scale-x-100 ${needsDarkOutline(uni.color) ? 'dark:ring-1 dark:ring-ink/50' : ''}`}
                            style={{ backgroundColor: uni.color }}
                            aria-hidden="true"
                        />
                    </span>
                </motion.a>
            ))}
        </motion.div>
    );
}
