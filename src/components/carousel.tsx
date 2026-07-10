import React, { useEffect, useRef, useState } from 'react';
import { Transition } from '@headlessui/react';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

const Carousel = ({ images, autoSlideInterval = 3000 }) => {

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isZoomed, setIsZoomed] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const autoSlideTimeout = useRef(null);

    const nextSlide = () => setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    const prevSlide = () => setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);

    const handleImageClick = () => setIsZoomed(true);
    const closeZoom = () => setIsZoomed(false);

    const handleZoomAreaClick = (e) => {
        if (e.target === e.currentTarget) closeZoom();
    };

    // Auto slide (pausable)
    useEffect(() => {
        if (!isPaused) {
            autoSlideTimeout.current = setTimeout(nextSlide, autoSlideInterval);
        }
        return () => clearTimeout(autoSlideTimeout.current);
    }, [currentIndex, autoSlideInterval, isPaused]);

    const handleMouseDown = (e) => {
        const startX = e.pageX;
        const handleMouseUp = (upEvent) => {
            const endX = upEvent.pageX;
            if (startX > endX + 50) nextSlide();
            else if (startX < endX - 50) prevSlide();
            window.removeEventListener('mouseup', handleMouseUp);
        };
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleTouchStart = (e) => {
        const startX = e.touches[0].clientX;
        const handleTouchEnd = (endEvent) => {
            const endX = endEvent.changedTouches[0].clientX;
            if (startX > endX + 50) nextSlide();
            else if (startX < endX - 50) prevSlide();
            window.removeEventListener('touchend', handleTouchEnd);
        };
        window.addEventListener('touchend', handleTouchEnd);
    };

    return (
        <div
            className="relative w-full max-w-5xl mx-auto group"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}>
            <div className="overflow-hidden rounded-lg shadow-lg relative">
                <div className="relative h-80 sm:h-80 md:h-96">
                    {images.map((image, index) => (
                        <Transition
                            key={index}
                            show={index === currentIndex}
                            enter="transition-opacity duration-500"
                            enterFrom="opacity-0"
                            enterTo="opacity-100"
                            leave="transition-opacity duration-500"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                            as="div"
                            className="absolute inset-0 w-full h-full"
                        >
                            <img
                                src={`${BASE}${image.src}`}
                                alt={image.alt}
                                className="w-full h-full object-cover cursor-pointer aspect-auto"
                                onClick={handleImageClick}
                            />
                            {image.caption && (
                                <div className="absolute bottom-0 left-0 w-full bg-black bg-opacity-75 text-white text-sm p-2">
                                    {image.caption}
                                </div>
                            )}
                        </Transition>
                    ))}
                </div>
            </div>

            {/* Navigation arrows */}
            <div className="absolute inset-0 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={prevSlide}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white dark:bg-black bg-opacity-50 group-hover:bg-opacity-75 rounded-full p-2"
                    aria-label="Previous slide"
                >
                    <ChevronLeftIcon className="h-6 w-6" aria-hidden="true"/>
                </button>
                <button
                    onClick={nextSlide}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white dark:bg-black bg-opacity-50 group-hover:bg-opacity-75 rounded-full p-2"
                    aria-label="Next slide"
                >
                    <ChevronRightIcon className="h-6 w-6" aria-hidden="true"/>
                </button>
            </div>

            {/* Pagination dots */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 group-hover:opacity-100 transition-opacity opacity-20">
                {images.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        aria-label={`Go to slide ${index + 1} of ${images.length}`}
                        aria-current={index === currentIndex ? 'true' : undefined}
                        className={`w-3 h-3 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                            index === currentIndex ? 'bg-brand-primary' : 'bg-gray-300'
                        }`}
                    />
                ))}
            </div>

            <button
                onClick={() => setIsPaused(!isPaused)}
                className="absolute top-4 right-4 bg-black bg-opacity-50 text-white text-sm px-3 py-1 rounded-full hover:bg-opacity-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label={isPaused ? 'Resume auto-play' : 'Pause auto-play'}
            >
                {isPaused ? '▶ Play' : '⏸ Pause'}
            </button>

            {/* Zoomed view */}
            {isZoomed && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
                    onClick={handleZoomAreaClick}
                >
                    <div className="relative max-w-screen-xl max-h-screen-90 overflow-hidden">
                        <img
                            src={`${BASE}${images[currentIndex].src}`}
                            alt={images[currentIndex].alt}
                            className="max-w-full max-h-full object-contain"
                        />
                        <button
                            onClick={closeZoom}
                            className="absolute top-4 right-4 text-white hover:text-gray-300 focus:outline-none"
                            aria-label="Close fullscreen view"
                        >
                            <XMarkIcon className="h-8 w-8" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Carousel;
