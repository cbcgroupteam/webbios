import React, { Suspense } from 'react';
import type { SectionConfig } from '../types';

import { Header } from '../components/sections/Header';
import { Hero } from '../components/sections/Hero';
import { Features } from '../components/sections/Features';
import { CTA } from '../components/sections/CTA';
import { Footer } from '../components/sections/Footer';
import { Blog } from '../components/sections/Blog';
import { BlogPost } from '../components/sections/BlogPost';
import { ImageSection } from '../components/sections/ImageSection';

// We will map section types to components here
const sectionRegistry: Record<string, React.ComponentType<any>> = {
  header: Header,
  hero: Hero,
  features: Features,
  cta: CTA,
  footer: Footer,
  blog: Blog,
  'blog-post': BlogPost,
  image: ImageSection,
};

export function registerSection(type: string, component: React.ComponentType<any>) {
  sectionRegistry[type] = component;
}

interface SectionRendererProps {
  sections: SectionConfig[];
  currentPath?: string;
}

export function SectionRenderer({ sections, currentPath }: SectionRendererProps) {
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
            <Component {...section.props} id={section.id} currentPath={currentPath} />
          </Suspense>
        );
      })}
    </>
  );
}
