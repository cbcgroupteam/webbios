import React from 'react';
import { Container } from './Container';
import { cn } from './Container';

interface SectionWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  id?: string;
  background?: 'default' | 'muted' | 'transparent';
  container?: boolean;
}

export function SectionWrapper({
  id,
  className,
  background = 'default',
  container = true,
  children,
  ...props
}: SectionWrapperProps) {
  return (
    <section
      id={id}
      className={cn(
        'py-16 md:py-24',
        {
          'bg-background': background === 'default',
          'bg-muted/50': background === 'muted',
          'bg-transparent': background === 'transparent',
        },
        className
      )}
      {...props}
    >
      {container ? <Container>{children}</Container> : children}
    </section>
  );
}
