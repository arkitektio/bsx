// What a Vite host resolves: a stylesheet as text.
declare module '*?raw' {
  const text: string;
  export default text;
}
