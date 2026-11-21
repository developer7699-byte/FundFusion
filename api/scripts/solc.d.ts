/**
 * solc ships no type declarations. Only the two entry points the deploy
 * script uses are declared, so a third is a compile error rather than `any`
 * spreading quietly through the script that deploys our token.
 */
declare module 'solc' {
  const solc: {
    /** Standard JSON in, standard JSON out — both as strings. */
    compile(input: string): string;
    version(): string;
  };
  export default solc;
}
