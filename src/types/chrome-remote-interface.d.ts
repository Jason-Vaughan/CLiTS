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
    Page: {
      enable(): Promise<void>;
      disable(): Promise<void>;
      navigate(params: { url: string }): Promise<void>;
      loadEventFired(): Promise<void>;
      captureScreenshot(params?: { format?: string; quality?: number }): Promise<{ data: string }>;
    };
    Runtime: {
      enable(): Promise<void>;
      disable(): Promise<void>;
      evaluate(params: { expression: string; silent?: boolean }): Promise<{ result: { value?: any } }>;
      exceptionThrown: any;
    };
    DOM: {
      enable(): Promise<void>;
      disable(): Promise<void>;
      getDocument(): Promise<{ root: { nodeId: number } }>;
      querySelector(params: { nodeId: number; selector: string }): Promise<{ nodeId: number }>;
      getBoxModel(params: { nodeId: number }): Promise<{ model: { content: number[] } }>;
    };
    Input: {
      enable(): Promise<void>;
      disable(): Promise<void>;
      dispatchMouseEvent(params: {
        type: string;
        x: number;
        y: number;
        button?: string;
        clickCount?: number;
      }): Promise<void>;
      dispatchKeyEvent(params: {
        type: string;
        key?: string;
        text?: string;
      }): Promise<void>;
    };
    CSS: {
      enable(): Promise<void>;
      disable(): Promise<void>;
    };
    close(): Promise<void>;
    on(event: string, callback: (data: unknown) => void): void;
  }

  export default function CDP(options?: any): Promise<CDPClient>;
} 