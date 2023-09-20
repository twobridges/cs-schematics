import { Emitter, EmitOptions, FileEmitOptions, CSharpInterface, CSharpFile, CSharpType, CSharpClass, PerClassEmitOptions, CSharpNamespace, CSharpProperty } from '@fluffy-spoon/csharp-to-typescript-generator';
import * as _ from "underscore";
import {
    FileOperator, Rule, SchematicsException, SchematicContext, Tree,
    apply, applyTemplates, chain, forEach, mergeWith, move, noop, url, externalSchematic,
    filter,
    Source
} from '@angular-devkit/schematics';
import { strings, json } from '@angular-devkit/core';
import { parseName } from "@schematics/angular/utility/parse-name";
import { findModuleFromOptions } from "@schematics/angular/utility/find-module";
import { validateName, validateHtmlSelector } from "@schematics/angular/utility/validation";
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
import { insertAfterLastOccurrence } from '@schematics/angular/utility/ast-utils';
import { Result } from '../ddd/shared-kernel/functional-programming/result.model';
import { GenModelOptions } from './schema';


export class GeneratedTypeName {
    classifiedName: string;
    classifiedInterfaceName: string;
    modelFilename: string;
    dashedName: string;

    constructor(public csharpClassName: string, suffix: string) {
        this.dashedName = `${strings.dasherize(csharpClassName)}`;
        if (suffix) {
            this.dashedName = `${this.dashedName}-${suffix.toLowerCase()}`;
        }
        let dashedNameParts = this.dashedName.split('-');
        if (dashedNameParts[dashedNameParts.length - 1] === 'dto') {
            // dashedNameParts.pop(); // remove 'dto
        }

        this.dashedName = `${dashedNameParts.join('-')}`;
        this.modelFilename = `${this.dashedName}.model.ts`;
        this.classifiedName = `${strings.classify(this.dashedName)}`;
        this.classifiedInterfaceName = `I${this.classifiedName}`;
        // console.dir([csharpClassName, this.classifiedName]);
        // console.dir(this);
        // process.abort();
    }

    get fileNoExt(): string {
        let parts = this.modelFilename.split('.');
        if (parts.length) {
            parts.pop();
        }
        return parts.join('.');
    }
}

export class GeneratedModel {

    type: GeneratedTypeName;
    code: string;
    cSharpClass: CSharpClass;
    cSharpClassName: string;
    rawInterfaceCode: string; // First-pass interface.  Unnormalised
    private _interfaceCode: string; // First-pass interface.  Unnormalised
    cSharpFile: CSharpFile;
    props: GenModelPropInfo[];

    constructor(public filePath: string) {
        this.extractClassInfo()
    }

