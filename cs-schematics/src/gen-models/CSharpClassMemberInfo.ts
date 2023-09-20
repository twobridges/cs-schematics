import { CSharpField, CSharpProperty, CSharpType } from "@fluffy-spoon/csharp-to-typescript-generator";
import { camelize } from "@angular-devkit/core/src/utils/strings";
import { Result } from "../ddd/shared-kernel/functional-programming/result.model";
import { CSharpClassInfo, TargetType } from "./CSharpClassInfo";
import { KnownClasses, KnownClassInfos } from "./local-cache";
import { result } from "underscore";

export type GenericMap = { [name: string]: string };
export type fnConverter = (
    member: CSharpField | CSharpProperty,
    genericMap?: GenericMap,
) => Result<string>;

let fnConvertTypeGenericCollectionClass: fnConverter = (member) => {
    let genericType = member.type.genericParameters[0].name;
    let convertedTyp = fnConvertPrimitiveTypeName(genericType);
    if (convertedTyp.isSuccess) {
        genericType = convertedTyp.value;
    } else {
        genericType = `${genericType}`;
    }
    return Result.CreateSuccess(`Array<${genericType}>`);
};

let fnConvertTypeGenericCollectionInterface: fnConverter = (member) => {
    let genericType = member.type.genericParameters[0].name;
    let convertedTyp = fnConvertPrimitiveTypeName(genericType);
    if (convertedTyp.isSuccess) {
        genericType = convertedTyp.value;
    } else {
        genericType = `I${genericType}`;
    }
    return Result.CreateSuccess(`Array<${genericType}>`);
};

let fnCollectionInitialiser: fnConverter = (member) => {
    return Result.CreateSuccess(`[]`);
};
export let fnConvertPrimitive: fnConverter = (member, genericMap) => {
    return fnConvertPrimitiveTypeName(member.type.name, genericMap);
};

export let fnConvertPrimitiveTypeName = (typName: string, genericMap?: GenericMap) => {
    let lookup = (genericMap && primitiveTypeLookup[genericMap[typName]]);
    lookup = lookup || primitiveTypeLookup[typName];

    if (lookup) {
        let type = `${lookup}`;
        return Result.CreateSuccess(type);

    } else {
        return Result.CreateFailure('Missing typeLookup', '');
    }
};

export var primitiveTypeLookup: { [csType: string]: string } = {
    'DateTime': 'string',
    'string': 'string',
    'Guid': 'string',
    'decimal': 'number',
    'Decimal': 'number',
    'Currency': 'number',
    'int': 'number',
    'short': 'number',
    'uint': 'number',
    'ulong': 'number',
    'long': 'number',
    'float': 'number',
    'double': 'number',
    'byte': 'number',
    'sbyte': 'number',
    'bool': 'boolean',
};
export var collectionTypeLookup: { [csType: string]: boolean } = {
    'IReadOnlyList<>': true,
    'List<>': true,
    'Collection<>': true,
    'ICollection<>': true,
    // 'Dictionary<,>': true,
    'Array<>': true,
    'System.Array<>': true,
};
export var typeConversion: { [csType: string]: fnConverter } = {
    // 'IReadOnlyList<>': fnConvertTypeGenericCollectionClass,
};
export var initialiserConversion: { [csType: string]: fnConverter } = {
    'IReadOnlyList<>': fnCollectionInitialiser,
};

export class CSharpClassMemberInfo {
    getMemberName() {
        return `${camelize(this.name)}`;
    }
    genMemberType(clsInfo: CSharpClassInfo, target: TargetType): Result<string> {
        let typeName = this.type.fullName;
        typeName = this.genericMap[typeName] ?? typeName;
        let fullTypename = clsInfo.getTypeFullname(typeName);
        let knownType = fullTypename && KnownClasses.lookupFullname(fullTypename);

        if (this.name === 'IsPriority') {
            console.log('IsPriority');
        }

        // if (this.name == 'HourStarts') {
        //     debugger;
        // }

        if (knownType) {
            return Result.CreateSuccess(`${target === 'interface' ? 'I' : ''}${typeName}`);
        }
        if (typeConversion[typeName]) {
            // special converter
            return typeConversion[typeName](this.member);

        } else if (collectionTypeLookup[typeName]) {
            // primitive conversion
            if (target === 'interface') {
                return fnConvertTypeGenericCollectionInterface(this.member);
            } else {
                return fnConvertTypeGenericCollectionClass(this.member);
            }

        } else if (primitiveTypeLookup[typeName] || primitiveTypeLookup[this.genericMap[typeName]]) {
            // primitive conversion
            return fnConvertPrimitive(this.member, this.genericMap);

        } else {
            console.log(`missing type conversion: ${typeName}`);
            // debugger;

            return Result.CreateFailure(`UNKNOWN TYPE`, '');
        }
    }

    isCollection() {
        return !!collectionTypeLookup[this.type.name];
    }
    isCollectionOfPrimitives() {
        if (this.isCollection()) {
            if (primitiveTypeLookup[this.type.genericParameters[0].name]) {
                return true;
            }
        }
        return false;
        // return !!collectionTypeLookup[this.type.name];
    }

