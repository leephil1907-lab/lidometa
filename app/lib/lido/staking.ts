export const stakeETH = async (signer: any, amount: string) => {
  return new Promise<string>((resolve) => {
    setTimeout(() => {
      resolve("0xMockTransactionHash" + Math.random().toString(16).substring(2));
    }, 2000);
  });
};
