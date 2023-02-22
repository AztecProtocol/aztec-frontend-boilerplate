import { Core } from '@walletconnect/core';
import Client from '@walletconnect/sign-client';
import { SignClient } from '@walletconnect/sign-client/dist/types/client.js';
import { Web3Modal } from '@web3modal/standalone';

// Node16 module resolution seems to be broken for this package.
const SignClientClass = Client as unknown as typeof SignClient;

export async function createClient() {
  const core = new Core({
    logger: 'debug',
    projectId: '3c8bb328309b91d45b5cc8b2dc392065'//process.env.WALLETCONNECT_PROJECT_ID,
  });

  const signClient = await SignClientClass.init({
    logger: 'debug',
    core,
    metadata: {
      name: 'Aztec Frontend Boilerplate',
      description: 'An example dapp',
      url: window.location.href,
      icons: ['https://zk.money/assets/yield_logo-2296066e.svg'],
    },
  });
  return signClient;
}

export function createWeb3Modal() {
  return new Web3Modal({
    projectId: process.env.WALLETCONNECT_PROJECT_ID || '3c8bb328309b91d45b5cc8b2dc392065',
    desktopWallets: [
      {
        id: 'aztec-wallet',
        name: 'Aztec Wallet',
        links: {
          universal: 'http://localhost:1235',
          native: '',
        },
      },
    ],
    mobileWallets: [
      {
        id: 'aztec-wallet',
        name: 'Aztec Wallet',
        links: {
          universal: 'http://localhost:1235',
          native: '',
        },
      },
    ],
    walletImages: {
      'aztec-wallet': 'https://pbs.twimg.com/profile_images/1545019840993320962/x1FFDd1C_400x400.jpg',
    },
  });
}
