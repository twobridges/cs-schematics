"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOptions = exports.genModels = void 0;
const schematics_1 = require("@angular-devkit/schematics");
const workspace_1 = require("@schematics/angular/utility/workspace");
require("./schema");
const result_model_1 = require("../ddd/shared-kernel/functional-programming/result.model");
const model_utils_1 = require("./model-utils");
const TsOutputFile_1 = require("./TsOutputFile");
const NamespaceInfo_1 = require("./NamespaceInfo");
const local_cache_1 = require("./local-cache");
// import { Debug } from '../lib/debug';
//TODO: options for cs-path and ts-path
//2. set debugging for schematics
//test:
//schematics cs-schematics:gen-models --style=scss --project=blank --debug=false --force
// note: asyncronous schematics: https://medium.com/rocket-fuel/angular-schematics-asynchronous-schematics-dc998c0b6fba
// quote: Once we went diving into the Schematic’s source code we found that a rule can return either a Tree or an Observable<Tree>. Yes! Now our options are opening up. 
// quote: This means that we can make a rule that can wait for the observable to be marked as completed.
// DG: now we can return promise too:  
// source: /Users/deangrande/code/util/angular-cli/packages/angular_devkit/schematics/src/engine/interface.ts
// export type Rule = (
//     tree: Tree,
//     context: SchematicContext,
//   ) => Tree | Observable<Tree> | Rule | Promise<void | Rule> | void;
function genModels(options) {
    return (tree, _context) => __awaiter(this, void 0, void 0, function* () {
        // 1. Get Options
        let optionsResult = yield getOptions(tree, options);
        if (optionsResult.isFailure) {
            return stopError(optionsResult.error);
        }
        // 2. Scan C Sharp Files
        let classListResult = scanAndParse(options);
        if (classListResult.isFailure) {
            return stopError(classListResult.error);
        }
        // return dd(JSON.stringify(classListResult.value, null, 2));
        // 3. Prepare meta for generation (additional validations, normalisation, etc.)
        let nsResult = buildTypeInfos(classListResult.value);
        if (nsResult.isFailure) {
            return stopError(nsResult.error);
        }
        // 4. Update Known Types
        flagMatches(nsResult.value, options);
        // 5. Groups Classes by Output File
        let tsContentResult = TsOutputFile_1.createTsFileContainers(nsResult.value, options);
        if (nsResult.isFailure) {
            return stopError(tsContentResult.error);
        }
        // return dd(tsContentResult.value.map(e => e.dump()).join('\n'));
        // 6. generate and write content
        let rulesResult = generateContent(tree, options, tsContentResult.value);
        if (rulesResult.isFailure) {
            return stopError(rulesResult.error);
        }
        // note: rulesResult.value is usually empty, since modifications are made directoy to Tree (see outputContent)
        return schematics_1.chain(rulesResult.value);
    });
}
exports.genModels = genModels;
function flagMatches(nsResult, options) {
    let namespaces = model_utils_1.asArray(options.ns);
    let verbose = options.logging === 'verbose';
    verbose && console.log(`======== flagMatches ========`);
    nsResult.getAllClasses()
        .forEach(clsInfo => {
        let cls = clsInfo.classes[0].cls;
        let match;
        if (cls.genericParameters.length) {
            match = false;
        }
        else {
            match = model_utils_1.isClassInNamespaceList(cls, model_utils_1.asArray(namespaces));
        }
        clsInfo.includeInOutput(match);
        verbose && console.log(`${cls.fullName} - ${match ? 'MATCH' : 'NO MATCH'}`);
        if (match) {
            if (verbose) {
                console.log(`    Fields: ${clsInfo.members.reduce((memo, next) => {
                    memo.push(next.name);
                    return memo;
                }, []).join(', ')}`);
            }
        }
    });
    verbose && console.log(`======== done ========`);
}
function getOptions(host, options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!options.path) {
            return result_model_1.Result.CreateFailure("options - path is required", host);
        }
        if (!options.csPathRel && !options.csPathFull) {
            return result_model_1.Result.CreateFailure("options - csPathRel or csPathFull is required", host);
        }
        // ---- DEFAULT ---- 
        // build path relative to this file
        // TBC: this may not be right in production
        options.csPathFull = model_utils_1.ifUndefined(options.csPathFull, `${__dirname}${options.csPathRel}`);
        options.csPathFull = options.csPathFull.split('~').join(process.env.HOME);
        options.devMode = model_utils_1.ifUndefined(options.devMode, false);
        options.filePer = model_utils_1.ifUndefined(options.filePer, 'namespace');
        options.logging = model_utils_1.ifUndefined(options.logging, 'warnings');
        options.ns = model_utils_1.ifUndefined(options.ns, []);
        options.outputAs = model_utils_1.ifUndefined(options.outputAs, 'ts');
        options.recursive = model_utils_1.ifUndefined(options.recursive, true);
        options.skipScan = model_utils_1.ifUndefined(options.skipScan, []);
        options.skipScanRe = model_utils_1.ifUndefined(options.skipScanRe, []);
        options.scanRe = model_utils_1.ifUndefined(options.scanRe, []);
        if (options.devMode) {
        }
        else {
            const workspace = yield workspace_1.getWorkspace(host);
            const workspaceConfig = host.read('angular.json');
            if (!workspaceConfig) {
                return result_model_1.Result.CreateFailure("Not an Angular CLI workspace", host);
            }
            if (!options.project) {
                options.project = Object.keys(workspace.projects)[0];
            }
        }
        return result_model_1.Result.CreateSuccess(host);
    });
}
exports.getOptions = getOptions;
function scanAndParse(_options) {
    let classListResult = model_utils_1.scanCSharpClasses({
        dirPath: _options.csPathFull,
        namespaces: model_utils_1.asArray(_options.ns),
        skipScan: model_utils_1.asArray(_options.skipScan),
        skipScanRe: model_utils_1.asArray(_options.skipScanRe),
        scanRe: model_utils_1.asArray(_options.scanRe),
        verbose: _options.logging === 'verbose',
    });
    return classListResult;
}
function buildTypeInfos(classList) {
    let nsRoot = NamespaceInfo_1.NamespaceInfo.createRoot();
    try {
        // Create 
        for (const clsSource of classList) {
            const nsClass = nsRoot.getOrCreateNamespace(clsSource.namespace);
            nsClass.addClass(clsSource);
        }
        // cache class infos
        nsRoot.getAllClasses().forEach(clsInfo => local_cache_1.KnownClassInfos.addItem(clsInfo));
        // extract properties
        nsRoot.getAllClasses().forEach(clsInfo => {
            clsInfo.extractProps();
        });
        return result_model_1.Result.CreateSuccess(nsRoot);
    }
    catch (error) {
        return result_model_1.Result.CreateFailure(error, nsRoot);
    }
}
function generateContent(tree, options, tsFiles) {
    let rules = [];
    try {
        for (const tsFile of tsFiles) {
            const tsFilePath = `${options.path}/${tsFile.filename}`;
            if (tree.exists(tsFilePath)) {
                tree.delete(tsFilePath);
            }
            let content = tsFile.genContent(options);
            tree.create(tsFilePath, content);
            if (options.devMode) {
                console.log(content);
            }
        }
        return result_model_1.Result.CreateSuccess(rules);
    }
    catch (error) {
        return result_model_1.Result.CreateFailure(error, rules);
    }
}
function stopError(error) {
    console.log(error);
    // debugger;
    return schematics_1.noop();
}
function dd(message) {
    console.clear();
    console.log(message);
    // debugger;
    return schematics_1.noop();
}
function findProject(workspace, _options) {
    if (_options.project) {
        return workspace.projects.get(_options.project);
    }
}
function findWorkspace(_tree) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield workspace_1.getWorkspace(_tree);
        }
        catch (error) {
            throw "could not find workspace.  Have you supplied --project=? parmater";
        }
    });
}
function findPath(_options, _project) {
    let path = '';
    try {
        if (_options.path === undefined && _project) {
            path = workspace_1.buildDefaultPath(_project);
        }
        else {
            path = _options.path ? _options.path : '';
        }
    }
    catch (error) {
        return result_model_1.Result.CreateFailure(`Could not determine path!  Error: ${error}`, '');
    }
    return path
        ? result_model_1.Result.CreateSuccess(path)
        : result_model_1.Result.CreateFailure("ERROR - Path is not set.  Please specify 'path' or 'project' at command line.", '');
}
function findProjectPath(tree, _context, _options) {
    return __awaiter(this, void 0, void 0, function* () {
        // let path = '';
        // tree = await setupOptions(tree, _options);
        const workspace = yield findWorkspace(tree);
        const project = findProject(workspace, _options);
        // eg. path usually = /src/app
        const pathResult = findPath(_options, project);
        // if (pathResult.isSuccess) {
        //     return pathResult.value;
        // } else {
        //     return Result.CreateFailure("ERROR - Path is not set.  Please specify 'path' or 'project' at command line.", "");
        // }
        return pathResult;
    });
}
//# sourceMappingURL=index.js.map