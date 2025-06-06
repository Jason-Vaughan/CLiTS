declare module 'chrome-remote-interface' {
  export interface CDPClient {
    Network: {
      enable(): Promise<void>;
      disable(): Promise<void>;
      requestWillBeSent: any;
      responseReceived: any;
    };
    Console: {
      enable(): Promise<void>;
      disable(): Promise<void>;
      messageAdded: any;
    };
    Log: {
      enable(): Promise<void>;
      disable(): Promise<void>;
      entryAdded: any;
    };
    close(): Promise<void>;
    on(event: string, callback: (data: unknown) => void): void;
  }

  export default function CDP(options?: any): Promise<CDPClient>;
} 