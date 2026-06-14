import React from 'react';
import { Container } from '../shared/Container';
import { Button } from '../shared/Button';

export interface HeaderProps {
  logoText?: string;
  logoImage?: string;
  links?: Array<{ label: string; href: string }>;
  ctaText?: string;
  ctaHref?: string;
}

export function Header({
  logoText = 'WebbiOS',
  logoImage,
  links = [],
  ctaText = 'Get Started',
  ctaHref = '#',
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Container className="flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          {logoImage ? (
            <img src={logoImage} alt={logoText} className="h-8 w-auto" />
          ) : (
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              {logoText}
            </span>
          )}
        </div>
        
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {links.map((link, idx) => (
            <a
              key={idx}
              href={link.href}
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              {link.label}
            </a>
          ))}
        </nav>
        
        <div className="flex items-center gap-4">
          <Button variant="default" asChild>
            <a href={ctaHref}>{ctaText}</a>
          </Button>
        </div>
      </Container>
    </header>
  );
}
