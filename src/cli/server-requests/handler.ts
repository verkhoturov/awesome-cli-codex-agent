import {
  type AppServerRequest,
  decodeAppServerRequest,
  type UserInputQuestion,
} from '../../app-server/requests.js';
import type { RpcRequest } from '../../app-server/types.js';
import type { CliUi } from '../../ui/contracts.js';
import { assertNever } from '../../utils/assert-never.js';

export async function handleServerRequest(request: RpcRequest, ui: CliUi): Promise<unknown> {
  const decoded = decodeAppServerRequest(request);
  if (!decoded) {
    throw new Error(`Unsupported app-server request: ${request.method}`);
  }

  switch (decoded.type) {
    case 'commandApproval':
      return handleCommandApproval(decoded, ui);
    case 'fileApproval':
      return handleFileApproval(decoded, ui);
    case 'permissionApproval':
      return handlePermissionApproval(decoded, ui);
    case 'userInput':
      return handleUserInput(decoded.questions, ui);
    case 'mcpElicitation':
      return handleMcpElicitation(decoded, ui);
    default:
      return assertNever(decoded, 'Unhandled app-server request');
  }
}

async function handleCommandApproval(
  request: Extract<AppServerRequest, { type: 'commandApproval' }>,
  ui: CliUi,
): Promise<unknown> {
  const reason = request.reason ? `Reason: ${request.reason}\n` : '';
  const decision = await requestApproval(
    ui,
    `\nApproval required for command:\n${request.command}\n${reason}`,
  );
  return { decision };
}

async function handleFileApproval(
  request: Extract<AppServerRequest, { type: 'fileApproval' }>,
  ui: CliUi,
): Promise<unknown> {
  const decision = await requestApproval(
    ui,
    `\nApproval required for file changes: ${request.reason}\n`,
  );
  return { decision };
}

async function handlePermissionApproval(
  request: Extract<AppServerRequest, { type: 'permissionApproval' }>,
  ui: CliUi,
): Promise<unknown> {
  const answer = await ui.request({
    defaultValue: 'decline',
    description: `\nPermission request: ${request.reason}\n`,
    options: [
      { aliases: ['y'], label: 'Grant', value: 'grant' },
      { aliases: ['n'], label: 'Decline', value: 'decline' },
    ],
    prompt: 'Grant for this turn? [y/N]: ',
    type: 'choice',
  });
  return {
    permissions: answer === 'grant' ? request.permissions : {},
    scope: 'turn',
  };
}

async function handleUserInput(questions: UserInputQuestion[], ui: CliUi): Promise<unknown> {
  const answers: Record<string, { answers: string[] }> = {};

  for (const question of questions) {
    const answer =
      question.options.length > 0
        ? await ui.request({
            description: `\n${question.prompt}\n`,
            displayOptions: true,
            options: question.options.map(option => ({
              label: option.label,
              value: option.label,
            })),
            prompt: 'Choice: ',
            type: 'choice',
          })
        : (
            await ui.request({
              prompt: `${question.prompt}: `,
              type: 'text',
            })
          ).trim();
    if (question.id) {
      answers[question.id] = { answers: [answer] };
    }
  }

  return { answers };
}

async function handleMcpElicitation(
  request: Extract<AppServerRequest, { type: 'mcpElicitation' }>,
  ui: CliUi,
): Promise<unknown> {
  const answer = await ui.request({
    defaultValue: 'decline',
    description: `\n${request.message}\n`,
    options: [
      { aliases: ['y'], label: 'Accept', value: 'accept' },
      { aliases: ['n'], label: 'Decline', value: 'decline' },
    ],
    prompt: 'Accept? [y/N]: ',
    type: 'choice',
  });
  return { _meta: null, action: answer, content: null };
}

async function requestApproval(
  ui: CliUi,
  description: string,
): Promise<'accept' | 'acceptForSession' | 'decline'> {
  const answer = await ui.request({
    defaultValue: 'decline',
    description,
    options: [
      { aliases: ['y'], label: 'Accept', value: 'accept' },
      { aliases: ['a'], label: 'Accept for session', value: 'acceptForSession' },
      { aliases: ['n'], label: 'Decline', value: 'decline' },
    ],
    prompt: 'Approve? [y]es/[a]ll session/[N]o: ',
    type: 'choice',
  });
  return answer === 'accept' || answer === 'acceptForSession' ? answer : 'decline';
}
