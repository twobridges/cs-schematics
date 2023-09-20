import { Rule, Tree } from "@angular-devkit/schematics";
import { CSharpClass, CSharpFile, CSharpNamespace, EmitOptions, Emitter, PerClassEmitOptions } from "@fluffy-spoon/csharp-to-typescript-generator";
import { DefaultEmitOptions } from "@fluffy-spoon/csharp-to-typescript-generator/dist/src/Emitter";
import { readdirSync, readFileSync, stat, statSync } from "fs";
import { Result } from "../ddd/shared-kernel/functional-programming/result.model";
import { CSharpClassInfo } from "./CSharpClassInfo";
import { CSharpClassSourceInfo } from "./CSharpClassSourceInfo";
import { KnownClasses } from "./local-cache";

export const CODE_INDENT = '  ';


export function indentCode(code: string, levels: number) {
    return `${CODE_INDENT.repeat(levels)}${code.split('\n').join('\n' + CODE_INDENT.repeat(levels))}`;
}

/**
 *
 * @param dtoPath
 */
export function scanCSharpClasses(
    options: {
        dirPath: string,
        namespaces: string[],
        skipScan: string[],
        skipScanRe: string[],
        scanRe: string[],
        verbose: boolean,
        relDir?: string,
    }
): Result<CSharpClassSourceInfo[]> {
    let classes: CSharpClassSourceInfo[] = [];

    try {
        let dirPath = `${options.dirPath}`;
        dirPath = `${dirPath}${dirPath[dirPath.length - 1] !== '/' ? '/' : ''}`;
        let relDir = `${options.relDir ?? ''}`;
        relDir = `${relDir}${relDir && relDir[relDir.length - 1] !== '/' ? '/' : ''}`;
        const dirItems = readdirSync(`${dirPath}${relDir}`);
        const skipDir = relDir.startsWith(`.git`);

        let scanFiles = !options.scanRe.length || !!options.scanRe.find(e => {
            let re = new RegExp(e);
            return re.test(`${relDir}`);
        });

        if (scanFiles) {
            if (relDir) {
                options.verbose && console.log(`SUB DIR: ./${relDir}`);
            } else {
                options.verbose && console.log(`DIR: ${simplifyPath(dirPath)}`);
            }
        }
        if (skipDir) {
            options.verbose && console.log(`SKIP: ./${relDir}`);

        } else {
            for (const dirItem of dirItems) {

                const fullPath = simplifyPath(`${dirPath}${relDir}${dirItem}`);
                let itemRelPath = `${relDir}${dirItem}`;

                const status = statSync(fullPath);
                if (status.isDirectory()) {

                    let excluded = !!options.skipScan.find(e => e === itemRelPath);
                    excluded = excluded || !!options.skipScanRe.find(skipScanRe => {
                        let re = new RegExp(skipScanRe);
                        const skip = re.test(itemRelPath);
                        if (skip) {
                            console.log(`skipping due to rule ${skipScanRe}.  path: ${itemRelPath}`);
                        }
                        return skip;
                    });

                    // recurse
                    // options.verbose && console.log(`${fullPath} is a directory`);
                    if (excluded) {
                        options.verbose && console.log(`    DIR EXCLUDED`);
                    } else {
                        var dirResult = scanCSharpClasses({
                            ...options,
                            relDir: itemRelPath
                        });
                        if (dirResult.isSuccess) {
                            classes = classes.concat(dirResult.value);
                        }
                    }
                } else if (scanFiles && status.isFile()) {

                    if (hasCsExtension(itemRelPath)) {

                        let excluded = !!options.skipScan.find(e => e === itemRelPath);
                        // if (dirItem == 'ShopOrderItem.cs') {
                        // debugger;
                        // }
                        excluded = excluded || !!options.skipScanRe.find(e => {
                            let re = new RegExp(e);
                            return re.test(itemRelPath);
                        });
                        options.verbose && console.log(`    ${dirItem}`);
                        if (excluded) {
                            options.verbose && console.log(`        FILE EXCLUDED`);

                        } else {
                            options.verbose && console.log(`        getClassesInFile: ${fullPath}`);
                            let fileClasses = getClassesInFile(fullPath);
                            options.verbose && console.log(`        getClassesInFile - DONE`);

                            for (const cls of fileClasses) {
                                KnownClasses.addItem(cls);
                                classes.push(CSharpClassSourceInfo.Create(cls, dirItem, itemRelPath, fullPath));

                            }
                        }
                    }

                }

            }
        }

        return Result.CreateSuccess(classes);
    } catch (error) {
        return Result.CreateFailure(error, classes);
    }
}
export function hasCsExtension(filename: string) {
    return /.cs$/.test(filename.toLowerCase());
}

