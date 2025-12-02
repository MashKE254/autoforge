/**
 * WebContainer Manager
 * * Manages WebContainer instances for running code in the browser.
 * This is a stub implementation since WebContainer runs client-side only.
 */

import { WebContainer } from '@webcontainer/api';

export interface WebContainerManager {
  instance: WebContainer | null;
  boot: () => Promise<WebContainer>;
  teardown: () => Promise<void>;
}

let webContainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

export const webContainerManager: WebContainerManager = {
  instance: null,

  async boot() {
    // 1. If instance already exists, return it immediately
    if (webContainerInstance) {
      return webContainerInstance;
    }

    // 2. If a boot is already in progress, return that existing promise
    if (bootPromise) {
      return bootPromise;
    }

    // 3. Start booting and assign the promise to the tracking variable
    bootPromise = WebContainer.boot();

    try {
      webContainerInstance = await bootPromise;
      this.instance = webContainerInstance;
      return webContainerInstance;
    } catch (error) {
      console.error('Failed to boot WebContainer:', error);
      // Reset the promise so we can try again if it fails
      bootPromise = null;
      throw error;
    }
  },

  async teardown() {
    if (webContainerInstance) {
      // Note: Teardown behavior depends on the WebContainer version/support
      await webContainerInstance.teardown(); 
      webContainerInstance = null;
      bootPromise = null; // Important: Clear the promise cache
      this.instance = null;
    }
  }
};

export default webContainerManager;