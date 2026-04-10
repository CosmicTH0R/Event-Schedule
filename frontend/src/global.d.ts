// Global TypeScript declarations for the frontend

// Allow CSS module side-effect imports
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}
