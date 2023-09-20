"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNamespaceParts = exports.ifUndefined = exports.asArray = exports.dumpObject = exports.simplifyPath = exports.getClassesInFile = exports.isClassInNamespaceList = exports.isClassInNamespace = exports.isClassInNamespaceExact = exports.hasCsExtension = exports.scanCSharpClasses = exports.indentCode = exports.CODE_INDENT = void 0;
const csharp_to_typescript_generator_1 = require("@fluffy-spoon/csharp-to-typescript-generator");
const fs_1 = require("fs");
const result_model_1 = require("../ddd/shared-kernel/functional-programming/result.model");
const CSharpClassSourceInfo_1 = require("./CSharpClassSourceInfo");
const local_cache_1 = require("./local-cache");
exports.CODE_INDENT = '  ';
function indentCode(code, levels) {
    return `${exports.CODE_INDENT.repeat(levels)}${code.split('\n').join('\n' + exports.CODE_INDENT.repeat(levels))}`;
}
exports.indentCode = indentCode;
/**
 *
 * @param dtoPath
 */
function scanCSharpClasses(options) {
    var _a;
    let classes = [];
    try {
        let dirPath = `${options.dirPath}`;
        dirPath = `${dirPath}${dirPath[dirPath.length - 1] !== '/' ? '/' : ''}`;
        let relDir = `${(_a = options.relDir) !== null && _a !== void 0 ? _a : ''}`;
        relDir = `${relDir}${relDir && relDir[relDir.length - 1] !== '/' ? '/' : ''}`;
        const dirItems = fs_1.readdirSync(`${dirPath}${relDir}`);
        const skipDir = relDir.startsWith(`.git`);
        let scanFiles = !options.scanRe.length || !!options.scanRe.find(e => {
            let re = new RegExp(e);
            return re.test(`${relDir}`);
        });
        if (scanFiles) {
            if (relDir) {
                options.verbose && console.log(`SUB DIR: ./${relDir}`);
            }
            else {
                options.verbose && console.log(`DIR: ${simplifyPath(dirPath)}`);
            }
        }
        if (skipDir) {
            options.verbose && console.log(`SKIP: ./${relDir}`);
        }
        else {
            for (const dirItem of dirItems) {
                const fullPath = simplifyPath(`${dirPath}${relDir}${dirItem}`);
                let itemRelPath = `${relDir}${dirItem}`;
                const status = fs_1.statSync(fullPath);
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
                    }
                    else {
                        var dirResult = scanCSharpClasses(Object.assign(Object.assign({}, options), { relDir: itemRelPath }));
                        if (dirResult.isSuccess) {
                            classes = classes.concat(dirResult.value);
                        }
                    }
                }
                else if (scanFiles && status.isFile()) {
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
                        }
                        else {
                            options.verbose && console.log(`        getClassesInFile: ${fullPath}`);
                            let fileClasses = getClassesInFile(fullPath);
                            options.verbose && console.log(`        getClassesInFile - DONE`);
                            for (const cls of fileClasses) {
                                local_cache_1.KnownClasses.addItem(cls);
                                classes.push(CSharpClassSourceInfo_1.CSharpClassSourceInfo.Create(cls, dirItem, itemRelPath, fullPath));
                            }
                        }
                    }
                }
            }
        }
        return result_model_1.Result.CreateSuccess(classes);
    }
    catch (error) {
        return result_model_1.Result.CreateFailure(error, classes);
    }
}
exports.scanCSharpClasses = scanCSharpClasses;
function hasCsExtension(filename) {
    return /.cs$/.test(filename.toLowerCase());
}
exports.hasCsExtension = hasCsExtension;
function isClassInNamespaceExact(theClass, reNamespace) {
    let re = new RegExp(`^${reNamespace}.${theClass.name}`, "i");
    let match = re.test(theClass.fullName);
    return match;
}
exports.isClassInNamespaceExact = isClassInNamespaceExact;
function isClassInNamespace(theClass, theNamespace) {
    theNamespace = theNamespace.split(`.`).join('\\.');
    let rePattern = `.*${theNamespace}\.${theClass.name}`;
    let re = new RegExp(rePattern, "i");
    let match = re.test(theClass.fullName);
    return match;
}
exports.isClassInNamespace = isClassInNamespace;
function isClassInNamespaceList(theClass, theNamespaces) {
    let match = theNamespaces.find(ns => isClassInNamespace(theClass, ns));
    return !!match;
}
exports.isClassInNamespaceList = isClassInNamespaceList;
function getClassesInFile(csFilePath) {
    let csharpCode = getCsString(csFilePath);
    let emitter = new csharp_to_typescript_generator_1.Emitter(csharpCode);
    let classes = [];
    let options = {
        defaults: {
            classEmitOptions: {
                declare: true,
                perClassEmitOptions: (_classObject) => {
                    classes.push(_classObject);
                    // DTO suffix
                    // this.type = new GeneratedTypeName(this.cSharpClass.name, 'dto');
                    let options = {
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
exports.getClassesInFile = getClassesInFile;
function getCsString(filePath) {
    let code = fs_1.readFileSync(filePath, { encoding: 'utf8' });
    return code;
}
function simplifyPath(path) {
    return path
        .split('/')
        .reduce((memo, next) => {
        if (next == '..') {
            memo.pop();
        }
        else {
            memo.push(next);
        }
        return memo;
    }, [])
        .join('/');
}
exports.simplifyPath = simplifyPath;
function dumpObject(o) {
    console.log(JSON.stringify(o, getCircularReplacer()));
}
exports.dumpObject = dumpObject;
function getCircularReplacer() {
    const seen = new WeakSet();
    return (key, value) => {
        if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
                return;
            }
            seen.add(value);
        }
        return value;
    };
}
;
function asArray(value) {
    return Array.isArray(value) ? value : [value];
}
exports.asArray = asArray;
function ifUndefined(value, otherwise) {
    return value === undefined ? otherwise : value;
}
exports.ifUndefined = ifUndefined;
function getNamespaceParts(cs) {
    const isNamespace = cs instanceof csharp_to_typescript_generator_1.CSharpNamespace;
    let parentSegments = [
        // parent segments
        ...(cs.parent ? getNamespaceParts(cs.parent) : []),
        // this segment
        ...(isNamespace ? [cs.name] : [])
    ];
    return parentSegments;
}
exports.getNamespaceParts = getNamespaceParts;
//# sourceMappingURL=model-utils.js.map