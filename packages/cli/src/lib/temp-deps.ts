// Temporary implementations until dependencies are available

export const ed25519 = {
  utils: {
    randomPrivateKey: () => new Uint8Array(32).fill(1)
  },
  getPublicKey: (_privateKey: Uint8Array) => new Uint8Array(32).fill(2),
  sign: async (_message: Uint8Array, _privateKey: Uint8Array) => new Uint8Array(64).fill(3),
  verify: async (_signature: Uint8Array, _message: Uint8Array, _publicKey: Uint8Array) => true
};

export async function request(_url: string) {
  return {
    statusCode: 404,
    body: {
      text: async () => '{}'
    }
  };
}

export default function glob(_pattern: string, _options?: any): Promise<string[]> {
  return Promise.resolve([]);
}