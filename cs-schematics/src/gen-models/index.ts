import { Emitter, EmitOptions, FileEmitOptions, CSharpInterface, CSharpFile, CSharpType, CSharpClass, PerClassEmitOptions, CSharpNamespace, CSharpProperty } from '@fluffy-spoon/csharp-to-typescript-generator';
import * as _ from "underscore";
import {
    FileOperator, Rule, SchematicsException, SchematicContext, Tree,
    apply, applyTemplates, chain, forEach, mergeWith, move, noop, url, externalSchematic,
    filter,
    Source,
    OptionIsNotDefinedException
} from '@angular-devkit/schematics';
import { strings, json } from '@angular-devkit/core';
import { parseName } from "@schematics/angular/utility/parse-name";
import { buildRelativePath, findModuleFromOptions } from "@schematics/angular/utility/find-module";
import { validateName, validateHtmlSelector } from "@schematics/angular/utility/validation";
import { addDeclarationToModule, addExportToModule } from '@schematics/angular/utility/ast-utils';
import { InsertChange } from '@schematics/angular/utility/change';
import { buildDefaultPath, getWorkspace } from '@schematics/angular/utility/workspace';
import * as ts from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { applyLintFix } from '@schematics/angular/utility/lint-fix';


import "./schema";
import { DefaultEmitOptions } from '@fluffy-spoon/csharp-to-typescript-generator/dist/src/Emitter';
import { readFile, fstat, readdir, Dir, readFileSync, readdirSync } from "fs";
import * as path from "path";
import { TypeScriptEmitter } from '@fluffy-spoon/csharp-to-typescript-generator/dist/src/TypeScriptEmitter';
import { Logger } from "@fluffy-spoon/csharp-to-typescript-generator/dist/src/Logger";
import { WorkspaceDefinition, ProjectDefinition } from '@angular-devkit/core/src/workspace';
import { normalize } from "@angular-devkit/core";
import { Result } from '../ddd/shared-kernel/functional-programming/result.model';
import { asArray, dumpObject, scanCSharpClasses, ifUndefined, isClassInNamespaceList } from './model-utils';
import { createTsFileContainers as groupByOutputFiles, TsOutputFile } from "./TsOutputFile";
import { CSharpClassSourceInfo } from "./CSharpClassSourceInfo";
import { NamespaceInfo } from "./NamespaceInfo";
import { CSharpClassInfo } from "./CSharpClassInfo";
import { delay, result } from 'underscore';
import { GenModelOptions as GenModelOptions } from './schema';
import { dasherize } from '@angular-devkit/core/src/utils/strings';
import { KnownClassInfos } from './local-cache';

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
export function genModels(options: GenModelOptions): Rule {
    console.info('options:');
    console.dir(options);
    return async (tree: Tree, _context: SchematicContext) => {

        // 1. Get Options
        let optionsResult = await getOptions(tree, options);
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
        let tsContentResult = groupByOutputFiles(nsResult.value, options);
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
        return chain(rulesResult.value);

    };
}

function flagMatches(nsResult: NamespaceInfo, options: GenModelOptions) {
    let namespaces = asArray(options.ns);
    let verbose = options.logging === 'verbose';

    verbose && console.log(`======== flagMatches ========`);

    nsResult.getAllClasses()
        .forEach(clsInfo => {
            let cls = clsInfo.classes[0].cls;

            let match: boolean;
            if (cls.genericParameters.length) {
                match = false;
            } else {
                match = isClassInNamespaceList(cls, asArray(namespaces));
            }

            clsInfo.includeInOutput(match);

            verbose && console.log(`${cls.fullName} - ${match ? 'MATCH' : 'NO MATCH'}`);
            if (match) {
                if (verbose) {
                    console.log(`    Fields: ${clsInfo.members.reduce((memo, next) => {
                        memo.push(next.name);
                        return memo;
                    }, [] as string[]).join(', ')}`);
                }
            }
        });
    verbose && console.log(`======== done ========`);

}