export function isClassInNamespaceExact(theClass: CSharpClass, reNamespace: string) {
    let re = new RegExp(`^${reNamespace}.${theClass.name}`, "i");
    let match = re.test(theClass.fullName);
    return match;
}

export function isClassInNamespace(theClass: CSharpClass, theNamespace: string) {

    theNamespace = theNamespace.split(`.`).join('\\.');
    let rePattern = `.*${theNamespace}\.${theClass.name}`;
    let re = new RegExp(rePattern, "i");
    let match = re.test(theClass.fullName);
    return match;
}

export function isClassInNamespaceList(theClass: CSharpClass, theNamespaces: string[]) {
    let match = theNamespaces.find(ns => isClassInNamespace(theClass, ns));

    return !!match;
}

export function getClassesInFile(csFilePath: string) {
    let csharpCode = getCsString(csFilePath);
    let emitter = new Emitter(csharpCode);
    let classes: CSharpClass[] = [];

    let options = <EmitOptions>{
        defaults: <DefaultEmitOptions>{
            classEmitOptions: {
                declare: true,
                perClassEmitOptions: (_classObject: CSharpClass) => {
                    classes.push(_classObject);
                    // DTO suffix
                    // this.type = new GeneratedTypeName(this.cSharpClass.name, 'dto');
                    let options: PerClassEmitOptions = {
                        // name: this.type.classifiedName,
                        name: 'TestNameDg',
                    };
                    return options;
                }
            },
            namespaceEmitOptions: {
                declare: false,
                skip: true
            },
        },
        file: {
            // // APPLY IMPORTS TO TYPESCRIPT HEADER
            // onBeforeEmit: (_file: CSharpFile, _typeScriptEmitter: TypeScriptEmitter) => {
            //     this.cSharpFile = _file;

            //     this.rawInterfaceCode = _typeScriptEmitter.output;
            // }
        }
    };
    let test = emitter.emit(options);
    // console.log(test);
    return classes;
}

function getCsString(filePath: string) {
    let code = readFileSync(filePath, { encoding: 'utf8' });

    return code;
}
export function simplifyPath(path: string) {
    return path
        .split('/')
        .reduce((memo, next) => {
            if (next == '..') {
                memo.pop();
            } else {
                memo.push(next);
            }
            return memo;
        }, [] as string[])
        .join('/');
}
export function dumpObject(o: object) {
    console.log(JSON.stringify(o, getCircularReplacer()));
}
function getCircularReplacer() {
    const seen = new WeakSet();
    return (key: any, value: any) => {
        if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
                return;
            }
            seen.add(value);
        }
        return value;
    };
};

export function asArray<T>(value: T | Array<T>): Array<T> {
    return Array.isArray(value) ? value : [value];
}

export function ifUndefined<T>(value: T | undefined, otherwise: T): T {
    return value === undefined ? otherwise : value;
}

export function getNamespaceParts(cs: CSharpClass | CSharpNamespace | CSharpFile): string[] {
    const isNamespace = cs instanceof CSharpNamespace;
    let parentSegments = [
        // parent segments
        ...(cs.parent ? getNamespaceParts(cs.parent) : []),
        // this segment
        ...(isNamespace ? [cs.name] : [])
    ];
    return parentSegments;
}
