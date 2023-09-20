"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCsString = exports.getClass = exports.GeneratedModel = exports.GeneratedTypeName = void 0;
const csharp_to_typescript_generator_1 = require("@fluffy-spoon/csharp-to-typescript-generator");
const _ = require("underscore");
const core_1 = require("@angular-devkit/core");
require("./schema");
const fs_1 = require("fs");
class GeneratedTypeName {
    constructor(csharpClassName, suffix) {
        this.csharpClassName = csharpClassName;
        this.dashedName = `${core_1.strings.dasherize(csharpClassName)}`;
        if (suffix) {
            this.dashedName = `${this.dashedName}-${suffix.toLowerCase()}`;
        }
        let dashedNameParts = this.dashedName.split('-');
        if (dashedNameParts[dashedNameParts.length - 1] === 'dto') {
            // dashedNameParts.pop(); // remove 'dto
        }
        this.dashedName = `${dashedNameParts.join('-')}`;
        this.modelFilename = `${this.dashedName}.model.ts`;
        this.classifiedName = `${core_1.strings.classify(this.dashedName)}`;
        this.classifiedInterfaceName = `I${this.classifiedName}`;
        // console.dir([csharpClassName, this.classifiedName]);
        // console.dir(this);
        // process.abort();
    }
    get fileNoExt() {
        let parts = this.modelFilename.split('.');
        if (parts.length) {
            parts.pop();
        }
        return parts.join('.');
    }
}
exports.GeneratedTypeName = GeneratedTypeName;
class GeneratedModel {
    constructor(filePath) {
        this.filePath = filePath;
        this.extractClassInfo();
    }
    extractClassInfo() {
        // console.log(`filePath: ${filePath}`);
        let csharpCode = getCsString(this.filePath);
        let emitter = new csharp_to_typescript_generator_1.Emitter(csharpCode);
        let options = {
            defaults: {
                classEmitOptions: {
                    declare: true,
                    perClassEmitOptions: (_classObject) => {
                        this.cSharpClass = _classObject;
                        // DTO suffix
                        this.type = new GeneratedTypeName(this.cSharpClass.name, 'dto');
                        let options = {
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
                onBeforeEmit: (_file, _typeScriptEmitter) => {
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
    getClassFunctions(_file) {
        let code = '';
        let cls = getClass(_file);
        if (cls) {
            let fns = [];
            fns.push(this.getFnFromRaw());
            fns.push(this.getFnToRaw());
            code = '\n' + fns.join('\n');
        }
        return code;
    }
    getFnFromRaw() {
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
    getFnFromRawProps() {
        return this.props.reduce((memo, prop) => {
            if (prop.model) {
                if (prop.isList) {
                    // e.purchaseOrderHistory = e.purchaseOrderHistory.map(i => PurchaseOrderHistoryDto.fromRaw(i));
                    memo += `\n    e.${prop.tsName} = e.${prop.tsName} && e.${prop.tsName}.map(i => ${prop.model.type.classifiedName}.fromRaw(i));`;
                }
                else {
                    // e.location = LocationDto.fromRaw(e.location);
                    memo += `\n    e.${prop.tsName} = e.${prop.tsName} && ${prop.model.type.classifiedName}.fromRaw(e.${prop.tsName});`;
                }
            }
            return memo;
        }, '');
    }
    getFnToRawProp(prop) {
        let indent = '      ';
        let fnPropToRaw = '';
        if (prop.model) {
            if (prop.isList) {
                fnPropToRaw = `${indent}${core_1.strings.camelize(prop.tsName)}: this.${prop.tsName} && this.${prop.tsName}.map(e => e.toRaw()),`;
            }
            else {
                fnPropToRaw = `${indent}${core_1.strings.camelize(prop.tsName)}: this.${prop.tsName} && this.${prop.tsName}.toRaw(),`;
            }
        }
        else if (prop.isTimestamp) {
            fnPropToRaw = `${indent}// ${core_1.strings.camelize(prop.tsName)}: this.${prop.tsName},`;
        }
        else {
            fnPropToRaw = `${indent}${core_1.strings.camelize(prop.tsName)}: this.${prop.tsName},`;
        }
        return fnPropToRaw;
    }
    getFnToRaw() {
        let fn = `
  toRaw() {
    const raw: ${this.type.classifiedInterfaceName} = {\n${_.reduce(this.props, (memo, prop) => {
            memo.push(this.getFnToRawProp(prop));
            return memo;
        }, []).join('\n')}
    };
    return raw;
  }`;
        return fn;
    }
    getTypeInfo(_prop) {
        // let isPrimitive
    }
    genModelCode(idxClassesByFilePath, allowNullable) {
        let code = this.genInterfaceCode(idxClassesByFilePath, allowNullable);
        let code2 = this.genClassCode(idxClassesByFilePath, allowNullable);
        let code3 = this.genFieldNames();
        return `${code}\n\n${code2}\n\n${code3}\n`;
    }
    genInterfaceCode(idxClassesByFilePath, allowNullable) {
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
    genClassCode(idxClassesByFilePath, allowNullable) {
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
            }
            else if (prop.isList) {
                // array initialiser
                let codeFrom = ` ${prop.tsName}: ${prop.tsClassType};`;
                let codeTo = ` ${prop.tsName}: ${prop.tsClassType} = [];`;
                // let re = new RegExp(` ${prop.tsName}:.*;`, "i");
                // let parts = code.split(/([ ]+stocktakeInvDetail: .*);/i)
                // classCode = classCode.split(` ${prop.tsName}:`).join(` // ${prop.tsName}:`);
                // console.log(`${this.type.classifiedName}.${prop.tsName} init ${prop.tsClassType}`);
                classCode = classCode.replace(` ${prop.tsName}: ${prop.tsClassType};`, ` ${prop.tsName}: ${prop.tsClassType} = [];`);
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
            parts[parts.length - 2] += `${this.getClassFunctions(this.cSharpFile)}\n`;
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
    enhancePropertyInfo(idxClassesByFilePath) {
        let models = _.chain(idxClassesByFilePath)
            .keys()
            .map(key => idxClassesByFilePath[key])
            .value();
        let parts = this.rawInterfaceCode.split("\n");
        this.props = parts
            .filter(part => /.*\:.*\;.*/.test(part))
            .map(prop => {
            let info = {
                tsName: "",
                tsTypeRaw: "",
                tsClassType: "",
                tsInterfaceType: "",
                isList: false,
                isNullable: false,
                isTimestamp: false,
                model: undefined,
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
                }
                else {
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
    getImports() {
        let imports = [];
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
        let uniqueList = imports.reduce((memo, _import) => {
            if (!memo.idx[_import]) {
                memo.idx[_import] = _import;
                memo.list.push(_import);
            }
            return memo;
        }, { idx: {}, list: [] });
        return uniqueList.list;
    }
    getImportsForNamespaces(namespaces) {
        let imports = [];
        imports = namespaces.reduce((memo, namespace) => {
            memo = memo.concat(this.getImportsForClasses(namespace.classes));
            memo = memo.concat(this.getImportsForNamespaces(namespace.namespaces));
            return memo;
        }, []);
        // console.dir(`imports 2: ${JSON.stringify(imports, null, 2)}`);
        return imports;
    }
    getImportsForClasses(classes) {
        let imports = [];
        imports = imports.concat(classes.reduce((memo, oneClass) => {
            memo = memo.concat(this.getImportsForClassProps(oneClass.properties));
            return memo;
        }, []));
        // console.dir(`imports 3: ${JSON.stringify(imports, null, 2)}`);
        return imports;
    }
    getImportsForClassProps(props) {
        let imports = props.reduce((memo, prop) => {
            memo = memo.concat(this.getImportsForTypes([prop.type]));
            return memo;
        }, []);
        // console.dir(`imports 4: ${JSON.stringify(imports, null, 2)}`);
        return imports;
    }
    getImportsForTypes(types) {
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
        }, []);
        // console.dir(`imports 5: ${JSON.stringify(imports, null, 2)}`);
        return imports;
    }
}
exports.GeneratedModel = GeneratedModel;
function getClass(parent) {
    if (parent.classes.length) {
        return parent.classes[0];
    }
    else if (parent.namespaces.length) {
        return getClass(parent.namespaces[0]);
    }
    return null;
}
exports.getClass = getClass;
function getCsString(filePath) {
    let code = fs_1.readFileSync(filePath, { encoding: 'utf8' });
    return code;
}
exports.getCsString = getCsString;
//# sourceMappingURL=gen-model.model.js.map