    genMemberInitialiser(): Result<string> {
        if (initialiserConversion[this.type.fullName]) {
            // special converter
            return initialiserConversion[this.type.fullName](this.member);
        } else {
            // console.log(`missing type conversion: ${this.type.fullName}`);
            return Result.CreateSuccess('');
        }
    }

    genToRawHydrater() {
        const name = this.getMemberName();

        if (this.excludeField(name)) {
            return `// excluded field: ${name}`;

        } else {
            if (this.name == 'InvoiceStatus') {
                // debugger;
            }
            if (this.isCollectionOfPrimitives()) {
                return `${name}: this.${name} && this.${name}.map(e => e),`;
            } else if (this.isCollection()) {
                return `${name}: this.${name} && this.${name}.map(e => e.toRaw()),`;
            } else {
                return `${name}: this.${name},`;
            }

        }
    }
    genFromRawHydrater() {
        const name = this.getMemberName();


        if (this.excludeField(name)) {
            return `// excluded field: ${name}`;

        } else {
            if (this.name == 'InvoiceStatus') {
                // debugger;
            }
            if (this.isCollectionOfPrimitives()) {
                return `e.${name} = e.${name} && e.${name}.map(i => i);`;

            } else if (this.isCollection()) {
                var genericType = this.type.genericParameters[0].name;
                return `e.${name} = e.${name} && e.${name}.filter(c => !isSoftDeleted(c)).map(i => ${genericType}.fromRaw(i));`;
            } else {
                return '';
            }

        }
    }
    genTsInterfaceFieldCode(clsInfo: CSharpClassInfo) {
        const name = this.getMemberName();
        let code = ''
        if (this.excludeField(name)) {
            code = `// excluded field: ${name}`;
        } else {
            const typeResult = this.genMemberType(clsInfo, 'interface');
            const errComment = `${typeResult.error ? ' // ' + typeResult.error : ''}`;
            code = [
                name,
                this.type.isNullable ? '?' : '',
                ': ',
                typeResult.isSuccess ? typeResult.value : 'any',
                ';',
                errComment,
            ].join('');
        }

        return code;
    }

    genTypescriptLookupField() {
        const name = this.getMemberName();

        if (this.excludeField(name)) {
            return `// excluded field: ${name}`;
        } else {
            return `${camelize(name)}: '${camelize(name)}',`;
        }
    }

    genCode(clsInfo: CSharpClassInfo, target: TargetType) {
        return target === 'interface'
            ? this.genTsInterfaceFieldCode(clsInfo)
            : this.genTsClassFieldCode(clsInfo);
    }

    private excludeField(name: string) {
        if (name == 'domainEvents') {
            return true;
        } else if (name == 'tsReplication') {
            return true;
        } else if (name == 'settings') {
            // TODO: change this field name exclusion to be based on type information too.  
            // TODO: and make it depend on full type name (including namespace)
            // TODO: and make it optional or something
            // else, it's a bit heavy handed, since some projects will require these banned field names
            return true;
        } else {
            return false;
        }
    }
    private genTsClassFieldCode(clsInfo: CSharpClassInfo) {
        const name = this.getMemberName();
        if (this.name == 'InvoiceStatus') {
            debugger;
        }
        let code = ''
        if (this.excludeField(name)) {
            code = `// excluded field: ${name}`;
        } else {
            const typeResult = this.genMemberType(clsInfo, 'class');
            const initResult = this.genMemberInitialiser();

            let initialiser = '';
            if (initResult.isSuccess) {
                if (initResult.value) {
                    initialiser = ` = ${initResult.value}`;
                }
            } else {
                initialiser = ` = null /*${initResult.error}*/`;
            }

            const errComment = `${typeResult.error ? ' // ' + typeResult.error : ''}`;

            code = [
                name,
                this.type.isNullable ? '?' : '',
                ': ',
                typeResult.isSuccess ? typeResult.value : 'any',
                initialiser,
                ';',
                errComment,
            ].join('');

        }

        return code;
    }

    private constructor(
        public name: string,
        public type: CSharpType,
        public member: CSharpField | CSharpProperty,
        public genericMap: { [name: string]: string }
    ) {
        // if (Object.values(genericMap).length) {
        //     console.log(`member: ${name}`);

        // }
        // console.log(`member: ${name}`);
    }

    static create(prop: CSharpProperty | CSharpField, genericMap: { [name: string]: string }) {
        let member: CSharpClassMemberInfo | undefined;
        if (prop.isPublic) {
            if (prop instanceof CSharpProperty) {
                member = CSharpClassMemberInfo.createFromProp(prop, genericMap);
            } else if (prop instanceof CSharpField) {
                member = CSharpClassMemberInfo.createFromField(prop, genericMap);
            }
        }
        return member;
    }

    private static createFromProp(prop: CSharpProperty, genericMap: { [name: string]: string }) {
        let e = new CSharpClassMemberInfo(prop.name, prop.type, prop, genericMap);
        return e;
    }

    private static createFromField(prop: CSharpField, genericMap: { [name: string]: string }) {
        let e = new CSharpClassMemberInfo(prop.name, prop.type, prop, genericMap);
        return e;
    }

}
