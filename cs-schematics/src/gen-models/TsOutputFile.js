"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTsFileContainers = exports.TsOutputFile = void 0;
const strings_1 = require("@angular-devkit/core/src/utils/strings");
const result_model_1 = require("../ddd/shared-kernel/functional-programming/result.model");
class TsOutputFile {
    constructor() {
        this.classInfoList = [];
    }
    static create(filename) {
        let e = new TsOutputFile();
        e.filename = filename;
        return e;
    }
    addClassInfo(clsInfo) {
        this.classInfoList.push(clsInfo);
    }
    genContent(options) {
        let content = [
            // header usings
            `import * as _ from 'underscore';
export interface IDateOnly {
    year: number,
    month: number,
    day: number,
    dayOfWeek: number,
    dayOfYear: number,
    dayNumber: number
};
export interface ITimeOnly {
    hour: number,
    minute: number,
    second: number,
    millisecond: number,
    ticks: number
};`,
            ``,
            `var isSoftDeleted = (e: any) => !!(e && (e.deletedUtc || e.deletedBy));`,
            ``,
            // classes and interfaces
            ...this.classInfoList.reduce((memo, nextClsInfo) => {
                memo.push(nextClsInfo.generate());
                return memo;
            }, []),
        ];
        return content.join('\n');
    }
    dump() {
        let classNameList = this.classInfoList.map(e => e.classes[0].nameWithGeneric).join(', ');
        return `INFO: ${this.filename} - ${classNameList}`;
    }
}
exports.TsOutputFile = TsOutputFile;
function createTsFileContainers(nsRoot, options) {
    try {
        let idxTsFiles = nsRoot
            .getAllClasses()
            .filter(e => e.output)
            .reduce((idxTsFiles, nextClass) => {
            let ext = `${options.outputAs == 'ts' ? 'ts'
                : options.outputAs == 'md' ? 'md'
                    : '?'}`;
            let fileName = 'unknown.txt';
            if (options.filePer == 'all') {
                fileName = `all-models.${ext}`;
            }
            else if (options.filePer == 'namespace') {
                fileName = `${strings_1.dasherize(nextClass.namespace)}.${ext}`;
            }
            else if (options.filePer == 'type') {
                fileName = `${strings_1.dasherize(nextClass.getClassName('class'))}.${ext}`;
            }
            if (!idxTsFiles[fileName]) {
                idxTsFiles[fileName] = TsOutputFile.create(fileName);
            }
            idxTsFiles[fileName].addClassInfo(nextClass);
            return idxTsFiles;
        }, {});
        let genResult = result_model_1.Result.CreateSuccess(Object.values(idxTsFiles));
        return genResult;
    }
    catch (error) {
        return result_model_1.Result.CreateFailure(error, []);
    }
}
exports.createTsFileContainers = createTsFileContainers;
//# sourceMappingURL=TsOutputFile.js.map