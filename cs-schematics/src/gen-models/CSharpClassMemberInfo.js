"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSharpClassMemberInfo = exports.initialiserConversion = exports.typeConversion = exports.collectionTypeLookup = exports.primitiveTypeLookup = exports.fnConvertPrimitiveTypeName = exports.fnConvertPrimitive = void 0;
const csharp_to_typescript_generator_1 = require("@fluffy-spoon/csharp-to-typescript-generator");
const strings_1 = require("@angular-devkit/core/src/utils/strings");
const result_model_1 = require("../ddd/shared-kernel/functional-programming/result.model");
const local_cache_1 = require("./local-cache");
let fnConvertTypeGenericCollectionClass = (member) => {
    let genericType = member.type.genericParameters[0].name;
    let convertedTyp = exports.fnConvertPrimitiveTypeName(genericType);
    if (convertedTyp.isSuccess) {
        genericType = convertedTyp.value;
    }
    else {
        genericType = `${genericType}`;
    }
    return result_model_1.Result.CreateSuccess(`Array<${genericType}>`);
};
let fnConvertTypeGenericCollectionInterface = (member) => {
    let genericType = member.type.genericParameters[0].name;
    let convertedTyp = exports.fnConvertPrimitiveTypeName(genericType);
    if (convertedTyp.isSuccess) {
        genericType = convertedTyp.value;
    }
    else {
        genericType = `I${genericType}`;
    }
    return result_model_1.Result.CreateSuccess(`Array<${genericType}>`);
};
let fnCollectionInitialiser = (member) => {
    return result_model_1.Result.CreateSuccess(`[]`);
};
let fnConvertPrimitive = (member, genericMap) => {
    return exports.fnConvertPrimitiveTypeName(member.type.name, genericMap);
};
exports.fnConvertPrimitive = fnConvertPrimitive;
let fnConvertPrimitiveTypeName = (typName, genericMap) => {
    let lookup = (genericMap && exports.primitiveTypeLookup[genericMap[typName]]);
    lookup = lookup || exports.primitiveTypeLookup[typName];
    if (lookup) {
        let type = `${lookup}`;
        return result_model_1.Result.CreateSuccess(type);
    }
    else {
        return result_model_1.Result.CreateFailure('Missing typeLookup', '');
    }
};
exports.fnConvertPrimitiveTypeName = fnConvertPrimitiveTypeName;
exports.primitiveTypeLookup = {
    'DateTime': 'string',
    'DateOnly': `IDateOnly`,
    'TimeOnly': `ITimeOnly`,
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
exports.collectionTypeLookup = {
    'IReadOnlyList<>': true,
    'List<>': true,
    'Collection<>': true,
    'ICollection<>': true,
    // 'Dictionary<,>': true,
    'Array<>': true,
    'System.Array<>': true,
};
exports.typeConversion = {
// 'IReadOnlyList<>': fnConvertTypeGenericCollectionClass,
};
exports.initialiserConversion = {
    'IReadOnlyList<>': fnCollectionInitialiser,
};
class CSharpClassMemberInfo {
    constructor(name, type, member, genericMap) {
        // if (Object.values(genericMap).length) {
        //     console.log(`member: ${name}`);
        this.name = name;
        this.type = type;
        this.member = member;
        this.genericMap = genericMap;
        // }
        // console.log(`member: ${name}`);
    }
    getMemberName() {
        if (this.name == 'ID') {
            console.log(`member: '${this.name}' -> '${strings_1.camelize(this.name)}'`);
            console.log(`member: '${this.name}' -> '${strings_1.camelize(this.name)}'`);
            return 'id';
        }
        return `${strings_1.camelize(this.name)}`;
    }
    genMemberType(clsInfo, target) {
        var _a;
        let typeName = this.type.fullName;
        typeName = (_a = this.genericMap[typeName]) !== null && _a !== void 0 ? _a : typeName;
        let fullTypename = clsInfo.getTypeFullname(typeName);
        let knownType = fullTypename && local_cache_1.KnownClasses.lookupFullname(fullTypename);
        if (this.name === 'IsPriority') {
            console.log('IsPriority');
        }
        // if (this.name == 'HourStarts') {
        //     debugger;
        // }
        if (knownType) {
            return result_model_1.Result.CreateSuccess(`${target === 'interface' ? 'I' : ''}${typeName}`);
        }
        if (exports.typeConversion[typeName]) {
            // special converter
            return exports.typeConversion[typeName](this.member);
        }
        else if (exports.collectionTypeLookup[typeName]) {
            // primitive conversion
            if (target === 'interface') {
                return fnConvertTypeGenericCollectionInterface(this.member);
            }
            else {
                return fnConvertTypeGenericCollectionClass(this.member);
            }
        }
        else if (exports.primitiveTypeLookup[typeName] || exports.primitiveTypeLookup[this.genericMap[typeName]]) {
            // primitive conversion
            return exports.fnConvertPrimitive(this.member, this.genericMap);
        }
        else {
            console.log(`missing type conversion: ${typeName}`);
            // debugger;
            return result_model_1.Result.CreateFailure(`UNKNOWN TYPE`, '');
        }
    }
    isCollection() {
        return !!exports.collectionTypeLookup[this.type.name];
    }
    isCollectionOfPrimitives() {
        if (this.isCollection()) {
            if (exports.primitiveTypeLookup[this.type.genericParameters[0].name]) {
                return true;
            }
        }
        return false;
        // return !!collectionTypeLookup[this.type.name];
    }
    genMemberInitialiser() {
        if (exports.initialiserConversion[this.type.fullName]) {
            // special converter
            return exports.initialiserConversion[this.type.fullName](this.member);
        }
        else {
            // console.log(`missing type conversion: ${this.type.fullName}`);
            return result_model_1.Result.CreateSuccess('');
        }
    }
    genToRawHydrater() {
        const name = this.getMemberName();
        if (this.excludeField(name)) {
            return `// excluded field: ${name}`;
        }
        else {
            if (this.name == 'InvoiceStatus') {
                // debugger;
            }
            if (this.isCollectionOfPrimitives()) {
                return `${name}: this.${name} && this.${name}.map(e => e),`;
            }
            else if (this.isCollection()) {
                return `${name}: this.${name} && this.${name}.map(e => e.toRaw()),`;
            }
            else {
                return `${name}: this.${name},`;
            }
        }
    }
    genFromRawHydrater() {
        const name = this.getMemberName();
        if (this.excludeField(name)) {
            return `// excluded field: ${name}`;
        }
        else {
            if (this.name == 'InvoiceStatus') {
                // debugger;
            }
            if (this.isCollectionOfPrimitives()) {
                return `e.${name} = e.${name} && e.${name}.map(i => i);`;
            }
            else if (this.isCollection()) {
                var genericType = this.type.genericParameters[0].name;
                return `e.${name} = e.${name} && e.${name}.filter(c => !isSoftDeleted(c)).map(i => ${genericType}.fromRaw(i));`;
            }
            else {
                return '';
            }
        }
    }
    genTsInterfaceFieldCode(clsInfo) {
        const name = this.getMemberName();
        let code = '';
        if (this.excludeField(name)) {
            code = `// excluded field: ${name}`;
        }
        else {
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
        }
        else {
            return `${strings_1.camelize(name)}: '${strings_1.camelize(name)}',`;
        }
    }
    genCode(clsInfo, target) {
        return target === 'interface'
            ? this.genTsInterfaceFieldCode(clsInfo)
            : this.genTsClassFieldCode(clsInfo);
    }
    excludeField(name) {
        if (name == 'domainEvents') {
            return true;
        }
        else if (name == 'tsReplication') {
            return true;
        }
        else if (name == 'settings') {
            // TODO: change this field name exclusion to be based on type information too.  
            // TODO: and make it depend on full type name (including namespace)
            // TODO: and make it optional or something
            // else, it's a bit heavy handed, since some projects will require these banned field names
            return true;
        }
        else {
            return false;
        }
    }
    genTsClassFieldCode(clsInfo) {
        const name = this.getMemberName();
        if (this.name == 'TimeOfDay' || this.name == 'DueDate' || this.name == 'InvoiceStatus') {
            console.log(`member: ${name}`);
        }
        let code = '';
        if (this.excludeField(name)) {
            code = `// excluded field: ${name}`;
        }
        else {
            const typeResult = this.genMemberType(clsInfo, 'class');
            const initResult = this.genMemberInitialiser();
            let initialiser = '';
            if (initResult.isSuccess) {
                if (initResult.value) {
                    initialiser = ` = ${initResult.value}`;
                }
            }
            else {
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
    static create(prop, genericMap) {
        let member;
        if (prop.isPublic) {
            if (prop instanceof csharp_to_typescript_generator_1.CSharpProperty) {
                member = CSharpClassMemberInfo.createFromProp(prop, genericMap);
            }
            else if (prop instanceof csharp_to_typescript_generator_1.CSharpField) {
                member = CSharpClassMemberInfo.createFromField(prop, genericMap);
            }
        }
        return member;
    }
    static createFromProp(prop, genericMap) {
        let e = new CSharpClassMemberInfo(prop.name, prop.type, prop, genericMap);
        return e;
    }
    static createFromField(prop, genericMap) {
        let e = new CSharpClassMemberInfo(prop.name, prop.type, prop, genericMap);
        return e;
    }
}
exports.CSharpClassMemberInfo = CSharpClassMemberInfo;
//# sourceMappingURL=CSharpClassMemberInfo.js.map