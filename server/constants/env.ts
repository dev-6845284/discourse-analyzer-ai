
export enum Environment {
    PRODUCTION = 'production',
    PREVIEW = 'preview',
    DEVELOPMENT = 'development',
    LOCAL = 'local',
    TEST = 'test',
}

const VALID_ENVIRONMENTS = Object.values(Environment) as string[];

export const validateEnvironment = () => {
    const env = process.env.NODE_ENV;

    if (!env) {
        console.error('CRITICAL: NODE_ENV is not set. The application must know its environment to function correctly.');
        process.exit(1);
    }

    if (!VALID_ENVIRONMENTS.includes(env)) {
        console.error(`CRITICAL: Invalid NODE_ENV "${env}". Valid values are: ${VALID_ENVIRONMENTS.join(', ')}`);
        process.exit(1);
    }

    console.log(`[ENV] Running in ${env} mode.`);
};

export const getCurrentEnv = () => process.env.NODE_ENV as Environment;

export const isProduction = () => getCurrentEnv() === Environment.PRODUCTION;
export const isPreview = () => getCurrentEnv() === Environment.PREVIEW;
export const isDevelopment = () => getCurrentEnv() === Environment.DEVELOPMENT;
export const isLocal = () => getCurrentEnv() === Environment.LOCAL;
export const isTest = () => getCurrentEnv() === Environment.TEST;

/**
 * Environments that require strict security measures.
 * Based on user clarification: development is the latest version deployed to web and requires high security.
 */
export const isStrictSecurity = () => isProduction() || isPreview() || isDevelopment();

/**
 * Environments where security checks can be relaxed for developer convenience.
 */
export const isRelaxedSecurity = () => isLocal();

