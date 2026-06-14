import React from 'react';
import { Container } from '../shared/Container';

export interface FooterColumn {
  title: string;
  links: Array<{ label: string; href: string }>;
}

export interface FooterProps {
  logoText?: string;
  logoImage?: string;
  description?: string;
  columns?: FooterColumn[];
  copyright?: string;
}

export function Footer({
  logoText = 'WebbiOS',
  logoImage,
  description,
  columns = [],
  copyright = `© ${new Date().getFullYear()} WebbiOS. Open source under AGPLv3.`,
}: FooterProps) {
  return (
    <footer className="border-t border-border/40 bg-background pt-16 pb-8">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              {logoImage ? (
                <img src={logoImage} alt={logoText} className="h-8 w-auto grayscale opacity-80" />
              ) : (
                <span className="text-xl font-bold text-foreground/80">{logoText}</span>
              )}
            </div>
            {description && (
              <p className="text-muted-foreground leading-relaxed max-w-sm">
                {description}
              </p>
            )}
          </div>
          
          {columns.map((col, idx) => (
            <div key={idx}>
              <h4 className="font-semibold mb-6 text-foreground/90">{col.title}</h4>
              <ul className="space-y-4">
                {col.links.map((link, linkIdx) => (
                  <li key={linkIdx}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      target={link.href.startsWith('http') ? '_blank' : undefined}
                      rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="pt-8 border-t border-border/40 text-center text-sm text-muted-foreground">
          <p>{copyright}</p>
        </div>
      </Container>
    </footer>
  );
}
