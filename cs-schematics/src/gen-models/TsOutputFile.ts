import { dasherize } from "@angular-devkit/core/src/utils/strings";
import { Result } from "../ddd/shared-kernel/functional-programming/result.model";
import { CSharpClassInfo } from "./CSharpClassInfo";
import { NamespaceInfo } from "./NamespaceInfo";
import { GenModelOptions } from "./schema";


export class TsOutputFile {
    filename: string;
    classInfoList: CSharpClassInfo[] = [];

    static create(filename: string) {
        let e = new TsOutputFile();
        e.filename = filename;
        return e;
    }

    addClassInfo(clsInfo: CSharpClassInfo) {
        this.classInfoList.push(clsInfo);
    }

    genContent(options: GenModelOptions) {
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
            }, [] as string[]),
        ];
        return content.join('\n');
    }

    dump() {
        let classNameList = this.classInfoList.map(e => e.classes[0].nameWithGeneric).join(', ');
        return `INFO: ${this.filename} - ${classNameList}`;

    }

}

export function createTsFileContainers(nsRoot: NamespaceInfo, options: GenModelOptions): Result<TsOutputFile[]> {
    try {

        let idxTsFiles = nsRoot
            .getAllClasses()
            .filter(e => e.output)
            .reduce((idxTsFiles, nextClass) => {
                let ext = `${options.outputAs == 'ts' ? 'ts'
                    : options.outputAs == 'md' ? 'md'
                        : '?'
                    }`;
                let fileName = 'unknown.txt';
                if (options.filePer == 'all') {
                    fileName = `all-models.${ext}`;
                } else if (options.filePer == 'namespace') {
                    fileName = `${dasherize(nextClass.namespace)}.${ext}`;
                } else if (options.filePer == 'type') {
                    fileName = `${dasherize(nextClass.getClassName('class'))}.${ext}`;
                }

                if (!idxTsFiles[fileName]) {
                    idxTsFiles[fileName] = TsOutputFile.create(fileName);
                }
                idxTsFiles[fileName].addClassInfo(nextClass);

                return idxTsFiles;
            }, {} as { [filename: string]: TsOutputFile })
            ;

        let genResult = Result.CreateSuccess(Object.values(idxTsFiles));

        return genResult;

    } catch (error) {
        return Result.CreateFailure(error, []);
    }

}