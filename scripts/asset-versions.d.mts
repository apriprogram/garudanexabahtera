import type { Plugin } from 'vite';

export declare const ASSET_VERSIONS_ID: 'virtual:gn-asset-versions';
export declare const ASSET_VERSION_LENGTH: number;
export declare function computeAssetVersions(publicDir: string): Record<string, string>;
export declare function assetVersionsPlugin(options: { publicDir: string }): Plugin;
