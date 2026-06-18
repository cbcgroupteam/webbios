import React from 'react';
import { SectionWrapper } from '../shared/SectionWrapper';

export interface ImageSectionProps {
  src: string;
  alt: string;
  id?: string;
}

export function ImageSection({ src, alt, id }: ImageSectionProps) {
  return (
    <SectionWrapper id={id || "image"} background="transparent">
      <div className="flex justify-center w-full max-w-5xl mx-auto py-12">
        <img src={src} alt={alt} className="w-full h-auto rounded-3xl border border-border/50 shadow-2xl" />
      </div>
    </SectionWrapper>
  );
}
