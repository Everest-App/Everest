import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@everest/core';
import { RequestConfig, CodeGenTarget } from '@everest/core';
import { generateCode } from '../services/codegen-service';

export function registerCodegenHandlers(): void {
    ipcMain.handle(
        IPC_CHANNELS.CODEGEN_GENERATE,
        async (_event, config: RequestConfig, target: CodeGenTarget) => {
            return generateCode(config, target);
        }
    );
}
