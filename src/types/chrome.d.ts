
interface Chrome {
  runtime: {
    sendMessage: (extensionId: string, message: any, callback?: (response: any) => void) => void;
  };
}

// Declare chrome on the window object
interface Window {
  chrome?: Chrome;
}
