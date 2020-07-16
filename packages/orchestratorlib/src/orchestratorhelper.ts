/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import {Utility} from './utility';

const ReadText: any = require('read-text-file');
const LuisBuilder: any = require('@microsoft/bf-lu').V2.LuisBuilder;
const QnaMakerBuilder: any = require('@microsoft/bf-lu').V2.QnAMakerBuilder;
const processedFiles: string[] = [];

export class OrchestratorHelper {

  public static exists(path: string): boolean {
    return fs.existsSync(path);
  }

  public static isDirectory(path: string): boolean {
    try {
      const stats: fs.Stats = fs.statSync(path);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  public static readFile(filePath: string): string {
    return ReadText.readSync(filePath);
  }

  public static writeToFile(filePath: string, content: string): string {
    fs.mkdirSync(path.dirname(filePath), {recursive: true});
    fs.writeFileSync(filePath, content);
    return filePath;
  }

  public static deleteFile(filePath: string)  {
    fs.unlinkSync(filePath);
  }

  public static createDteContent(utterancesLabelsMap: { [id: string]: string[]; }) {
    const labelUtteranceMap: { [label: string]: string} = {};
    // eslint-disable-next-line guard-for-in
    for (const utterance in utterancesLabelsMap) {
      const labels: string[] = utterancesLabelsMap[utterance];
      labels.forEach((label: string) => {
        if (label in labelUtteranceMap) {
          labelUtteranceMap[label] = labelUtteranceMap[label] + '|' + utterance;
        } else {
          labelUtteranceMap[label] = utterance;
        }
      });
    }
    let key: number = 0;
    let tsvContent: string = '';
    // eslint-disable-next-line guard-for-in
    for (const label in labelUtteranceMap) {
      const utterances: string = labelUtteranceMap[label];
      const line: string = key + '\t' + label + '\t' + utterances + '\n';
      tsvContent += line;
      key += 1;
    }

    return tsvContent;
  }

  public static async getTsvContent(
    filePath: string,
    hierarchical: boolean = false,
    outputDteFormat: boolean = false)  {
    const utterancesLabelsMap: { [id: string]: string[]; } = (await OrchestratorHelper.getUtteranceLabelsMap(filePath, hierarchical)).utterancesLabelsMap;
    let tsvContent: string = '';

    if (outputDteFormat) {
      tsvContent = OrchestratorHelper.createDteContent(utterancesLabelsMap);
    } else {
      // eslint-disable-next-line guard-for-in
      for (const utterance in utterancesLabelsMap) {
        const labels: any = utterancesLabelsMap[utterance];
        const line: string = labels.join() + '\t' + utterance + '\n';
        tsvContent += line;
      }
    }

    return tsvContent;
  }

  public static async getUtteranceLabelsMap(
    filePath: string,
    hierarchical: boolean = false): Promise<{
      "utterancesLabelsMap": { [id: string]: string[]; },
      "utterancesDuplicateLabelsMap": Map<string, Set<string>> }> {
    const utterancesLabelsMap: { [id: string]: string[]; } = {};
    const utterancesDuplicateLabelsMap: Map<string, Set<string>> = new Map<string, Set<string>>();

    if (OrchestratorHelper.isDirectory(filePath)) {
      await OrchestratorHelper.iterateInputFolder(filePath, utterancesLabelsMap, utterancesDuplicateLabelsMap, hierarchical);
    } else {
      await OrchestratorHelper.processFile(filePath, path.basename(filePath), utterancesLabelsMap, utterancesDuplicateLabelsMap, hierarchical);
    }

    return { utterancesLabelsMap, utterancesDuplicateLabelsMap };
  }

  static async processFile(
    filePath: string,
    fileName: string,
    utterancesLabelsMap: { [id: string]: string[]; },
    utterancesDuplicateLabelsMap: Map<string, Set<string>>,
    hierarchical: boolean) {
    const ext: string = path.extname(filePath);
    if (ext === '.lu') {
      Utility.writeToConsole(`Processing ${filePath}...`);
      await OrchestratorHelper.parseLuFile(
        filePath,
        OrchestratorHelper.getLabelFromFileName(fileName, ext, hierarchical),
        utterancesLabelsMap,
        utterancesDuplicateLabelsMap);
    } else if (ext === '.qna') {
      Utility.writeToConsole(`Processing ${filePath}...`);
      await OrchestratorHelper.parseQnaFile(
        filePath,
        OrchestratorHelper.getLabelFromFileName(fileName, ext, hierarchical),
        utterancesLabelsMap,
        utterancesDuplicateLabelsMap);
    } else if (ext === '.json') {
      Utility.writeToConsole(`Processing ${filePath}...\n`);
      OrchestratorHelper.getIntentsUtterances(
        fs.readJsonSync(filePath),
        OrchestratorHelper.getLabelFromFileName(fileName, ext, hierarchical),
        utterancesLabelsMap,
        utterancesDuplicateLabelsMap);
    } else if (ext === '.tsv' || ext === '.txt') {
      Utility.writeToConsole(`Processing ${filePath}...\n`);
      OrchestratorHelper.parseTsvFile(
        filePath,
        OrchestratorHelper.getLabelFromFileName(fileName, ext, hierarchical),
        utterancesLabelsMap,
        utterancesDuplicateLabelsMap);
    } else if (ext === '.blu') {
      Utility.writeToConsole(`Processing ${filePath}...\n`);
      OrchestratorHelper.parseBluFile(
        filePath,
        utterancesLabelsMap,
        utterancesDuplicateLabelsMap);
    } else {
      throw new Error(`${filePath} has invalid extension - lu, qna, json and tsv files are supported.`);
    }
  }

  static async parseBluFile(
    bluFile: string,
    utterancesLabelsMap: { [id: string]: string[]; },
    utterancesDuplicateLabelsMap: Map<string, Set<string>>) {
    const lines: string[] = OrchestratorHelper.readFile(bluFile).split('\n');
    if (lines.length === 0 || lines.length === 1) {
      return;
    }
    lines.shift();
    OrchestratorHelper.tryParseLabelUtteranceTsv(lines, utterancesLabelsMap, utterancesDuplicateLabelsMap, true);
  }

  static async parseLuFile(
    luFile: string,
    hierarchicalLabel: string,
    utterancesLabelsMap: { [id: string]: string[]; },
    utterancesDuplicateLabelsMap: Map<string, Set<string>>) {
    const fileContents: string = OrchestratorHelper.readFile(luFile);
    const luObject: any = {
      content: fileContents,
      id: luFile,
    };
    const luisObject: any = await LuisBuilder.fromLUAsync([luObject], OrchestratorHelper.findLuFiles);
    OrchestratorHelper.getIntentsUtterances(luisObject, hierarchicalLabel, utterancesLabelsMap, utterancesDuplicateLabelsMap);
  }

  static async parseTsvFile(
    tsvFile: string,
    hierarchicalLabel: string,
    utterancesLabelsMap: { [id: string]: string[]; },
    utterancesDuplicateLabelsMap: Map<string, Set<string>>) {
    const lines: string[] = OrchestratorHelper.readFile(tsvFile).split('\n');
    Utility.debuggingLog(`OrchestratorHelper.parseTsvFile(), lines=${lines.length}`);
    if (lines.length === 0) {
      return;
    }
    if (!OrchestratorHelper.tryParseQnATsvFile(lines, hierarchicalLabel, utterancesLabelsMap, utterancesDuplicateLabelsMap)) {
      OrchestratorHelper.tryParseLabelUtteranceTsv(lines, utterancesLabelsMap, utterancesDuplicateLabelsMap);
    }
  }

  static tryParseLabelUtteranceTsv(
    lines: string[],
    utterancesLabelsMap: { [id: string]: string[]; },
    utterancesDuplicateLabelsMap: Map<string, Set<string>>,
    bluFormat: boolean = false): boolean {
    if (!bluFormat && OrchestratorHelper.hasLabelUtteranceHeader(lines[0])) {
      lines.shift();
    }
    lines.forEach((line: string) => {
      const items: string[] = line.split('\t');
      if (items.length < 2) {
        return;
      }
      let labels: string = items[0] ? items[0] : '';
      const utteranceIdx: number = (items.length === 3 && !bluFormat) ? 2 : 1;
      let utterance: string = items[utteranceIdx] ? items[utteranceIdx] : '';
      labels = labels.trim();
      utterance = utterance.trim();
      OrchestratorHelper.addNewLabelUtterance(
        utterance,
        labels,
        '',
        utterancesLabelsMap,
        utterancesDuplicateLabelsMap
      );
    });
    return true;
  }

  static tryParseQnATsvFile(
    lines: string[],
    label: string,
    utterancesLabelsMap: { [id: string]: string[]; },
    utterancesDuplicateLabelsMap: Map<string, Set<string>>): boolean {
    if (!OrchestratorHelper.isQnATsvHeader(lines[0])) {
      return false;
    }
    lines.shift();
    lines.forEach((line: string) => {
      const items: string[] = line.split('\t');
      if (items.length < 2) {
        return;
      }
      OrchestratorHelper.addNewLabelUtterance(
        items[0].trim(),
        label,
        '',
        utterancesLabelsMap,
        utterancesDuplicateLabelsMap
      );
    });

    return true;
  }

  static isQnATsvHeader(header: string): boolean {
    return header.indexOf('Question') >= 0 && header.indexOf('Answer') > 0;
  }

  static hasLabelUtteranceHeader(header: string): boolean {
    return header.indexOf('Label') >= 0 &&
      (header.indexOf('Text') > 0 || header.indexOf('Utterance') > 0);
  }

  static async parseQnaFile(
    qnaFile: string,
    label: string,
    utterancesLabelsMap: { [id: string]: string[]; },
    utterancesDuplicateLabelsMap: Map<string, Set<string>>) {
    const fileContents: string = OrchestratorHelper.readFile(qnaFile);
    const lines: string[] = fileContents.split('\n');
    if (lines.length === 0) {
      return;
    }

    const newlines: string[] = [];
    lines.forEach((line: string) => {
      if (line.indexOf('> !# @qna.pair.source =') < 0) {
        newlines.push(line);
      }
    });

    const qnaObject: any = await QnaMakerBuilder.fromContent(newlines.join('\n'));
    if (qnaObject) {
      OrchestratorHelper.getQnaQuestionsAsUtterances(qnaObject, label, utterancesLabelsMap, utterancesDuplicateLabelsMap);
    } else {
      throw new Error(`Failed parsing qna file ${qnaFile}`);
    }
  }

  static async iterateInputFolder(
    folderPath: string,
    utterancesLabelsMap: { [id: string]: string[]; },
    utterancesDuplicateLabelsMap: Map<string, Set<string>>,
    hierarchical: boolean) {
    const supportedFileFormats: string[] = ['.lu', '.json', '.qna', '.tsv', '.txt', '.blu'];
    const items: string[] = fs.readdirSync(folderPath);
    for (const item of items) {
      const currentItemPath: string = path.join(folderPath, item);
      const isDirectory: boolean = fs.lstatSync(currentItemPath).isDirectory();

      if (isDirectory) {
        // eslint-disable-next-line no-await-in-loop
        await OrchestratorHelper.iterateInputFolder(currentItemPath, utterancesLabelsMap, utterancesDuplicateLabelsMap, hierarchical);
      } else {
        const ext: string = path.extname(item);
        if (processedFiles.includes(currentItemPath)) {
          continue;
        }
        if (supportedFileFormats.indexOf(ext) > -1) {
          // eslint-disable-next-line no-await-in-loop
          await OrchestratorHelper.processFile(currentItemPath, item, utterancesLabelsMap, utterancesDuplicateLabelsMap, hierarchical);
        }
      }
    }
  }

  static getIntentsUtterances(
    luisObject: any,
    hierarchicalLabel: string,
    utterancesLabelsMap: { [id: string]: string[]; },
    utterancesDuplicateLabelsMap: Map<string, Set<string>>) {
    // eslint-disable-next-line no-prototype-builtins
    if (luisObject.hasOwnProperty('utterances')) {
      luisObject.utterances.forEach((e: any) => {
        const label: string = e.intent.trim();
        const utterance: string = e.text.trim();

        OrchestratorHelper.addNewLabelUtterance(
          utterance,
          label,
          hierarchicalLabel,
          utterancesLabelsMap,
          utterancesDuplicateLabelsMap
        );
      });
    }
  }

  static getQnaQuestionsAsUtterances(
    qnaObject: any,
    label: string,
    utterancesLabelsMap: { [id: string]: string[]; },
    utterancesDuplicateLabelsMap: Map<string, Set<string>>) {
    qnaObject.kb.qnaList.forEach((e: any) => {
      const questions: string[] = e.questions;
      questions.forEach((q: string) => {
        OrchestratorHelper.addNewLabelUtterance(
          q.trim(),
          label,
          '',
          utterancesLabelsMap,
          utterancesDuplicateLabelsMap
        );
      });
    });
  }

  static getLabelFromFileName(fileName: string, ext: string, hierarchical: boolean) {
    return hierarchical ? fileName.substr(0, fileName.length - ext.length) : '';
  }

  static addNewLabelUtterance(
    utterance: string,
    label: string,
    hierarchicalLabel: string,
    utterancesLabelsMap: { [id: string]: string[]; },
    utterancesDuplicateLabelsMap: Map<string, Set<string>>) {
    const existingLabels: string[] = utterancesLabelsMap[utterance];
    if (existingLabels) {
      if (hierarchicalLabel && hierarchicalLabel.length > 0) {
        if (!OrchestratorHelper.addUniqueLabel(hierarchicalLabel, existingLabels)) {
          Utility.insertStringPairToStringIdStringSetNativeMap(utterance, hierarchicalLabel, utterancesDuplicateLabelsMap);
        }
      } else {
        if (!OrchestratorHelper.addUniqueLabel(label, existingLabels)) {
          Utility.insertStringPairToStringIdStringSetNativeMap(utterance, hierarchicalLabel, utterancesDuplicateLabelsMap);
        }
      }
    } else if (hierarchicalLabel && hierarchicalLabel.length > 0) {
      utterancesLabelsMap[utterance] = [hierarchicalLabel];
    } else {
      utterancesLabelsMap[utterance] = [label];
    }
  }

  static addUniqueLabel(newLabel: string, labels: string[]): boolean {
    let labelExists: boolean = false;
    for (const label of labels) {
      if (label === newLabel) {
        return false;
      }
    }
    labels.push(newLabel);
    return true;
  }

  static findLuFiles(srcId: string, idsToFind: string[]) {
    const baseDir: string = path.dirname(srcId);
    const retPayload: any[] = [];
    (idsToFind || []).forEach((ask: any)  => {
      const resourceToFind: string = path.isAbsolute(ask.filePath) ? ask.filePath : path.join(baseDir, ask.filePath);
      const fileContent: string = OrchestratorHelper.readFile(resourceToFind);
      if (!processedFiles.includes(resourceToFind)) {
        processedFiles.push(resourceToFind);
      }
      if (fileContent) {
        retPayload.push({
          content: fileContent,
          options: {
            id: ask.filePath,
          },
        });
      } else {
        throw new Error(`Content not found for ${resourceToFind}.`);
      }
    });
    return retPayload;
  }
}