import React from 'react';
import { SectionWrapper } from '../shared/SectionWrapper';
import { Button } from '../shared/Button';

export interface CTAProps {
  title: string;
  description?: string;
  primaryCtaText: string;
  primaryCtaHref: string;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
}

export function CTA({
  title,
  description,
  primaryCtaText,
  primaryCtaHref,
  secondaryCtaText,
  secondaryCtaHref,
}: CTAProps) {
  return (
    <SectionWrapper id="cta" background="transparent">
      <div className="relative overflow-hidden rounded-3xl bg-card border border-border p-8 md:p-16 lg:p-24 text-center">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 opacity-50" />
        
        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-foreground">{title}</h2>
          {description && (
            <p className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed">
              {description}
            </p>
          )}
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" className="h-12 px-8 text-base rounded-full" asChild>
              <a 
                href={primaryCtaHref}
                target={primaryCtaHref?.startsWith('http') ? '_blank' : undefined}
                rel={primaryCtaHref?.startsWith('http') ? 'noopener noreferrer' : undefined}
              >{primaryCtaText}</a>
            </Button>
            {secondaryCtaText && (
              <Button size="lg" variant="outline" className="h-12 px-8 text-base rounded-full" asChild>
                <a 
                  href={secondaryCtaHref}
                  target={secondaryCtaHref?.startsWith('http') ? '_blank' : undefined}
                  rel={secondaryCtaHref?.startsWith('http') ? 'noopener noreferrer' : undefined}
                >{secondaryCtaText}</a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
