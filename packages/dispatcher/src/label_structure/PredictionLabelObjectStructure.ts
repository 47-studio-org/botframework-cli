/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { PredictionTypeArrayOutputIndex } from "./PredictionType";
import { Label } from "./Label";
import { PredictionStructure } from "./PredictionStructure";
import { PredictionStructureForDisplay } from "./PredictionStructureForDisplay";

export class PredictionLabelObjectStructure
extends PredictionStructure<Label> {

    public labelsPredictedEvaluationArray: number[];
    // ---- NOTE ---- index-PredictionTypeArrayOutputIndex.IndexForTruePositive(0): #TP
    // ---- NOTE ---- index-PredictionTypeArrayOutputIndex.IndexForFalsePositive(1): #FP
    // ---- NOTE ---- index-PredictionTypeArrayOutputIndex.IndexForFalseNegative(2): #FN

    constructor(
        text: string,
        labelsPredictedEvaluationArray: number[],
        // ---- NOTE ---- index-PredictionTypeArrayOutputIndex.IndexForTruePositive(0): #TP
        // ---- NOTE ---- index-PredictionTypeArrayOutputIndex.IndexForFalsePositive(1): #FP
        // ---- NOTE ---- index-PredictionTypeArrayOutputIndex.IndexForFalseNegative(2): #FN
        labelsPredictedEvaluation: number,
        // ---- NOTE ---- PredictionType.TruePositive(1):TP
        // ---- NOTE ---- PredictionType.FalsePositive(2):FP
        // ---- NOTE ---- PredictionType.FalseNegative(4):FN
        // ---- NOTE ---- PredictionType.TrueNegative(8):TN
        labels: Label[],
        labelsConcatenated: string,
        labelsConcatenatedToHtmlTable: string,
        labelsIndexes: number[],
        labelsPredicted: Label[],
        labelsPredictedConcatenated: string,
        labelsPredictedConcatenatedToHtmlTable: string,
        labelsPredictedIndexes: number[]) {
        super(
            text,
            labelsPredictedEvaluation,
            labels,
            labelsConcatenated,
            labelsConcatenatedToHtmlTable,
            labelsIndexes,
            labelsPredicted,
            labelsPredictedConcatenated,
            labelsPredictedConcatenatedToHtmlTable,
            labelsPredictedIndexes);
        this.labelsPredictedEvaluationArray = labelsPredictedEvaluationArray;
    }

    public toObjectPredictionLabelObjectStructure(): {
        "text": string;
        "labelsPredictedEvaluationArray": number[];
        // ---- NOTE ---- index-PredictionTypeArrayOutputIndex.IndexForTruePositive(0): #TP
        // ---- NOTE ---- index-PredictionTypeArrayOutputIndex.IndexForFalsePositive(1): #FP
        // ---- NOTE ---- index-PredictionTypeArrayOutputIndex.IndexForFalseNegative(2): #FN
        "labelsPredictedEvaluation": number;
        // ---- NOTE ---- PredictionType.TruePositive(1):TP
        // ---- NOTE ---- PredictionType.FalsePositive(2):FP
        // ---- NOTE ---- PredictionType.FalseNegative(4):FN
        // ---- NOTE ---- PredictionType.TrueNegative(8):TN
        "labelsIndexes": number[];
        "labelsPredictedIndexes": number[];
        "labels": Label[];
        "labelsPredicted": Label[];
        "predictionStructureForDisplay": PredictionStructureForDisplay;
        } {
          return {
            text:
                this.text,
            labelsPredictedEvaluationArray:
                this.labelsPredictedEvaluationArray,
            // ---- NOTE ---- index-PredictionTypeArrayOutputIndex.IndexForTruePositive(0): #TP
            // ---- NOTE ---- index-PredictionTypeArrayOutputIndex.IndexForFalsePositive(1): #FP
            // ---- NOTE ---- index-PredictionTypeArrayOutputIndex.IndexForFalseNegative(2): #FN
            labelsPredictedEvaluation:
                this.labelsPredictedEvaluation,
            // ---- NOTE ---- PredictionType.TruePositive(1):TP
            // ---- NOTE ---- PredictionType.FalsePositive(2):FP
            // ---- NOTE ---- PredictionType.FalseNegative(4):FN
            // ---- NOTE ---- PredictionType.TrueNegative(8):TN
            labelsIndexes:
                this.labelsIndexes,
            labelsPredictedIndexes:
                this.labelsPredictedIndexes,
            labels:
                this.labels,
            labelsPredicted:
                this.labelsPredicted,
            predictionStructureForDisplay:
                this.predictionStructureForDisplay,
        };
    }

    public hasMisclassified(): boolean {
        return (this.labelsPredictedEvaluationArray[PredictionTypeArrayOutputIndex.IndexForFalsePositive] > 0) ||
          (this.labelsPredictedEvaluationArray[PredictionTypeArrayOutputIndex.IndexForFalseNegative] > 0);
    }
}
