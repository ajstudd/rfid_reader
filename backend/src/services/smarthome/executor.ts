import SmartAction, { ISmartAction } from '../../models/SmartAction';
import ActionLog from '../../models/ActionLog';
import User from '../../models/User';
import registry from './registry';
import { ActionContext } from './types';
import { emitActionExecuted } from '../socket.service';
import log from '../../utils/logger';

/**
 * Input parameters for action execution.
 */
export interface ExecuteActionsInput {
  cardUID: string;
  userId: string | null;
  status: 'authorized' | 'denied' | 'unknown';
  userName: string | null;
  deviceId: string;
}

/**
 * Execute all smart home actions matching the given card tap event.
 * 
 * Flow:
 *   1. Find all matching SmartAction documents (by cardUID or userId)
 *   2. Filter by trigger type, enabled state, and cooldown
 *   3. Group by priority
 *   4. Execute each priority group (parallel within group, sequential between groups)
 *   5. Log results and emit Socket.IO events
 * 
 * This function is designed to be called fire-and-forget after sending
 * the HTTP response to ESP32 — it should never throw.
 */
export async function executeActions(input: ExecuteActionsInput): Promise<void> {
  try {
    const { cardUID, userId, status, userName, deviceId } = input;

    // Build query to find matching actions
    const query: any = {
      isEnabled: true,
      $or: [{ cardUID: cardUID.toUpperCase() }],
    };

    // If we have a userId, also match actions bound to the user
    if (userId) {
      query.$or.push({ userId });
    }

    // Also match actions bound to the user who owns this card (if not already found)
    if (!userId) {
      const user = await User.findOne({ cardUID: cardUID.toUpperCase() });
      if (user) {
        query.$or.push({ userId: user._id });
      }
    }

    // Find all matching actions, sorted by priority
    const actions = await SmartAction.find(query).sort({ priority: 1 });

    if (actions.length === 0) {
      return; // No actions configured — silent exit
    }

    log.info('ACTIONS', `Found ${actions.length} action(s) for card ${cardUID}`);

    // Filter by trigger type
    const triggeredActions = actions.filter((a) => {
      if (a.trigger === 'on_any') return true;
      if (a.trigger === 'on_authorized' && status === 'authorized') return true;
      if (a.trigger === 'on_denied' && (status === 'denied' || status === 'unknown')) return true;
      return false;
    });

    if (triggeredActions.length === 0) {
      log.info('ACTIONS', `No actions match trigger "${status}" — skipping`);
      return;
    }

    log.info('ACTIONS', `Executing ${triggeredActions.length} action(s) for trigger "${status}"`);

    // Build context for providers
    const context: ActionContext = {
      cardUID: cardUID.toUpperCase(),
      userId: userId?.toString() || null,
      userName,
      deviceId,
      status,
    };

    // Group actions by priority
    const priorityGroups = groupByPriority(triggeredActions);

    // Execute each priority group sequentially
    for (const [priority, group] of priorityGroups) {
      log.info('ACTIONS', `--- Priority ${priority} (${group.length} action(s)) ---`);

      // Execute all actions in this priority group in parallel
      await Promise.allSettled(
        group.map((action) => executeSingleAction(action, context))
      );
    }

    log.info('ACTIONS', `All actions complete for card ${cardUID}`);
  } catch (error) {
    log.error('ACTIONS', 'Unexpected error in action executor:', error);
    // Never throw — this runs fire-and-forget
  }
}

/**
 * Execute a single smart home action and log the result.
 */
