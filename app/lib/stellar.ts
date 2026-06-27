import * as StellarSdk from '@stellar/stellar-sdk';
import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID,
} from '@creit.tech/stellar-wallets-kit';

export class StellarHelper {
  private server: StellarSdk.Horizon.Server;
  private networkPassphrase: string;
  private kit: StellarWalletsKit | null = null;
  private network: WalletNetwork;
  private publicKey: string | null = null;

  constructor(network: 'testnet' | 'mainnet' = 'testnet') {
    this.server = new StellarSdk.Horizon.Server(
      network === 'testnet'
        ? 'https://horizon-testnet.stellar.org'
        : 'https://horizon.stellar.org'
    );
    this.networkPassphrase =
      network === 'testnet'
        ? StellarSdk.Networks.TESTNET
        : StellarSdk.Networks.PUBLIC;

    this.network =
      network === 'testnet' ? WalletNetwork.TESTNET : WalletNetwork.PUBLIC;

    // Only instantiate in the browser — StellarWalletsKit accesses `window`
    if (typeof window !== 'undefined') {
      this.kit = new StellarWalletsKit({
        network: this.network,
        selectedWalletId: FREIGHTER_ID,
        modules: allowAllModules(),
      });
    }
  }

  private getKit(): StellarWalletsKit {
    if (!this.kit) {
      throw new Error('StellarWalletsKit is only available in the browser.');
    }
    return this.kit;
  }

  isFreighterInstalled(): boolean {
    return true;
  }

  async connectWallet(): Promise<string> {
    try {
      const kit = this.getKit();
      await kit.openModal({
        onWalletSelected: async (option) => {
          console.log('Wallet selected:', option.id);
          kit.setWallet(option.id);
        },
      });

      const { address } = await kit.getAddress();

      if (!address) {
        throw new Error('Could not retrieve wallet address');
      }

      this.publicKey = address;
      return address;
    } catch (error: any) {
      console.error('Wallet connection error:', error);
      throw new Error('Wallet connection failed: ' + error.message);
    }
  }

  async getBalance(publicKey: string): Promise<{
    xlm: string;
    assets: Array<{ code: string; issuer: string; balance: string }>;
  }> {
    const account = await this.server.loadAccount(publicKey);

    const xlmBalance = account.balances.find(
      (b) => b.asset_type === 'native'
    );

    const assets = account.balances
      .filter((b) => b.asset_type !== 'native')
      .map((b: any) => ({
        code: b.asset_code,
        issuer: b.asset_issuer,
        balance: b.balance,
      }));

    return {
      xlm: xlmBalance && 'balance' in xlmBalance ? xlmBalance.balance : '0',
      assets,
    };
  }

  async sendPayment(params: {
    from: string;
    to: string;
    amount: string;
    memo?: string;
  }): Promise<{ hash: string; success: boolean }> {
    const kit = this.getKit();
    const account = await this.server.loadAccount(params.from);

    const transactionBuilder = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    }).addOperation(
      StellarSdk.Operation.payment({
        destination: params.to,
        asset: StellarSdk.Asset.native(),
        amount: params.amount,
      })
    );

    if (params.memo) {
      transactionBuilder.addMemo(StellarSdk.Memo.text(params.memo));
    }

    const transaction = transactionBuilder.setTimeout(180).build();

    const { signedTxXdr } = await kit.signTransaction(transaction.toXDR(), {
      networkPassphrase: this.networkPassphrase,
    });

    const transactionToSubmit = StellarSdk.TransactionBuilder.fromXDR(
      signedTxXdr,
      this.networkPassphrase
    );

    const result = await this.server.submitTransaction(
      transactionToSubmit as StellarSdk.Transaction
    );

    return {
      hash: result.hash,
      success: result.successful,
    };
  }

  async getRecentTransactions(
    publicKey: string,
    limit: number = 10
  ): Promise<
    Array<{
      id: string;
      type: string;
      amount?: string;
      asset?: string;
      from?: string;
      to?: string;
      createdAt: string;
      hash: string;
    }>
  > {
    const payments = await this.server
      .payments()
      .forAccount(publicKey)
      .order('desc')
      .limit(limit)
      .call();

    return payments.records.map((payment: any) => ({
      id: payment.id,
      type: payment.type,
      amount: payment.amount,
      asset: payment.asset_type === 'native' ? 'XLM' : payment.asset_code,
      from: payment.from,
      to: payment.to,
      createdAt: payment.created_at,
      hash: payment.transaction_hash,
    }));
  }

  getExplorerLink(
    hash: string,
    type: 'tx' | 'account' = 'tx'
  ): string {
    const network =
      this.networkPassphrase === StellarSdk.Networks.TESTNET
        ? 'testnet'
        : 'public';
    return `https://stellar.expert/explorer/${network}/${type}/${hash}`;
  }

  formatAddress(
    address: string,
    startChars: number = 4,
    endChars: number = 4
  ): string {
    if (address.length <= startChars + endChars) return address;
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
  }

  disconnect() {
    this.publicKey = null;
    return true;
  }
}

// Only instantiate in the browser — never at SSR/module-eval time
export const stellar: StellarHelper | null =
  typeof window !== 'undefined' ? new StellarHelper('testnet') : null;