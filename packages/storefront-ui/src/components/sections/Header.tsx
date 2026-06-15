import React from 'react';
import { Container } from '../shared/Container';
import { Button } from '../shared/Button';

export interface HeaderProps {
  logoText?: string;
  logoImage?: string;
  links?: Array<{ label: string; href: string }>;
  ctaText?: string;
  ctaHref?: string;
  currentPath?: string;
}

const SUB_PLATFORM = [
  { label: 'Platform Overview', href: '/platform' },
  { label: 'The Kernel API', href: '/platform/the-kernel-api' },
  { label: 'The Universal Dashboard', href: '/platform/universal-dashboard' },
  { label: 'Themes Architecture', href: '/platform/themes-architecture' },
  { label: 'Apps Ecosystem', href: '/platform/apps-ecosystem' },
];

const SUB_DEVELOPERS = [
  { label: 'Documentation', href: 'https://docs.webbios.dev' },
  { label: 'WebbiSDK', href: '/developers/sdk' },
  { label: 'WebbiCLI', href: '/developers/cli' },
  { label: 'UI Libraries', href: '/developers/ui' },
  { label: 'Partner Portal', href: 'https://partners.webbios.dev' },
];

const SUB_MORE = [
  { label: 'About WebbiOS', href: '/about' },
  { label: 'Blog', href: '/blog' },
  { label: 'Changelog', href: '/changelog' },
  { label: 'Contact Us', href: '/contact' },
  { label: 'GitHub', href: 'https://github.com/cbcgroupteam/webbios' },
  { label: 'Facebook', href: 'https://www.facebook.com/webbios.dev' },
];

const SUB_FEATURES = [
  { label: 'Open Source', href: '/features/open-source' },
  { label: 'Edge Native', href: '/features/edge-native' },
  { label: 'Zero Cost', href: '/features/zero-cost' },
  { label: 'Extend Everything', href: '/features/extend-everything' },
  { label: 'Universal Storefront', href: '/features/universal-storefront' },
  { label: 'Layered Architecture', href: '/features/layered-architecture' },
  { label: '4-Tier Caching', href: '/features/4-tier-caching' },
  { label: 'Service Bindings', href: '/features/automated-service-bindings' },
  { label: 'Micro-Frontends', href: '/features/micro-frontends' },
  { label: 'RBAC', href: '/features/role-based-access-control' },
  { label: 'Global Edge Network', href: '/features/global-edge-network' },
  { label: 'Auto-Scaling', href: '/features/auto-scaling' },
];

