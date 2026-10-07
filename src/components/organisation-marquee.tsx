import React from 'react';
import Universities from './universities';

export default function OrganisationMarquee() {
    return (
        <section className="py-16 lg:py-20">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="text-center mb-14">
                    <h2 className="text-3xl font-bold tracking-tight text-brand-primary dark:text-white sm:text-4xl">
                        Five Organisations Across Norway
                    </h2>
                    <p className="mt-3 text-lg text-brand-grey dark:text-gray-300 max-w-2xl mx-auto">
                        A collaboration between five leading institutions, combining expertise to advance
                        life science research and innovation.
                    </p>
                </div>
                <Universities />
            </div>
        </section>
    );
}
