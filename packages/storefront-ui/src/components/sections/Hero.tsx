import React from 'react';
import { SectionWrapper } from '../shared/SectionWrapper';
import { Button } from '../shared/Button';

export interface HeroProps {
  headline: string;
  subtitle?: string;
  primaryCtaText?: string;
  primaryCtaHref?: string;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
  logos?: Array<{ src: string; alt: string }>;
}

export function Hero({
  headline,
  subtitle,
  primaryCtaText,
  primaryCtaHref,
  secondaryCtaText,
  secondaryCtaHref,
  logos,
}: HeroProps) {
  return (
    <SectionWrapper className="relative overflow-hidden pt-24 pb-32" background="transparent">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] opacity-50 pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
          <span className="block text-foreground">{headline.split('|')[0]}</span>
          {headline.includes('|') && (
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              {headline.split('|')[1]}
            </span>
          )}
        </h1>
        
        {subtitle && (
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        )}
        
        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          {primaryCtaText && (
            <Button size="lg" className="h-14 px-8 text-lg rounded-full" asChild>
              <a href={primaryCtaHref}>{primaryCtaText}</a>
            </Button>
          )}
          {secondaryCtaText && (
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full" asChild>
              <a href={secondaryCtaHref}>{secondaryCtaText}</a>
            </Button>
          )}
        </div>
        
        {logos && logos.length > 0 && (
          <div className="pt-8 border-t border-border/50 w-full flex flex-col items-center">
            <p className="text-sm text-muted-foreground mb-6 uppercase tracking-widest font-semibold">
              Powered by
            </p>
            <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-70 grayscale hover:grayscale-0 transition-all duration-300">
              {logos.map((logo, idx) => (
                <img key={idx} src={logo.src} alt={logo.alt} className="h-8 md:h-10 w-auto" />
              ))}
            </div>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
