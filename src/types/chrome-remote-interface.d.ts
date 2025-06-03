declare module 'chrome-remote-interface' {
  interface CDPClient {
    Network: {
      enable(): Promise<void>;
      disable(): Promise<void>;
      requestWillBeSent(callback: (params: any) => void): void;
      responseReceived(callback: (params: any) => void): void;
    };
    Console: {
      enable(): Promise<void>;
      disable(): Promise<void>;
      messageAdded(callback: (params: any) => void): void;
    };
    Log: {
      enable(): Promise<void>;
      disable(): Promise<void>;
      entryAdded(callback: (params: any) => void): void;
    };
    close(): Promise<void>;
  }

  interface CDPOptions {
    host?: string;
    port?: number;
    target?: string;
  }

  function CDP(options?: CDPOptions): Promise<CDPClient>;
  export default CDP;
} 