import { Container, Contracts } from "@arkecosystem/core-kernel";
import { Boom, notFound } from "@hapi/boom";
import Hapi from "@hapi/hapi";

import { LockResource, TransactionResource, WalletResource } from "../resources";
import { Controller } from "./controller";

@Container.injectable()
export class WalletsController extends Controller {
    @Container.inject(Container.Identifiers.TransactionHistoryService)
    private readonly transactionHistoryService!: Contracts.Shared.TransactionHistoryService;

    @Container.inject(Container.Identifiers.WalletRepository)
    @Container.tagged("state", "blockchain")
    private readonly walletRepository!: Contracts.State.WalletRepository;

    public async index(request: Hapi.Request, h: Hapi.ResponseToolkit) {
        return this.toPagination(
            this.walletRepository.search(Contracts.State.SearchScope.Wallets, {
                ...request.query,
                ...this.getListingPage(request),
            }),
            WalletResource,
        );
    }

    public async top(request: Hapi.Request, h: Hapi.ResponseToolkit) {
        return this.toPagination(
            this.walletRepository.top(Contracts.State.SearchScope.Wallets, this.getListingPage(request)),
            WalletResource,
        );
    }

    public async show(request: Hapi.Request, h: Hapi.ResponseToolkit) {
        const wallet: Contracts.State.Wallet | Boom<null> = this.findWallet(request.params.id);
        if (wallet instanceof Boom) {
            return wallet;
        }

        return this.respondWithResource(wallet, WalletResource);
    }

    public async transactions(request: Hapi.Request, h: Hapi.ResponseToolkit) {
        const wallet: Contracts.State.Wallet | Boom<null> = this.findWallet(request.params.id);
        if (wallet instanceof Boom) {
            return wallet;
        }

        const transactionListResult = await this.transactionHistoryService.listByWalletAndCriteria(
            wallet,
            request.query,
            this.getListingOrder(request),
            this.getListingPage(request),
        );

        return this.toPagination(transactionListResult, TransactionResource, request.query.transform);
    }

    public async transactionsSent(request: Hapi.Request, h: Hapi.ResponseToolkit) {
        const wallet: Contracts.State.Wallet | Boom<null> = this.findWallet(request.params.id);
        if (wallet instanceof Boom) {
            return wallet;
        }
        if (!wallet.publicKey) {
            return this.toPagination({ rows: [], count: 0, countIsEstimate: false }, TransactionResource);
        }

        const transactionListResult = await this.transactionHistoryService.listBySenderPublicKeyAndCriteria(
            wallet.publicKey,
            request.query,
            this.getListingOrder(request),
            this.getListingPage(request),
        );

        return this.toPagination(transactionListResult, TransactionResource, request.query.transform);
    }

    public async transactionsReceived(request: Hapi.Request, h: Hapi.ResponseToolkit) {
        const wallet: Contracts.State.Wallet | Boom<null> = this.findWallet(request.params.id);
        if (wallet instanceof Boom) {
            return wallet;
        }
        if (!wallet.publicKey) {
            return this.toPagination({ rows: [], count: 0, countIsEstimate: false }, TransactionResource);
        }

        const transactionListResult = await this.transactionHistoryService.listByRecipientIdAndCriteria(
            wallet.address,
            request.query,
            this.getListingOrder(request),
            this.getListingPage(request),
        );

        return this.toPagination(transactionListResult, TransactionResource, request.query.transform);
    }

    public async votes(request: Hapi.Request, h: Hapi.ResponseToolkit) {
        const wallet: Contracts.State.Wallet | Boom<null> = this.findWallet(request.params.id);
        if (wallet instanceof Boom) {
            return wallet;
        }
        if (!wallet.publicKey) {
            return this.toPagination({ rows: [], count: 0, countIsEstimate: false }, TransactionResource);
        }

        const transactionListResult = await this.transactionHistoryService.listVoteBySenderPublicKeyAndCriteria(
            wallet.publicKey,
            request.query,
            this.getListingOrder(request),
            this.getListingPage(request),
        );

        return this.toPagination(transactionListResult, TransactionResource);
    }

    public async locks(request: Hapi.Request, h: Hapi.ResponseToolkit) {
        const wallet: Contracts.State.Wallet | Boom<null> = this.findWallet(request.params.id);
        if (wallet instanceof Boom) {
            return wallet;
        }
        if (!wallet.publicKey) {
            return this.toPagination({ rows: [], count: 0, countIsEstimate: false }, LockResource);
        }

        const lockListResult = this.walletRepository.search(Contracts.State.SearchScope.Locks, {
            ...request.params,
            ...request.query,
            ...this.getListingPage(request),
            senderPublicKey: wallet.publicKey,
        });

        return this.toPagination(lockListResult, LockResource);
    }

    public async search(request: Hapi.Request, h: Hapi.ResponseToolkit) {
        const wallets = this.walletRepository.search(Contracts.State.SearchScope.Wallets, {
            ...request.payload,
            ...request.query,
            ...this.getListingPage(request),
        });

        return this.toPagination(wallets, WalletResource);
    }

    private findWallet(id: string): Contracts.State.Wallet | Boom<null> {
        try {
            return this.walletRepository.findByScope(Contracts.State.SearchScope.Wallets, id);
        } catch (error) {
            return notFound("Wallet not found");
        }
    }
}