export function Header({
  logoText = 'WebbiOS',
  logoImage,
  links = [],
  ctaText = 'Get Started',
  ctaHref = '#',
  currentPath,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Container className="flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <a href="/" className="flex items-center gap-2">
            {logoImage && (
              <img src={logoImage} alt={logoText} className="h-8 w-auto" />
            )}
            <span className="text-xl font-bold text-[#56C0F8] tracking-tight">
              {logoText}
            </span>
          </a>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {links.map((link, idx) => {
            const isActive = currentPath === link.href || (link.href !== '/' && currentPath?.startsWith(link.href));

            const isDropdown = ['Platform', 'Features', 'Developers', 'More'].includes(link.label);

            if (isDropdown) {
              let items: Array<{label: string, href: string}> = [];
              let style = {};

              switch (link.label) {
                case 'Platform':
                  items = SUB_PLATFORM;
                  style = { width: '280px', display: 'flex', flexDirection: 'column' };
                  break;
                case 'Features':
                  items = SUB_FEATURES;
                  style = { width: '600px', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' };
                  break;
                case 'Developers':
                  items = SUB_DEVELOPERS;
                  style = { width: '240px', display: 'flex', flexDirection: 'column' };
                  break;
                case 'More':
                  items = SUB_MORE;
                  style = { width: '200px', display: 'flex', flexDirection: 'column' };
                  break;
              }

              return (
                <div key={idx} className="relative group">
                  <a
                    href={link.href}
                    className={`transition-colors py-2 flex items-center gap-1 ${isActive ? 'text-primary font-semibold' : 'text-foreground/60 hover:text-foreground/80'}`}
                  >
                    {link.label}
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 group-hover:rotate-180 transition-transform"><path d="m6 9 6 6 6-6" /></svg>
                  </a>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 z-50">
                    <div
                      className="bg-card border border-border rounded-xl shadow-lg p-4 gap-x-6 gap-y-3"
                      style={style}
                    >
                      {items.map((feat, fIdx) => (
                        <a
                          key={fIdx}
                          href={feat.href}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors hover:bg-muted/50 px-3 py-2 rounded-md"
                          target={feat.href.startsWith('http') ? '_blank' : undefined}
                          rel={feat.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                        >
                          {feat.label}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <a
                key={idx}
                href={link.href}
                className={`transition-colors ${isActive ? 'text-primary font-semibold' : 'text-foreground/60 hover:text-foreground/80'}`}
                target={link.href.startsWith('http') ? '_blank' : undefined}
                rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden md:block">
            <Button variant="default" asChild>
              <a
                href={ctaHref}
                target={ctaHref.startsWith('http') ? '_blank' : undefined}
                rel={ctaHref.startsWith('http') ? 'noopener noreferrer' : undefined}
              >{ctaText}</a>
            </Button>
          </div>
          
          <button 
            id="mobile-menu-btn" 
            className="md:hidden p-2 -mr-2 text-foreground/80 hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
            aria-label="Toggle Menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
          </button>
        </div>
      </Container>

      {/* Mobile Menu Panel */}
      <div id="mobile-menu" className="hidden md:hidden border-t border-border/40 bg-background/95 px-4 py-6 space-y-6 max-h-[80vh] overflow-y-auto">
        <nav className="flex flex-col gap-4">
          {links.map((link, idx) => {
            const isDropdown = ['Platform', 'Features', 'Developers', 'More'].includes(link.label);
            
            if (isDropdown) {
              let items: Array<{label: string, href: string}> = [];
              switch (link.label) {
                case 'Platform': items = SUB_PLATFORM; break;
                case 'Features': items = SUB_FEATURES; break;
                case 'Developers': items = SUB_DEVELOPERS; break;
                case 'More': items = SUB_MORE; break;
              }
              
              return (
                <div key={idx} className="flex flex-col gap-3">
                  <button className="mobile-submenu-btn flex justify-between items-center w-full text-left font-semibold text-foreground text-lg" aria-expanded="false">
                    {link.label}
                    <svg className="submenu-icon transition-transform text-muted-foreground" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14"/>
                      <path d="M12 5v14" className="plus-line"/>
                    </svg>
                  </button>
                  <div className="submenu-content hidden pl-4 flex-col gap-3 border-l-2 border-border/40">
                    {items.map((feat, fIdx) => (
                      <a 
                        key={fIdx} 
                        href={feat.href} 
                        className="text-muted-foreground hover:text-primary transition-colors"
                        target={feat.href.startsWith('http') ? '_blank' : undefined}
                        rel={feat.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      >
                        {feat.label}
                      </a>
                    ))}
                  </div>
                </div>
              );
            }
            
            return (
              <a 
                key={idx} 
                href={link.href} 
                className="font-semibold text-foreground text-lg hover:text-primary transition-colors"
                target={link.href.startsWith('http') ? '_blank' : undefined}
                rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              >
                {link.label}
              </a>
            );
          })}
        </nav>
        <div className="pt-4 border-t border-border/40">
          <Button variant="default" className="w-full py-6 text-lg rounded-full" asChild>
            <a 
              href={ctaHref} 
              target={ctaHref.startsWith('http') ? '_blank' : undefined}
              rel={ctaHref.startsWith('http') ? 'noopener noreferrer' : undefined}
            >{ctaText}</a>
          </Button>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        document.addEventListener('DOMContentLoaded', function() {
          var btn = document.getElementById('mobile-menu-btn');
          var menu = document.getElementById('mobile-menu');
          if (btn && menu) {
            btn.addEventListener('click', function() {
              menu.classList.toggle('hidden');
            });
          }
          
          var submenuBtns = document.querySelectorAll('.mobile-submenu-btn');
          submenuBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
              var content = this.nextElementSibling;
              var iconLine = this.querySelector('.plus-line');
              if (content.classList.contains('hidden')) {
                content.classList.remove('hidden');
                content.classList.add('flex');
                if (iconLine) iconLine.style.display = 'none';
              } else {
                content.classList.add('hidden');
                content.classList.remove('flex');
                if (iconLine) iconLine.style.display = 'block';
              }
            });
          });
        });
      `}} />
    </header>
  );
}