    private extractClassInfo() {
        // console.log(`filePath: ${filePath}`);

        let csharpCode = getCsString(this.filePath);
        let emitter = new Emitter(csharpCode);

        let options = <EmitOptions>{
            defaults: <DefaultEmitOptions>{
                classEmitOptions: {
                    declare: true,
                    perClassEmitOptions: (_classObject: CSharpClass) => {
                        this.cSharpClass = _classObject;
                        // DTO suffix
                        this.type = new GeneratedTypeName(this.cSharpClass.name, 'dto');
                        let options: PerClassEmitOptions = {
                            name: this.type.classifiedName,
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
                // APPLY IMPORTS TO TYPESCRIPT HEADER
                onBeforeEmit: (_file: CSharpFile, _typeScriptEmitter: TypeScriptEmitter) => {
                    this.cSharpFile = _file;

                    this.rawInterfaceCode = _typeScriptEmitter.output;
                }
            }
        };
        emitter.emit(options);
    }

    /**
     * Prepend typescript import statement for each referenced Class
     * @param _file
     */
    getClassFunctions(_file: CSharpFile) {
        let code = '';
        let cls = getClass(_file);
        if (cls) {
            let fns = [] as string[];
            fns.push(this.getFnFromRaw());
            fns.push(this.getFnToRaw());
            code = '\n' + fns.join('\n');
        }
        return code;
    }

    private getFnFromRaw() {
        let fn = `  static fromRaw(raw: ${this.type.classifiedInterfaceName}) {
    const e = new ${this.type.classifiedName}();
    _.extend(e, raw);

    // filter own props
    const mask = fld${this.type.classifiedName};
    Object.keys(e).forEach(key => {
      if (!mask.hasOwnProperty(key)) {
        delete (e as any)[key];
      } 
    });

    // populate lists${this.getFnFromRawProps()}
    return e;
  }`;
        return fn;
    }

    private getFnFromRawProps() {
        return this.props.reduce((memo, prop) => {
            if (prop.model) {
                if (prop.isList) {
                    // e.purchaseOrderHistory = e.purchaseOrderHistory.map(i => PurchaseOrderHistoryDto.fromRaw(i));
                    memo += `\n    e.${prop.tsName} = e.${prop.tsName} && e.${prop.tsName}.map(i => ${prop.model.type.classifiedName}.fromRaw(i));`;
                } else {
                    // e.location = LocationDto.fromRaw(e.location);
                    memo += `\n    e.${prop.tsName} = e.${prop.tsName} && ${prop.model.type.classifiedName}.fromRaw(e.${prop.tsName});`;
                }
            }
            return memo;
        }, '');
    }

    private getFnToRawProp(prop: GenModelPropInfo) {
        let indent = '      ';
        let fnPropToRaw = '';
        if (prop.model) {
            if (prop.isList) {
                fnPropToRaw = `${indent}${strings.camelize(prop.tsName)}: this.${prop.tsName} && this.${prop.tsName}.map(e => e.toRaw()),`;

            } else {
                fnPropToRaw = `${indent}${strings.camelize(prop.tsName)}: this.${prop.tsName} && this.${prop.tsName}.toRaw(),`;

            }
        } else if (prop.isTimestamp) {
            fnPropToRaw = `${indent}// ${strings.camelize(prop.tsName)}: this.${prop.tsName},`;

        } else {
            fnPropToRaw = `${indent}${strings.camelize(prop.tsName)}: this.${prop.tsName},`;

        }
        return fnPropToRaw;
    }
    private getFnToRaw() {
        let fn = `
  toRaw() {
    const raw: ${this.type.classifiedInterfaceName} = {\n${_.reduce(this.props, (memo, prop) => {
            memo.push(this.getFnToRawProp(prop));
            return memo;
        }, [] as string[]).join('\n')}
    };
    return raw;
  }`;

        return fn;
    }

    getTypeInfo(_prop: CSharpProperty) {
        // let isPrimitive
    }

    genModelCode(idxClassesByFilePath: _.Dictionary<GeneratedModel>, allowNullable: boolean) {
        let code = this.genInterfaceCode(idxClassesByFilePath, allowNullable);
        let code2 = this.genClassCode(idxClassesByFilePath, allowNullable);
        let code3 = this.genFieldNames();
        return `${code}\n\n${code2}\n\n${code3}\n`;
    }

    genInterfaceCode(idxClassesByFilePath: _.Dictionary<GeneratedModel>, allowNullable: boolean) {
        if (!this._interfaceCode) {
            let imports = this.getImports();
            if (this.type.classifiedName == 'LocationDto') {
                // console.dir(imports);
                // process.abort();
            }

            let interfaceCode = this.rawInterfaceCode.split("    ").join("  ");
            if (!allowNullable) {
                interfaceCode = interfaceCode.split("?: ").join(": ");
            }
            interfaceCode = interfaceCode.split("declare interface ").join("export interface ");
            interfaceCode = interfaceCode.replace(this.type.classifiedName, this.type.classifiedInterfaceName);
            // console.dir(interfaceCode);
            // process.abort();

            if (this.cSharpClass) {

                _.keys(idxClassesByFilePath).forEach(classKey => {
                    let model = idxClassesByFilePath[classKey];
                    // console.dir(interfaceCode);
                    // console.dir(model.type);
                    // process.abort();

                    // Nav Property: replace csharp class name with tsInteface Name
                    if (this.type.csharpClassName == 'Location') {
                        // console.dir(`${model.type.csharpClassName} > ${model.type.classifiedInterfaceName}`);

                        // process.abort();
                    }

                    interfaceCode = interfaceCode.split(`: ${model.type.csharpClassName};`)
                        .join(`: ${model.type.classifiedInterfaceName};`);

                    // List: replace csharp class name with tsInteface Name
                    interfaceCode = interfaceCode.split(`<${model.type.csharpClassName}>;`)
                        .join(`<${model.type.classifiedInterfaceName}>;`);


                    // interfaceCode += `${model.type.classifiedName}/${model.type.classifiedInterfaceName}\n`;
                });

                this.props.forEach(prop => {

                    if (prop.isTimestamp) {
                        // comment out timestamp fields
                        interfaceCode = interfaceCode.split(` ${prop.tsName}:`).join(` // ${prop.tsName}:`);
                    }
                });
                // this.cSharpClass.properties.forEach(prop => {
                //   interfaceCode += `\nprop.name: ${prop.type.fullName}`;
                // });
            }

            if (imports.length) {
                interfaceCode = `${imports.join("\n")}\n${interfaceCode}`;
            }
            // if (this.type.csharpClassName == 'Location') {
            //   console.dir(`${interfaceCode}`);

            //   process.abort();
            // }

            // console.log(interfaceCode);
            // console.dir(imports);
            // process.abort();

            this._interfaceCode = interfaceCode;
        }

        return this._interfaceCode;
    }

    genClassCode(idxClassesByFilePath: _.Dictionary<GeneratedModel>, allowNullable: boolean) {
        let classCode = this.rawInterfaceCode;
        classCode = classCode.replace("declare interface", "export class");
        classCode = classCode.split("    ").join("  ");

        if (!allowNullable) {
            classCode = classCode.split("?:").join(":");
        }

        // TODO: determine why the Class Prop types are not include the SUFFIX here:::::::
        // probably needs a transformation like the Interface GEn
        this.props.forEach(prop => {

            if (prop.tsTypeRaw == "Array<byte>") {
                // comment out byte array props (mssql timestamp)
                classCode = classCode.split(` ${prop.tsName}:`).join(` // ${prop.tsName}:`);

            } else if (prop.isList) {
                // array initialiser
                let codeFrom = ` ${prop.tsName}: ${prop.tsClassType};`;
                let codeTo = ` ${prop.tsName}: ${prop.tsClassType} = [];`;

                // let re = new RegExp(` ${prop.tsName}:.*;`, "i");
                // let parts = code.split(/([ ]+stocktakeInvDetail: .*);/i)
                // classCode = classCode.split(` ${prop.tsName}:`).join(` // ${prop.tsName}:`);
                // console.log(`${this.type.classifiedName}.${prop.tsName} init ${prop.tsClassType}`);
                classCode = classCode.replace(
                    ` ${prop.tsName}: ${prop.tsClassType};`,
                    ` ${prop.tsName}: ${prop.tsClassType} = [];`
                );
            }
        });

        _.keys(idxClassesByFilePath).forEach(classKey => {
            let model = idxClassesByFilePath[classKey];
            // console.dir(interfaceCode);
            // console.dir(model.type);
            // process.abort();

            // Nav Property: replace csharp class name with tsInteface Name
            if (this.type.csharpClassName == 'Location') {
                // console.dir(`${model.type.csharpClassName} > ${model.type.classifiedName}`);

                // process.abort();
            }

            classCode = classCode.split(`: ${model.type.csharpClassName};`)
                .join(`: ${model.type.classifiedName};`);

            // List: replace csharp class name with tsInteface Name
            classCode = classCode.split(`<${model.type.csharpClassName}>`)
                .join(`<${model.type.classifiedName}>`);


            // interfaceCode += `${model.type.classifiedName}/${model.type.classifiedInterfaceName}\n`;
        });

        // if (this.type.csharpClassName == 'Location') {
        //   // console.dir(`${model.type.csharpClassName} > ${model.type.classifiedName}`);
        //   console.dir(classCode);
        //   process.abort();
        // }
        let parts = classCode.split("}");
        if (parts.length > 1) {
            parts[parts.length - 2] += `${this.getClassFunctions(this.cSharpFile)}\n`
        }

        classCode = parts.join("}") + "\n";

        // if (this.type.csharpClassName == 'Location') {
        //   // console.dir(`${model.type.csharpClassName} > ${model.type.classifiedName}`);
        //   console.dir(classCode);
        //   process.abort();
        // }
        return classCode;
    }

    genFieldNames() {
        let propCode = this.props.map(prop => `  ${prop.tsName}: '${prop.tsName}',`).join("\n");

        let code = `export const fld${this.type.classifiedName} = {
${propCode}
};`;

        return code;
    }

    enhancePropertyInfo(idxClassesByFilePath: _.Dictionary<GeneratedModel>) {
        let models = _.chain(idxClassesByFilePath)
            .keys()
            .map(key => idxClassesByFilePath[key])
            .value();
        let parts = this.rawInterfaceCode.split("\n");
        this.props = parts
            .filter(part => /.*\:.*\;.*/.test(part))
            .map(prop => {
                let info: GenModelPropInfo = {
                    tsName: "",
                    tsTypeRaw: "",
                    tsClassType: "",
                    tsInterfaceType: "",
                    isList: false,
                    isNullable: false,
                    isTimestamp: false,
                    model: undefined as (GeneratedModel | undefined),
                    modelInclude: ""
                };

                let propParts = /([ ]+)([^?]*)([?]?)\:([ ]?)(.*)\;.*/.exec(prop);
                if (propParts) {
                    info.tsName = propParts[2];
                    info.isNullable = !!propParts[3];
                    info.tsTypeRaw = propParts[5];
                    info.isTimestamp = info.tsTypeRaw == "Array<byte>";
                    info.tsClassType = info.tsTypeRaw;
                    info.tsInterfaceType = `I${info.tsTypeRaw}`;

                    if (this.type.csharpClassName == 'Location') {

                        // console.dir(info);
                        // process.abort();

                    }
                    // let arrayParts = /Array\<(.*)\>/.exec(info.tsTypeRaw);
                    let arrayParts = /Array\<(.*)\>/.exec(info.tsTypeRaw);
                    if (arrayParts !== null) {
                        info.isList = true;
                        info.model = models.find(model => arrayParts && model.type.csharpClassName == arrayParts[1]);
                        // console.log(`${this.type.classifiedName} - ${info.tsName} as List<${info.model ? info.model.type.classifiedName : '?'}>`);
                    } else {
                        // NAV PROPERTY: csharpClassName == tsTypeRaw (before suffix is added)
                        info.model = models.find(model => model.type.csharpClassName == info.tsTypeRaw);
                        // console.log(`${this.type.classifiedName} - ${info.tsName} as ${info.tsTypeRaw}`);
                    }
                    if (info.model) {
                        info.modelInclude = `import { ${info.model.type.classifiedInterfaceName}, ${info.model.type.classifiedName} } from './${info.model.type.fileNoExt}';`;
                    }
                }
                return info;
            })
            .filter(part => !!part);
        if (this.type.csharpClassName == 'Location') {
            // console.dir(this.props.map(p => p.model?.type));
            // process.abort();

        }
        // this.props.forEach(info => {
        //   let modelTests = [] as string[];
        //   modelTests.push("SubsidiaryLocationMapDto");
        //   // modelTests.push("UnitsTypeDto");
        //   if (_.contains(modelTests, this.type.classifiedName)) {
        //     console.dir({
        //       classifiedName: this.type.classifiedName,
        //       propName: info.tsName,
        //       propList: info.isList ? 'List<>' : '',
        //       propOptional: info.isNullable ? 'nullable' : '',
        //       propModel: info.model ? info.model.type.classifiedName : '',
        //       propModelInclude: info.modelInclude
        //     });
        //   }
        // });
    }

    /**
     * Prepend typescript import statement for each referenced Class
     * @param _file
     */
    getImports(): string[] {
        let imports: string[] = [];

        this.props.forEach(prop => {
            if (prop.model) {
                if (prop.model.type.csharpClassName != this.type.csharpClassName) {
                    imports.push(prop.modelInclude);
                }
            }
        });
        // 
        if (this.type.csharpClassName == 'Location') {
            // console.log(this.type.csharpClassName);
            // console.dir(this.props.map(prop => prop.model?.type));
            // process.abort();
        }

        // imports = imports.concat(this.getImportsForClasses(this.cSharpFile.classes));
        // imports = imports.concat(this.getImportsForNamespaces(this.cSharpFile.namespaces));

        let uniqueList = imports.reduce(
            (memo, _import) => {
                if (!memo.idx[_import]) {
                    memo.idx[_import] = _import;
                    memo.list.push(_import);
                }
                return memo;
            },
            { idx: {} as { [id: string]: string; }, list: [] as string[] }
        );
        return uniqueList.list;
    }

    getImportsForNamespaces(namespaces: CSharpNamespace[]): string[] {
        let imports: string[] = [];

        imports = namespaces.reduce((memo, namespace) => {

            memo = memo.concat(
                this.getImportsForClasses(namespace.classes)
            );

            memo = memo.concat(
                this.getImportsForNamespaces(namespace.namespaces)
            );
            return memo;
        }, [] as string[]);
        // console.dir(`imports 2: ${JSON.stringify(imports, null, 2)}`);

        return imports;
    }

    getImportsForClasses(classes: CSharpClass[]): string[] {
        let imports: string[] = [];
        imports = imports.concat(
            classes.reduce((memo, oneClass) => {
                memo = memo.concat(this.getImportsForClassProps(oneClass.properties));
                return memo;
            }, [] as string[])
        );
        // console.dir(`imports 3: ${JSON.stringify(imports, null, 2)}`);

        return imports;
    }

    getImportsForClassProps(props: CSharpProperty[]): string[] {
        let imports = props.reduce((memo, prop) => {

            memo = memo.concat(this.getImportsForTypes([prop.type]));

            return memo;
        }, [] as string[])
        // console.dir(`imports 4: ${JSON.stringify(imports, null, 2)}`);

        return imports;
    }

    getImportsForTypes(types: CSharpType[]): string[] {
        let imports = types.reduce((memo, _type) => {
            // console.dir([_type.name, /.*dto$/i.test(_type.name)]);
            // TODO: fix this because we're now using POCOs

            if (/.*dto$/i.test(_type.name)) {
                // console.log(`new GeneratedTypeName(${_type.name})`);
                let gen = new GeneratedTypeName(_type.name, "");
                memo = memo.concat([`import { ${gen.classifiedName}, ${gen.classifiedInterfaceName} } from './${gen.fileNoExt}';`]);
            }

            // add generic params, if applicable
            memo = memo.concat(this.getImportsForTypes(_type.genericParameters));

            return memo;
        }, [] as string[])
        // console.dir(`imports 5: ${JSON.stringify(imports, null, 2)}`);

        return imports;
    }

}

export interface GenModelPropInfo {
    tsName: string;
    tsTypeRaw: string;
    tsInterfaceType: string;
    tsClassType: string;
    isList: boolean;
    isNullable: boolean;
    isTimestamp: boolean;
    model?: GeneratedModel;
    modelInclude: string;
}

export function getClass(parent: CSharpFile | CSharpNamespace): CSharpClass | null {
    if (parent.classes.length) {
        return parent.classes[0];
    } else if (parent.namespaces.length) {
        return getClass(parent.namespaces[0]);
    }
    return null;
}

export function getCsString(filePath: string) {
    let code = readFileSync(filePath, { encoding: 'utf8' });

    return code;
}
