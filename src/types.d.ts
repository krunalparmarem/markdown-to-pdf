declare module 'storehouse-js' {
  interface Storehouse {
    getItem(namespace: string, key: string): any;
    setItem(namespace: string, key: string, value: any, expiredAt: Date): void;
  }
  const storehouse: Storehouse;
  export default storehouse;
}