"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSharpClassInfo = void 0;
const csharp_to_typescript_generator_1 = require("@fluffy-spoon/csharp-to-typescript-generator");
const model_utils_1 = require("./model-utils");
const NamespaceInfo_1 = require("./NamespaceInfo");
const Emitter_1 = require("@fluffy-spoon/csharp-to-typescript-generator/dist/src/Emitter");
const gen_model_model_1 = require("./gen-model.model");
const CSharpClassMemberInfo_1 = require("./CSharpClassMemberInfo");
const local_cache_1 = require("./local-cache");
class CSharpClassInfo {
    constructor() {
        this.classes = [];
        this.output = true;
    }
    includeInOutput(include) {
        this.output = include;
    }
    static Create(clsSource, nsInfo) {
        let info = new CSharpClassInfo();
        info.classes = [clsSource];
        info.namespace = CSharpClassInfo.getNamespace(clsSource.cls);
        info.namespaceInfo = nsInfo;
        return info;
    }
    addPartial(cls) {
        this.classes.push(cls);
    }
    generate() {
        let code = [
            `// CLASS: ${this.getClassName('class')} from ${this.namespace}`,
            this.genTsClassCode('interface'),
            this.genTsClassCode('class'),
            this.genTypescriptFieldNameLookup(),
            ``,
        ].join('\n');
        return code;
    }
    getClassName(target) {
        return `${target === 'interface' ? 'I' : ''}${this.classes[0].cls.name}`;
    }
    getFullClassName() {
        return `${this.classes[0].namespace}.${this.classes[0].nameWithGeneric}`;
    }
    isGeneric() {
        return !!this.classes.find(c => c.cls.genericParameters.length);
    }
    getFieldMaskName() {
        return `fld${this.getClassName('class')}`;
    }
    extractProps() {
        if (this.members === undefined) {
            // populate list of members
            this.members = this.getProps([]);
        }
    }
    getProps(genericParams) {
        let props = this.getBaseProps();
        for (const clsInfo of this.classes) {
            props = [
                ...props,
                ...this.extractMembers(clsInfo.cls.properties, genericParams),
                ...this.extractMembers(clsInfo.cls.fields, genericParams),
            ];
        }
        // de-duplicate
        let uniqueProps = props
            .reduce((memo, next) => {
            if (!memo.idx[next.name]) {
                memo.idx[next.name] = next;
                memo.list.push(next);
            }
            return memo;
        }, { idx: {}, list: [] });
        return uniqueProps.list;
    }
    getGenericParameters(baseInfo) {
        return [];
    }
    getBaseProps() {
        var _a;
        let baseProps = [];
        for (const clsSourceInfo of this.classes) {
            for (const inheritsFrom of (_a = clsSourceInfo.cls) === null || _a === void 0 ? void 0 : _a.inheritsFrom) {
                let typFullname = clsSourceInfo.getTypeFullname(inheritsFrom);
                if (typFullname) {
                    let baseInfo = local_cache_1.KnownClassInfos.lookupFullname(typFullname);
                    if (baseInfo) {
                        for (const clsInfo of baseInfo.classes) {
                            // handle generic type arguments here
                            let genericParams = inheritsFrom.genericParameters.map(e => e.name);
                            let nextProps = baseInfo.getProps(genericParams);
                            baseProps = [
                                ...baseProps,
                                ...nextProps,
                            ];
                        }
                    }
                }
            }
        }
        return baseProps;
    }
    extractMembers(items, genericArgs) {
        let genericMap = {};
        // if (this.getClassName('class') == 'CommentsByHourRequest') {
        //     debugger;
        // }
        if (genericArgs.length) {
            genericMap = genericArgs
                // .map((arg, i) => { return { e: arg, i }; })
                .reduce((memo, next, i) => {
                let param = this.classes[0].cls.genericParameters[i];
                let paramName = param.name.split(/[\<\>]/)[0];
                memo[paramName] = genericArgs[i];
                return memo;
            }, {});
        }
        return items
            .map(e => CSharpClassMemberInfo_1.CSharpClassMemberInfo.create(e, genericMap))
            .filter(e => !!e);
    }
    customCsToTypescript(clsInfo, level) {
        let lines = [];
        return lines.join('\n');
    }
    flufflyConvert(clsInfo) {
        let csharpCode = gen_model_model_1.getCsString(clsInfo.fileFullPath);
        let emitter = new Emitter_1.Emitter(csharpCode);
        let tsCode = '_not_found_';
        let options = {
            defaults: {
                classEmitOptions: {
                    declare: true,
                    perClassEmitOptions: (_classObject) => {
                        // this.cSharpClass = _classObject;
                        // // DTO suffix
                        // this.type = new GeneratedTypeName(this.cSharpClass.name, 'dto');
                        let options = {
                            name: this.getClassName('class'),
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
                    // this.cSharpFile = _file;
                    tsCode = _typeScriptEmitter.output;
                }
            }
        };
        emitter.emit(options);
        return tsCode;
    }
    genTsClassCode(target) {
        let lines = [
            // export class Invoice
            // export interface IInvoice
            `export ${target} ${this.getClassName(target)} {`,
            // Class Members
            model_utils_1.indentCode(this.members.map(m => m.genCode(this, target)).join('\n'), 1),
        ];
        if (target == 'class') {
            // Class.fromRaw()
            lines.push('', model_utils_1.indentCode(this.genFnFromRawCode(), 1));
            // Class.toRaw()
            lines.push('', model_utils_1.indentCode(this.genFnToRawCode(), 1));
        }
        lines.push(`}`);
        return lines.join('\n');
    }
    genFnFromRawCode() {
        let collectionFieldHydraters = this.members
            .filter(e => e.isCollection())
            .reduce((memo, next) => {
            memo.push(next.genFromRawHydrater());
            return memo;
        }, []);
        let fnBody = [
            `const e = new ${this.getClassName('class')}();`,
            `_.extend(e, raw);`,
            `// filter out non-owned properties`,
            `const mask = ${this.getFieldMaskName()};`,
            `Object.keys(e).forEach(key => {`,
            `${model_utils_1.CODE_INDENT}if (!mask.hasOwnProperty(key)) {`,
            `${model_utils_1.CODE_INDENT}${model_utils_1.CODE_INDENT}delete (e as any)[key];`,
            `${model_utils_1.CODE_INDENT}} `,
            `});`,
            ``,
            `// populate lists`,
            ...collectionFieldHydraters,
            ``,
            `return e;`,
        ].join('\n');
        let code = [
            `static fromRaw(raw: ${this.getClassName('interface')}) {`,
            model_utils_1.indentCode(fnBody, 1),
            `}`,
        ].join('\n');
        return code;
    }
    genFnToRawCode() {
        let collectionFieldHydraters = this.members
            // .filter(e => e.isCollection())
            .reduce((memo, next) => {
            memo.push(next.genToRawHydrater());
            return memo;
        }, []);
        let code = [
            `toRaw() {`,
            model_utils_1.indentCode([
                `const raw: ${this.getClassName('interface')} = {`,
                model_utils_1.indentCode(collectionFieldHydraters.join('\n'), 1),
                `};`,
                ``,
                `return raw;`,
            ].join('\n'), 1),
            `}`,
        ].join('\n');
        return code;
    }
    genTypescriptFieldNameLookup() {
        let test = this.classes[0];
        let members = this.members.reduce((memo, next) => {
            memo.push(next.genTypescriptLookupField());
            return memo;
        }, []);
        let lines = [
            `export const ${this.getFieldMaskName()} = {`,
            model_utils_1.indentCode(members.join('\n'), 1),
            `}`,
        ].join('\n');
        return lines;
    }
    static getNamespace(cs) {
        const nsParts = this.getNamespaceParts(cs);
        return nsParts.join(".");
    }
    static getCSharpFile(cs) {
        const nsParts = this.getNamespaceParts(cs);
        let parent = cs.parent;
        while (parent && !(parent instanceof csharp_to_typescript_generator_1.CSharpFile)) {
            parent = parent.parent;
        }
        return parent;
    }
    static getNamespaceParts(cs) {
        return model_utils_1.getNamespaceParts(cs);
    }
    getTypeFullname(typeName) {
        let fullname = this.classes.map(src => {
            let potentials = [
                `${this.namespace}.${typeName}`,
                ...src.csFile.usings
                    .map(using => `${NamespaceInfo_1.NamespaceInfo.getFullNamespace(using.namespace)}.${typeName}`),
            ];
            let match = potentials.find(e => local_cache_1.KnownClasses.lookupFullname(e));
            return match;
        }).find(e => !!e);
        return fullname;
    }
}
exports.CSharpClassInfo = CSharpClassInfo;
//# sourceMappingURL=CSharpClassInfo.js.map