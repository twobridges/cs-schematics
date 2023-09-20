import { CSharpClass, CSharpField, CSharpFile, CSharpNamespace, CSharpProperty, CSharpType, EmitOptions, PerClassEmitOptions } from "@fluffy-spoon/csharp-to-typescript-generator";
import { CODE_INDENT, getNamespaceParts, indentCode, isClassInNamespaceList } from "./model-utils";
import { CSharpClassSourceInfo } from "./CSharpClassSourceInfo";
import { NamespaceInfo } from "./NamespaceInfo";
import { DefaultEmitOptions, Emitter } from "@fluffy-spoon/csharp-to-typescript-generator/dist/src/Emitter";
import { TypeScriptEmitter } from "@fluffy-spoon/csharp-to-typescript-generator/dist/src/TypeScriptEmitter";
import _ = require("underscore");
import { getCsString } from "./gen-model.model";
import { classify } from "@angular-devkit/core/src/utils/strings";
import { Result } from "../ddd/shared-kernel/functional-programming/result.model";
import { CSharpClassMemberInfo } from "./CSharpClassMemberInfo";
import { KnownClasses, KnownClassInfos } from "./local-cache";

export type TargetType = 'class' | 'interface';

export class CSharpClassInfo {
    classes: CSharpClassSourceInfo[] = [];
    namespace: string;
    namespaceInfo: NamespaceInfo;
    members: CSharpClassMemberInfo[];
    output = true;

    includeInOutput(include: boolean) {
        this.output = include;
    }

    static Create(clsSource: CSharpClassSourceInfo, nsInfo: NamespaceInfo) {
        let info = new CSharpClassInfo();
        info.classes = [clsSource];
        info.namespace = CSharpClassInfo.getNamespace(clsSource.cls);

        info.namespaceInfo = nsInfo;

        return info;
    }
    addPartial(cls: CSharpClassSourceInfo) {
        this.classes.push(cls);
    }

    generate(): string {

        let code = [
            `// CLASS: ${this.getClassName('class')} from ${this.namespace}`,
            this.genTsClassCode('interface'),
            this.genTsClassCode('class'),
            this.genTypescriptFieldNameLookup(),
            ``,
        ].join('\n');

        return code;
    }

    getClassName(target: TargetType) {
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

    getProps(genericParams: string[]) {

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
            }, { idx: {} as { [name: string]: CSharpClassMemberInfo }, list: [] as CSharpClassMemberInfo[] });

