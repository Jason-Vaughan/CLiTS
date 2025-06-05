import readline from 'readline';

export async function waitForInteractiveLogin() {
  return new Promise<void>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question('\n[CLITS] Please log in to the app in the opened browser window, then press Enter to continue...\n', () => {
      rl.close();
      resolve();
    });
  });
} 