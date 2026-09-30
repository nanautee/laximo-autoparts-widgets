/// <reference types="vite/client" />

/** CSS pulled in as a URL so the widget bundle can inject its own styles. */
declare module '*.css?url' {
  const url: string;
  export default url;
}