        return uniqueProps.list;
    }

    getGenericParameters(baseInfo: CSharpClassInfo) {
        return [] as string[];
    }

    getBaseProps() {
        let baseProps = [] as CSharpClassMemberInfo[];
        for (const clsSourceInfo of this.classes) {

            for (const inheritsFrom of clsSourceInfo.cls?.inheritsFrom) {

                let typFullname = clsSourceInfo.getTypeFullname(inheritsFrom);

                if (typFullname) {
                    let baseInfo = KnownClassInfos.lookupFullname(typFullname);
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

    private extractMembers(items: Array<CSharpProperty | CSharpField>, genericArgs: string[]) {
        let genericMap = {} as { [name: string]: string };
        // if (this.getClassName('class') == 'CommentsByHourRequest') {
        //     debugger;
        // }
        if (genericArgs.length) {

            genericMap = genericArgs
                // .map((arg, i) => { return { e: arg, i }; })
                .reduce(
                    (memo, next, i) => {

                        let param = this.classes[0].cls.genericParameters[i];
                        let paramName = param.name.split(/[\<\>]/)[0];
                        memo[paramName] = genericArgs[i];
                        return memo;
                    },
                    {} as { [name: string]: string }
                );

        }
        return items
            .map(e => CSharpClassMemberInfo.create(e, genericMap))
            .filter(e => !!e) as CSharpClassMemberInfo[];

    }

    customCsToTypescript(clsInfo: CSharpClassSourceInfo, level: number) {
        let lines: string[] = [];

        return lines.join('\n');
    }

    flufflyConvert(clsInfo: CSharpClassSourceInfo) {

        let csharpCode = getCsString(clsInfo.fileFullPath);
        let emitter = new Emitter(csharpCode);
        let tsCode = '_not_found_';
        let options = <EmitOptions>{
            defaults: <DefaultEmitOptions>{
                classEmitOptions: {
                    declare: true,
                    perClassEmitOptions: (_classObject: CSharpClass) => {
                        // this.cSharpClass = _classObject;
                        // // DTO suffix
                        // this.type = new GeneratedTypeName(this.cSharpClass.name, 'dto');
                        let options: PerClassEmitOptions = {
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
                onBeforeEmit: (_file: CSharpFile, _typeScriptEmitter: TypeScriptEmitter) => {
                    // this.cSharpFile = _file;

                    tsCode = _typeScriptEmitter.output;
                }
            }

        };
        emitter.emit(options);
        return tsCode;
    }

    genTsClassCode(target: TargetType): string {

        let lines = [
            // export class Invoice
            // export interface IInvoice
            `export ${target} ${this.getClassName(target)} {`,
            // Class Members
            indentCode(this.members.map(m => m.genCode(this, target)).join('\n'), 1),
        ];

        if (target == 'class') {
            // Class.fromRaw()
            lines.push('', indentCode(this.genFnFromRawCode(), 1));
            // Class.toRaw()
            lines.push('', indentCode(this.genFnToRawCode(), 1));
        }

        lines.push(`}`);

        return lines.join('\n');
    }

    genFnFromRawCode() {
        let collectionFieldHydraters = this.members
            .filter(e => e.isCollection())
            .reduce((memo, next) => {
                memo.push(next.genFromRawHydrater())
                return memo;
            }, [] as string[]);

        let fnBody = [
            `const e = new ${this.getClassName('class')}();`,
            `_.extend(e, raw);`,
            `// filter out non-owned properties`,
            `const mask = ${this.getFieldMaskName()};`,
            `Object.keys(e).forEach(key => {`,
            `${CODE_INDENT}if (!mask.hasOwnProperty(key)) {`,
            `${CODE_INDENT}${CODE_INDENT}delete (e as any)[key];`,
            `${CODE_INDENT}} `,
            `});`,
            ``,
            `// populate lists`,
            ...collectionFieldHydraters,
            ``,
            `return e;`,
        ].join('\n');

        let code = [
            `static fromRaw(raw: ${this.getClassName('interface')}) {`,
            indentCode(fnBody, 1),
            `}`,
        ].join('\n');

        return code;
    }

    genFnToRawCode() {
        let collectionFieldHydraters = this.members
            // .filter(e => e.isCollection())
            .reduce((memo, next) => {
                memo.push(next.genToRawHydrater())
                return memo;
            }, [] as string[]);

        let code = [
            `toRaw() {`,
            indentCode(
                [
                    `const raw: ${this.getClassName('interface')} = {`,
                    indentCode(collectionFieldHydraters.join('\n'), 1),
                    `};`,
                    ``,
                    `return raw;`,
                ].join('\n'), 1),
            `}`,

        ].join('\n');
        return code
    }

    genTypescriptFieldNameLookup(): string {
        let test = this.classes[0];

        let members = this.members.reduce((memo, next) => {
            memo.push(next.genTypescriptLookupField())
            return memo;
        }, [] as string[]);

        let lines = [
            `export const ${this.getFieldMaskName()} = {`,
            indentCode(members.join('\n'), 1),
            `}`,
        ].join('\n');

        return lines;
    }

    static getNamespace(cs: CSharpClass): string {
        const nsParts = this.getNamespaceParts(cs);
        return nsParts.join(".");
    }


    static getCSharpFile(cs: CSharpClass) {
        const nsParts = this.getNamespaceParts(cs);
        let parent = cs.parent;
        while (parent && !(parent instanceof CSharpFile)) {
            parent = parent.parent;
        }

        return parent;
    }

    static getNamespaceParts(cs: CSharpClass | CSharpNamespace | CSharpFile): string[] {
        return getNamespaceParts(cs);
    }

    getTypeFullname(typeName: string) {
        let fullname = this.classes.map(src => {
            let potentials = [
                `${this.namespace}.${typeName}`,
                ...src.csFile.usings
                    .map(using => `${NamespaceInfo.getFullNamespace(using.namespace)}.${typeName}`),

            ];
            let match = potentials.find(e => KnownClasses.lookupFullname(e));
            return match;
        }).find(e => !!e);

        return fullname;
    }

}