export async function getOptions(host: Tree, options: GenModelOptions): Promise<Result<Tree>> {
    if (!options.path) {
        return Result.CreateFailure("options - path is required", host);
    }
    if (!options.csPathRel && !options.csPathFull) {
        return Result.CreateFailure("options - csPathRel or csPathFull is required", host);
    }
    // ---- DEFAULT ---- 
    // build path relative to this file
    // TBC: this may not be right in production
    options.csPathFull = ifUndefined(options.csPathFull, `${__dirname}${options.csPathRel}`);
    options.csPathFull = options.csPathFull.split('~').join(process.env.HOME);

    options.devMode = ifUndefined(options.devMode, false);
    options.filePer = ifUndefined(options.filePer, 'namespace');
    options.logging = ifUndefined(options.logging, 'warnings');
    options.ns = ifUndefined(options.ns, []);
    options.outputAs = ifUndefined(options.outputAs, 'ts');
    options.recursive = ifUndefined(options.recursive, true);
    options.skipScan = ifUndefined(options.skipScan, []);
    options.skipScanRe = ifUndefined(options.skipScanRe, []);
    options.scanRe = ifUndefined(options.scanRe, []);

    if (options.devMode) {

    } else {
        const workspace = await getWorkspace(host);
        const workspaceConfig = host.read('angular.json');

        if (!workspaceConfig) {
            return Result.CreateFailure("Not an Angular CLI workspace", host);
        }

        if (!options.project) {
            options.project = Object.keys(workspace.projects)[0];
        }
    }

    return Result.CreateSuccess(host);
}

function scanAndParse(_options: GenModelOptions) {
    let classListResult = scanCSharpClasses({
        dirPath: _options.csPathFull,
        namespaces: asArray(_options.ns),
        skipScan: asArray(_options.skipScan),
        skipScanRe: asArray(_options.skipScanRe),
        scanRe: asArray(_options.scanRe),
        verbose: _options.logging === 'verbose',
    });

    return classListResult;
}

function buildTypeInfos(classList: CSharpClassSourceInfo[]) {
    let nsRoot = NamespaceInfo.createRoot();

    try {
        // Create 
        for (const clsSource of classList) {
            const nsClass = nsRoot.getOrCreateNamespace(clsSource.namespace);
            nsClass.addClass(clsSource);
        }

        // cache class infos
        nsRoot.getAllClasses().forEach(clsInfo => KnownClassInfos.addItem(clsInfo));

        // extract properties
        nsRoot.getAllClasses().forEach(clsInfo => {
            clsInfo.extractProps()
        });

        return Result.CreateSuccess(nsRoot);
    } catch (error) {
        return Result.CreateFailure(error, nsRoot);
    }
}

function generateContent(tree: Tree, options: GenModelOptions, tsFiles: TsOutputFile[]) {
    let rules = [] as Rule[];

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

        return Result.CreateSuccess(rules);

    } catch (error) {
        return Result.CreateFailure(error, rules);

    }
}

function stopError(error: string): Rule {
    console.log(error);
    // debugger;
    return noop();
}

function dd(message: string): Rule {
    console.clear();
    console.log(message);
    // debugger;
    return noop();
}

function findProject(workspace: WorkspaceDefinition, _options: GenModelOptions) {
    if (_options.project) {
        return workspace.projects.get(_options.project as string);
    }
}

async function findWorkspace(_tree: Tree): Promise<WorkspaceDefinition> {
    try {
        return await getWorkspace(_tree);

    } catch (error) {
        throw "could not find workspace.  Have you supplied --project=? parmater";
    }
}

function findPath(_options: GenModelOptions, _project: ProjectDefinition | undefined): Result<string> {
    let path = '';

    try {
        if (_options.path === undefined && _project) {

            path = buildDefaultPath(_project);
        } else {
            path = _options.path ? _options.path : '';
        }

    } catch (error) {
        return Result.CreateFailure(`Could not determine path!  Error: ${error}`, '');

    }

    return path
        ? Result.CreateSuccess(path)
        : Result.CreateFailure("ERROR - Path is not set.  Please specify 'path' or 'project' at command line.", '');
}
async function findProjectPath(tree: Tree, _context: SchematicContext, _options: any): Promise<Result<string>> {
    // let path = '';
    // tree = await setupOptions(tree, _options);
    const workspace = await findWorkspace(tree);
    const project = findProject(workspace, _options);

    // eg. path usually = /src/app
    const pathResult = findPath(_options, project);

    // if (pathResult.isSuccess) {
    //     return pathResult.value;
    // } else {
    //     return Result.CreateFailure("ERROR - Path is not set.  Please specify 'path' or 'project' at command line.", "");
    // }
    return pathResult;
}
