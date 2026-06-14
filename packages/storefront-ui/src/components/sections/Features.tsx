import React from 'react';
import { SectionWrapper } from '../shared/SectionWrapper';
import { cn } from '../shared/Container';

export interface FeatureItem {
  icon?: React.ReactNode;
  title: string;
  description: string;
  link?: string;
  linkLabel?: string;
}

export interface FeaturesProps {
  title?: string;
  subtitle?: string;
  features: FeatureItem[];
  columns?: 2 | 3 | 4;
}

export function Features({ title, subtitle, features, columns = 4 }: FeaturesProps) {
  return (
    <SectionWrapper id="features" background="muted">
      {(title || subtitle) && (
        <div className="text-center mb-16">
          {title && <h2 className="text-3xl md:text-4xl font-bold mb-4">{title}</h2>}
          {subtitle && <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>}
        </div>
      )}
      
      <div
        className={cn('grid gap-6 md:gap-8', {
          'grid-cols-1 md:grid-cols-2': columns === 2,
          'grid-cols-1 md:grid-cols-3': columns === 3,
          'grid-cols-1 md:grid-cols-2 lg:grid-cols-4': columns === 4,
        })}
      >
        {features.map((feature, idx) => (
          <div
            key={idx}
            className="group relative flex flex-col p-6 md:p-8 bg-card rounded-2xl border border-border/50 hover:border-primary/50 transition-colors shadow-sm hover:shadow-md"
          >
            {feature.icon && (
              <div className="mb-4 h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                {feature.icon}
              </div>
            )}
            <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
              {feature.title}
            </h3>
            <p className="text-muted-foreground leading-relaxed flex-1">
              {feature.description}
            </p>
            {feature.link && (
              <div className="mt-4">
                <a 
                  href={feature.link}
                  className="text-primary font-medium hover:underline inline-flex items-center gap-1"
                  target={feature.link?.startsWith('http') ? '_blank' : undefined}
                  rel={feature.link?.startsWith('http') ? 'noopener noreferrer' : undefined}
                >
                  {feature.linkLabel || 'Read more'} &rarr;
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}
