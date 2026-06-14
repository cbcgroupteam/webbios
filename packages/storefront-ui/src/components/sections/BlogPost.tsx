import React from 'react';
import { SectionWrapper } from '../shared/SectionWrapper';

export interface BlogPostProps {
  title: string;
  date: string;
  author: string;
  content: string;
}

export function BlogPost({ title, date, author, content }: BlogPostProps) {
  return (
    <SectionWrapper background="transparent" className="py-16 md:py-24">
      <article className="max-w-3xl mx-auto">
        <header className="mb-10 md:mb-16 text-center">
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mb-6">
            <time dateTime={date}>{date}</time>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>{author}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6 leading-tight">
            {title}
          </h1>
        </header>
        
        <div 
          className="prose prose-invert prose-lg max-w-none prose-headings:text-foreground prose-a:text-primary hover:prose-a:text-primary/80 prose-img:rounded-xl"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </article>
    </SectionWrapper>
  );
}
