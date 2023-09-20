export declare type LoggingLevel = 'verbose' | 'warnings' | 'silent';
export interface GenModelOptions {
    csPathRel: string;
    csPathFull: string;
    devMode: boolean;
    filePer: 'type' | 'namespace' | 'all';
    logging: LoggingLevel;
    ns: string | string[];
    outputAs: 'ts' | 'md';
    /**
     * The path at which to create the generated files, relative to the current workspace. Default is a folder with the same name as the component in the project root.
     */
    path: string;
    /**
     * The name of the project.
     */
    project?: string;
    recursive: boolean;
    skipScan: string | string[];
    skipScanRe: string | string[];
    scanRe: string | string[];
}
