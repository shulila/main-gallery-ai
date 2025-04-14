
interface Chrome {
  runtime: {
    sendMessage: (extensionId: string | undefined, message: any, callback?: (response: any) => void) => void;
    getURL: (path: string) => string;
    lastError?: {
      message: string;
    };
    id?: string;
    onMessage: {
      addListener: (callback: (message: any, sender: any, sendResponse: (response: any) => void) => void) => void;
      removeListener: (callback: (message: any, sender: any, sendResponse: (response: any) => void) => void) => void;
    };
  };
  storage: {
    local: {
      get: (keys: string[] | string | null, callback: (result: any) => void) => void;
      set: (items: object, callback?: () => void) => void;
      remove: (keys: string | string[], callback?: () => void) => void;
      clear: (callback?: () => void) => void;
    };
    sync?: {
      get: (keys: string[] | string | null, callback: (result: any) => void) => void;
      set: (items: object, callback?: () => void) => void;
      remove: (keys: string | string[], callback?: () => void) => void;
      clear: (callback?: () => void) => void;
    };
  };
  tabs: {
    query: (queryInfo: any, callback: (tabs: any[]) => void) => void;
    create: (createProperties: any, callback?: (tab: any) => void) => void;
    update: (tabId: number, updateProperties: any, callback?: (tab?: any) => void) => void;
    onUpdated: {
      addListener: (callback: (tabId: number, changeInfo: any, tab: any) => void) => void;
      removeListener: (callback: (tabId: number, changeInfo: any, tab: any) => void) => void;
    };
  };
  webNavigation: {
    onHistoryStateUpdated: {
      addListener: (callback: (details: { tabId: number; url: string; }) => void) => void;
      removeListener: (callback: (details: { tabId: number; url: string; }) => void) => void;
    };
  };
  scripting: {
    executeScript: (injection: {
      target: { tabId: number },
      func: any,
      args?: any[]
    }) => Promise<any>;
  };
  cookies: {
    get: (details: {
      url: string,
      name: string
    }) => Promise<{
      name: string,
      value: string,
      domain: string,
      path: string,
      secure: boolean,
      httpOnly: boolean,
      sameSite: "strict" | "lax" | "none",
      expirationDate?: number
    } | null>;
    set: (details: {
      url: string,
      name: string,
      value: string,
      domain?: string,
      path?: string,
      secure?: boolean,
      httpOnly?: boolean,
      sameSite?: "strict" | "lax" | "none",
      expirationDate?: number
    }) => Promise<any>;
    remove: (details: {
      url: string,
      name: string
    }) => Promise<any>;
  };
  identity: {
    getAuthToken: (details: {
      interactive?: boolean,
      account?: any,
      scopes?: string[]
    }, callback: (token?: string) => void) => void;
    removeCachedAuthToken: (details: {
      token: string
    }, callback?: () => void) => void;
    launchWebAuthFlow: (details: {
      url: string,
      interactive?: boolean
    }, callback: (responseUrl?: string) => void) => void;
  };
  permissions: {
    getAll: () => Promise<{
      permissions: string[],
      origins: string[]
    }>;
    request: (permissions: {
      permissions?: string[],
      origins?: string[]
    }) => Promise<boolean>;
  };
}

// Declare chrome on the window object
interface Window {
  chrome: Chrome;
}

// Declare chrome as a global variable
declare const chrome: Chrome;
