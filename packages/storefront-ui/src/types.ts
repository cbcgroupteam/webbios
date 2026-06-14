export interface ThemeConfig {
  name: string;
  version: string;
  author: string;
  settings: {
    colors: Record<string, string>;
    fonts: Record<string, string>;
    [key: string]: any;
  };
  pages: Record<string, PageConfig>;
}

export interface PageConfig {
  path: string;
  title: string;
  description?: string;
  sections: SectionConfig[];
}

export interface SectionConfig {
  id: string;
  type: string;
  props: Record<string, any>;
}
