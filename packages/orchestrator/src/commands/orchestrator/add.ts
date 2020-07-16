/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as path from 'path';
import {Command, CLIError, flags} from '@microsoft/bf-cli-command';
import {Orchestrator} from '@microsoft/bf-orchestrator';
import {OrchestratorSettings} from '../../utils/settings';

export default class OrchestratorAdd extends Command {
  static description: string = 'Add examples from .lu/.qna/.json/.blu files to existing orchestrator examples file';

  static examples: Array<string> = [`
    $ bf orchestrator:add 
    $ bf orchestrator:add --in ./path/to/file/ --snapshot ./path/to/snapshot/
    $ bf orchestrator:add --in ./path/to/file/ --snapshot ./path/to/snapshot/ --out ./path/to/output/
    $ bf orchestrator:add --in ./path/to/file/ --out ./path/to/output/ --model ./path/to/model`]

  static flags: flags.Input<any> = {
    in: flags.string({char: 'i', description: 'Path to example file (.lu/.qna/.json/.blu).'}),
    model: flags.string({char: 'm', description: 'Path to Orchestrator model.'}),
    out: flags.string({char: 'o', description: 'Path where generated orchestrator example file will be placed. Default to current working directory.'}),
    prefix: flags.string({char: 'p', description: 'Prefix to be added label in snapshot.'}),
    snapshot: flags.string({char: 's', description: 'Existing orchestrator snapshot to append to.'}),
    force: flags.boolean({char: 'f', description: 'If --out flag is provided with the path to an existing file, overwrites that file.', default: false}),
    debug: flags.boolean({char: 'd'}),
    hierarchical: flags.boolean({description: 'Add hierarchical labels based on input file name.'}),
    help: flags.help({char: 'h', description: 'Orchestrator add command help'}),
  }

  async run() {
    const {flags}: flags.Output = this.parse(OrchestratorAdd);

    const input: string = path.resolve(flags.in || __dirname);
    const output: string = path.resolve(flags.out || path.join(__dirname, 'orchestrator.blu'));
    const snapshot: string = path.resolve(flags.snapshot || path.join(__dirname, 'orchestrator.blu'));
    const labelPrefix: string = flags.prefix || '';

    try {
      OrchestratorSettings.init(__dirname, flags.model, output);
      await Orchestrator.addAsync(OrchestratorSettings.ModelPath, input, OrchestratorSettings.SnapshotPath, snapshot, labelPrefix);
    } catch (error) {
      throw (new CLIError(error));
    }
    return 0;
  }
}
