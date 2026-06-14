import React, { Suspense } from 'react';
import type { SectionConfig } from '../types';

import { Header } from '../components/sections/Header';
import { Hero } from '../components/sections/Hero';
import { Features } from '../components/sections/Features';
import { CTA } from '../components/sections/CTA';
import { Footer } from '../components/sections/Footer';

// We will map section types to components here
const sectionRegistry: Record<string, React.ComponentType<any>> = {
  header: Header,
  hero: Hero,
  features: Features,
  cta: CTA,
  footer: Footer,
};

export function registerSection(type: string, component: React.ComponentType<any>) {
  sectionRegistry[type] = component;
}

interface SectionRendererProps {
  sections: SectionConfig[];
}

export function SectionRenderer({ sections }: SectionRendererProps) {
  return (
    <>
      {sections.map((section) => {
        const Component = sectionRegistry[section.type];
        if (!Component) {
          console.warn(`Section type "${section.type}" not found in registry.`);
          return null;
        }

        return (
          <Suspense key={section.id} fallback={<div className="h-24 animate-pulse bg-muted" />}>
            <Component {...section.props} />
          </Suspense>
        );
      })}
    </>
  );
}