async function executeSingleAction(
  action: ISmartAction,
  context: ActionContext
): Promise<void> {
  const startTime = Date.now();

  try {
    // Check cooldown
    if (action.lastExecuted && action.cooldownMs > 0) {
      const elapsed = Date.now() - action.lastExecuted.getTime();
      if (elapsed < action.cooldownMs) {
        log.info('ACTIONS', `⏸ Skipped "${action.name}" (cooldown: ${action.cooldownMs - elapsed}ms remaining)`);

        await ActionLog.create({
          actionId: action._id,
          actionName: action.name,
          provider: action.provider,
          cardUID: context.cardUID,
          userId: context.userId,
          status: 'skipped',
          error: `Cooldown: ${action.cooldownMs - elapsed}ms remaining`,
          durationMs: 0,
          timestamp: new Date(),
        });

        return;
      }
    }

    // Get the provider
    const provider = registry.get(action.provider);

    if (!provider) {
      const errorMsg = `Provider "${action.provider}" not found`;
      log.error('ACTIONS', `❌ ${errorMsg} for action "${action.name}"`);

      await ActionLog.create({
        actionId: action._id,
        actionName: action.name,
        provider: action.provider,
        cardUID: context.cardUID,
        userId: context.userId,
        status: 'failed',
        error: errorMsg,
        durationMs: Date.now() - startTime,
        timestamp: new Date(),
      });

      return;
    }

    // Execute the action
    log.info('ACTIONS', `▶ Executing "${action.name}" via ${provider.displayName}...`);
    const result = await provider.execute(action.action, action.config, context);
    const durationMs = Date.now() - startTime;

    // Update lastExecuted timestamp
    await SmartAction.findByIdAndUpdate(action._id, { lastExecuted: new Date() });

    // Log the result
    await ActionLog.create({
      actionId: action._id,
      actionName: action.name,
      provider: action.provider,
      cardUID: context.cardUID,
      userId: context.userId,
      status: result.success ? 'success' : 'failed',
      error: result.success ? null : result.message,
      durationMs,
      timestamp: new Date(),
    });

    // Emit Socket.IO event
    emitActionExecuted({
      actionId: action._id.toString(),
      actionName: action.name,
      provider: action.provider,
      cardUID: context.cardUID,
      userName: context.userName,
      status: result.success ? 'success' : 'failed',
      message: result.message,
      durationMs,
      timestamp: new Date(),
    });

    if (result.success) {
      log.info('ACTIONS', `✅ "${action.name}" completed in ${durationMs}ms`);
    } else {
      log.warn('ACTIONS', `❌ "${action.name}" failed: ${result.message}`);
    }
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    log.error('ACTIONS', `💥 "${action.name}" threw error: ${error.message}`);

    await ActionLog.create({
      actionId: action._id,
      actionName: action.name,
      provider: action.provider,
      cardUID: context.cardUID,
      userId: context.userId,
      status: 'failed',
      error: error.message,
      durationMs,
      timestamp: new Date(),
    }).catch(() => {}); // Don't let logging failure break things

    emitActionExecuted({
      actionId: action._id.toString(),
      actionName: action.name,
      provider: action.provider,
      cardUID: context.cardUID,
      userName: context.userName,
      status: 'failed',
      message: error.message,
      durationMs,
      timestamp: new Date(),
    });
  }
}

/**
 * Group actions by priority level.
 * Returns a Map sorted by priority (ascending).
 */
function groupByPriority(actions: ISmartAction[]): Map<number, ISmartAction[]> {
  const groups = new Map<number, ISmartAction[]>();

  for (const action of actions) {
    const priority = action.priority || 10;
    if (!groups.has(priority)) {
      groups.set(priority, []);
    }
    groups.get(priority)!.push(action);
  }

  // Sort by priority key
  return new Map([...groups.entries()].sort((a, b) => a[0] - b[0]));
}

/**
 * Test-fire a specific action (for the test endpoint).
 */
export async function testAction(actionId: string): Promise<{
  success: boolean;
  result: any;
  durationMs: number;
}> {
  const action = await SmartAction.findById(actionId);

  if (!action) {
    return { success: false, result: { message: 'Action not found' }, durationMs: 0 };
  }

  const provider = registry.get(action.provider);

  if (!provider) {
    return {
      success: false,
      result: { message: `Provider "${action.provider}" not found` },
      durationMs: 0,
    };
  }

  // Create a test context
  const context: ActionContext = {
    cardUID: action.cardUID || 'TEST00000',
    userId: action.userId?.toString() || null,
    userName: 'Test User',
    deviceId: 'test-device',
    status: 'authorized',
  };

  const startTime = Date.now();

  try {
    const result = await provider.execute(action.action, action.config, context);
    const durationMs = Date.now() - startTime;

    // Log the test execution
    await ActionLog.create({
      actionId: action._id,
      actionName: `[TEST] ${action.name}`,
      provider: action.provider,
      cardUID: context.cardUID,
      userId: context.userId,
      status: result.success ? 'success' : 'failed',
      error: result.success ? null : result.message,
      durationMs,
      timestamp: new Date(),
    });

    return { success: result.success, result, durationMs };
  } catch (error: any) {
    return {
      success: false,
      result: { message: error.message },
      durationMs: Date.now() - startTime,
    };
  }
}
