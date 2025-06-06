declare module 'chrome-remote-interface' {
  interface CDPClient {
    Network: {
      enable: () => Promise<void>;
      disable: () => Promise<void>;
      requestWillBeSent: () => void;
      responseReceived: () => void;
    };
    Console: {
      enable: () => Promise<void>;
      disable: () => Promise<void>;
      messageAdded: () => void;
    };
    Log: {
      enable: () => Promise<void>;
      disable: () => Promise<void>;
      entryAdded: () => void;
    };
    close: () => Promise<void>;
    on: (event: string, callback: (data: unknown) => void) => void;
  }

  interface CDPOptions {
    host?: string;
    port?: number;
    target?: string | ((targets: any[]) => string | undefined);
    local?: boolean;
    protocol?: any;
    remote?: boolean;
    alterPath?: (path: string) => string;
    useHostName?: boolean;
  }

  function CDP(options?: CDPOptions): Promise<CDPClient>;
  export = CDP;
} 