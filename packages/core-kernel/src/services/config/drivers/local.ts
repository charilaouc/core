import cosmiconfig from "cosmiconfig";
import { set } from "dottie";
import { parseFileSync } from "envfile";
import { JsonObject } from "../../../types";
import { Application } from "../../../contracts/kernel";
import { ConfigLoader } from "../../../contracts/kernel/config";
import {
    ApplicationConfigurationCannotBeLoaded,
    EnvironmentConfigurationCannotBeLoaded,
} from "../../../exceptions/config";
import { injectable, inject, Identifiers } from "../../../container";

/**
 * @export
 * @class LocalConfigLoader
 * @implements {ConfigLoader}
 */
@injectable()
export class LocalConfigLoader implements ConfigLoader {
    /**
     * The application instance.
     *
     * @protected
     * @type {Application}
     * @memberof LocalConfigLoader
     */
    @inject(Identifiers.Application)
    protected readonly app: Application;

    /**
     * @returns {Promise<void>}
     * @memberof LocalConfigLoader
     */
    public async loadConfiguration(): Promise<void> {
        try {
            await this.loadServiceProviders();

            await this.loadPeers();

            await this.loadDelegates();
        } catch {
            throw new ApplicationConfigurationCannotBeLoaded();
        }
    }

    /**
     * @returns {Promise<void>}
     * @memberof LocalConfigLoader
     */
    public async loadEnvironmentVariables(): Promise<void> {
        // @todo: enable this after initial migration
        // if (this.app.runningTests()) {
        //     return;
        // }

        try {
            const config: Record<string, string> = parseFileSync(this.app.environmentFile());

            for (const [key, value] of Object.entries(config)) {
                set(process.env, key, value);
            }
        } catch (error) {
            throw new EnvironmentConfigurationCannotBeLoaded(error.stack);
        }
    }

    /**
     * @private
     * @returns {Promise<void>}
     * @memberof LocalConfigLoader
     */
    private async loadServiceProviders(): Promise<void> {
        this.app.config(
            "packages",
            this.loadFromLocation([this.app.configPath("packages.json"), this.app.configPath("packages.js")]),
        );
    }

    /**
     * @private
     * @returns {Promise<void>}
     * @memberof LocalConfigLoader
     */
    private async loadPeers(): Promise<void> {
        this.app.config("peers", this.loadFromLocation([this.app.configPath("peers.json")]));
    }

    /**
     * @private
     * @returns {Promise<void>}
     * @memberof LocalConfigLoader
     */
    private async loadDelegates(): Promise<void> {
        this.app.config("delegates", this.loadFromLocation([this.app.configPath("delegates.json")]));
    }

    /**
     * @private
     * @param {string[]} searchPlaces
     * @returns {JsonObject}
     * @memberof LocalConfigLoader
     */
    private loadFromLocation(searchPlaces: string[]): JsonObject {
        return cosmiconfig(this.app.namespace(), {
            searchPlaces,
            stopDir: this.app.configPath(),
        }).searchSync().config;
    }
}
