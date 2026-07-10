import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
    ArrowRightIcon,
    LifebuoyIcon,
    Squares2X2Icon,
    ServerStackIcon,
    ShieldCheckIcon,
} from '@heroicons/react/24/outline';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

interface Service {
    title: string;
    description: React.ReactNode;
    icon: React.ReactNode;
    color: string;
    href: string;
}

const services: Service[] = [
    {
        title: 'Research Support',
        description: 'Short and long-term support with bioinformatics analyses, programming and data management tasks.',
        icon: <LifebuoyIcon className="w-5 h-5" aria-hidden="true" />,
        color: '#3b82f6',
        href: `${BASE}/research-support`,
    },
    {
        title: 'Services',
        description: 'Analysis and management of life science data within marine, health, genomics, proteomics and more.',
        icon: <Squares2X2Icon className="w-5 h-5" aria-hidden="true" />,
        color: '#f47d20',
        href: `${BASE}/services`,
    },
    {
        title: 'e-Infrastructure',
        description: <><a href="https://nels.elixir.no" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-brand-primary dark:hover:text-white transition-colors">NeLS</a>, the Norwegian e-Infrastructure for Life Sciences, for analysis, sharing, management and storage of life science data.</>,
        icon: <ServerStackIcon className="w-5 h-5" aria-hidden="true" />,
        color: '#10b981',
        href: `${BASE}/e-infrastructure`,
    },
    {
        title: 'Sensitive Data',
        description: <>Archiving solutions for potentially identifiable human data with support on <a href="https://www.uio.no/english/services/it/research/sensitive-data/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-brand-primary dark:hover:text-white transition-colors">TSD</a>, <a href="https://www.ntnu.edu/mh/huntcloud" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-brand-primary dark:hover:text-white transition-colors">HUNT Cloud</a> and <a href="https://www.uib.no/en/safe" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-brand-primary dark:hover:text-white transition-colors">SAFE</a>.</>,
        icon: <ShieldCheckIcon className="w-5 h-5" aria-hidden="true" />,
        color: '#8b5cf6',
        href: `${BASE}/sensitive-data`,
    },
];

const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const item = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0 },
};

export default function ServicesOverview() {
    const shouldReduceMotion = useReducedMotion();

    return (
        <section className="py-20 lg:py-28">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16 items-start">
                    {/* Left — heading */}
                    <motion.div
                        className="lg:col-span-2 lg:sticky lg:top-32"
                        initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-60px' }}
                        transition={{ duration: 0.5 }}
                    >
                        <h2 className="text-3xl font-bold tracking-tight text-brand-primary dark:text-white sm:text-4xl">
                            Unlock the Power of Your Data
                        </h2>
                        <p className="mt-4 text-lg text-brand-grey dark:text-gray-300 leading-relaxed">
                            From comprehensive data management and analysis to secure storage and specialised support — everything you need to propel your life science research forward.
                        </p>
                        <a
                            href={`${BASE}/services`}
                            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                            Explore all services
                            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                        </a>
                    </motion.div>

                    {/* Right — cards */}
                    <motion.div
                        className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-5"
                        variants={shouldReduceMotion ? undefined : container}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, margin: '-60px' }}
                    >
                        {services.map((svc) => (
                            <motion.a
                                key={svc.title}
                                href={svc.href}
                                variants={shouldReduceMotion ? undefined : item}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                                className="group relative px-5 py-5 rounded-xl border border-gray-100 dark:border-gray-800 bg-transparent transition-[border-color,box-shadow,background-color] duration-200 hover:bg-white hover:border-gray-200/80 dark:hover:bg-dark-surface dark:hover:border-gray-700/50 hover:shadow-[0_0_0_3px_rgb(var(--color-accent)/0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                            >
                                <div
                                    className="w-9 h-9 rounded-lg flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                                    style={{ backgroundColor: `${svc.color}12` }}
                                >
                                    <span style={{ color: svc.color }}>{svc.icon}</span>
                                </div>
                                <h3 className="text-base font-semibold text-brand-primary dark:text-white mb-2">
                                    {svc.title}
                                </h3>
                                <p className="text-sm leading-relaxed text-brand-grey dark:text-gray-400">
                                    {svc.description}
                                </p>
                                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 transition-colors group-hover:text-accent">
                                    Learn more
                                    <ArrowRightIcon className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                                </span>
                            </motion.a>
                        ))}
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
