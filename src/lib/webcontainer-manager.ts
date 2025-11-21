/**
 * WebContainer Manager
 * 
 * Manages WebContainer instances for running code in the browser.
 * This is a stub implementation since WebContainer runs client-side only.
 */

import { WebContainer } from '@webcontainer/api';

export interface WebContainerManager {
  instance: WebContainer | null;
  boot: () => Promise<WebContainer>;
  teardown: () => Promise<void>;
}

let webContainerInstance: WebContainer | null = null;

export const webContainerManager: WebContainerManager = {
  instance: null,

  async boot() {
    if (webContainerInstance) {
      return webContainerInstance;
    }

    try {
      webContainerInstance = await WebContainer.boot();
      this.instance = webContainerInstance;
      return webContainerInstance;
    } catch (error) {
      console.error('Failed to boot WebContainer:', error);
      throw error;
    }
  },

  async teardown() {
    if (webContainerInstance) {
      await webContainerInstance.teardown();
      webContainerInstance = null;
      this.instance = null;
    }
  }
};

export default webContainerManager;