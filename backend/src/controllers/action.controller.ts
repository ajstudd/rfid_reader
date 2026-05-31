import { Request, Response } from 'express';
import SmartAction from '../models/SmartAction';
import ActionLog from '../models/ActionLog';
import registry from '../services/smarthome/registry';
import { testAction } from '../services/smarthome/executor';
import log from '../utils/logger';

/**
 * GET /api/actions
 * List all smart actions with optional filters.
 */
export const listActions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cardUID, userId, provider, enabled } = req.query;
    const filter: any = {};

    if (cardUID) filter.cardUID = (cardUID as string).toUpperCase();
    if (userId) filter.userId = userId;
    if (provider) filter.provider = provider;
    if (enabled !== undefined) filter.isEnabled = enabled === 'true';

    const actions = await SmartAction.find(filter)
      .sort({ priority: 1, createdAt: -1 })
      .populate('userId', 'name email');

    res.json({ actions, total: actions.length });
  } catch (error) {
    log.error('ACTIONS', 'List error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/actions/providers
 * List all available providers and their config schemas.
 * Note: This must be registered BEFORE /:id routes to avoid conflict.
 */
export const listProviders = async (_req: Request, res: Response): Promise<void> => {
  try {
    const providers = registry.getSummary();
    res.json({ providers });
  } catch (error) {
    log.error('ACTIONS', 'Providers list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/actions/logs
 * Get action execution logs (paginated).
 */
export const getActionLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.actionId) filter.actionId = req.query.actionId;
    if (req.query.cardUID) filter.cardUID = (req.query.cardUID as string).toUpperCase();
    if (req.query.status) filter.status = req.query.status;
    if (req.query.provider) filter.provider = req.query.provider;

    const [logs, total] = await Promise.all([
      ActionLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name'),
      ActionLog.countDocuments(filter),
    ]);

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    log.error('ACTIONS', 'Logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/actions/:id
 * Get a single action by ID.
 */
export const getAction = async (req: Request, res: Response): Promise<void> => {
  try {
    const action = await SmartAction.findById(req.params.id as string)
      .populate('userId', 'name email');

    if (!action) {
      res.status(404).json({ error: 'Action not found' });
      return;
    }

    res.json({ action });
  } catch (error) {
    log.error('ACTIONS', 'Get error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/actions
 * Create a new smart action.
 */
export const createAction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, cardUID, userId, trigger, provider, action, config, priority, cooldownMs } = req.body;

    if (!name || !provider || !action) {
      res.status(400).json({ error: 'name, provider, and action are required' });
      return;
    }

    // Validate provider exists
    if (!registry.has(provider)) {
      const available = registry.getAll().map((p) => p.name);
      res.status(400).json({
        error: `Unknown provider "${provider}"`,
        availableProviders: available,
      });
      return;
    }

    // Validate provider config
    const providerInstance = registry.get(provider)!;
    const validation = providerInstance.validate(config || {});

    if (!validation.valid) {
      res.status(400).json({
        error: 'Invalid provider configuration',
        validationErrors: validation.errors,
      });
      return;
    }

    // Validate action is supported
    if (!providerInstance.supportedActions.includes(action)) {
      res.status(400).json({
        error: `Action "${action}" is not supported by ${providerInstance.displayName}`,
        supportedActions: providerInstance.supportedActions,
      });
      return;
    }

    // Must have at least cardUID or userId
    if (!cardUID && !userId) {
      res.status(400).json({
        error: 'Either cardUID or userId is required to bind the action',
      });
      return;
    }

    const smartAction = await SmartAction.create({
      name,
      cardUID: cardUID ? cardUID.toUpperCase() : null,
      userId: userId || null,
      trigger: trigger || 'on_authorized',
      provider,
      action,
      config: config || {},
      priority: priority ?? 10,
      cooldownMs: cooldownMs ?? 2000,
    });

    log.info('ACTIONS', `Created action "${name}" (${provider}:${action}) for card ${cardUID || 'user:' + userId}`);

    res.status(201).json({ action: smartAction });
  } catch (error) {
    log.error('ACTIONS', 'Create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PUT /api/actions/:id
 * Update an existing smart action.
 */
export const updateAction = async (req: Request, res: Response): Promise<void> => {
  try {
    const updates = { ...req.body };

    // Normalize cardUID
    if (updates.cardUID) {
      updates.cardUID = updates.cardUID.toUpperCase();
    }

    // If provider or config changed, validate
    if (updates.provider || updates.config) {
      const existingAction = await SmartAction.findById(req.params.id as string);
      if (!existingAction) {
        res.status(404).json({ error: 'Action not found' });
        return;
      }

      const providerName = updates.provider || existingAction.provider;
      const providerInstance = registry.get(providerName);

      if (!providerInstance) {
        res.status(400).json({ error: `Unknown provider "${providerName}"` });
        return;
      }

      if (updates.config) {
        const validation = providerInstance.validate(updates.config);
        if (!validation.valid) {
          res.status(400).json({
            error: 'Invalid provider configuration',
            validationErrors: validation.errors,
          });
          return;
        }
      }

      if (updates.action && !providerInstance.supportedActions.includes(updates.action)) {
        res.status(400).json({
          error: `Action "${updates.action}" not supported by ${providerInstance.displayName}`,
          supportedActions: providerInstance.supportedActions,
        });
        return;
      }
    }

    const action = await SmartAction.findByIdAndUpdate(req.params.id as string, updates, {
      new: true,
      runValidators: true,
    });

    if (!action) {
      res.status(404).json({ error: 'Action not found' });
      return;
    }

    log.info('ACTIONS', `Updated action "${action.name}" (${action._id})`);
    res.json({ action });
  } catch (error) {
    log.error('ACTIONS', 'Update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * DELETE /api/actions/:id
 * Delete a smart action.
 */
export const deleteAction = async (req: Request, res: Response): Promise<void> => {
  try {
    const action = await SmartAction.findByIdAndDelete(req.params.id as string);

    if (!action) {
      res.status(404).json({ error: 'Action not found' });
      return;
    }

    log.info('ACTIONS', `Deleted action "${action.name}" (${action._id})`);
    res.json({ message: 'Action deleted', action });
  } catch (error) {
    log.error('ACTIONS', 'Delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/actions/:id/test
 * Test-fire an action without a real card tap.
 */
export const testFireAction = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await testAction(req.params.id as string);

    if (result.success) {
      log.info('ACTIONS', `Test fire successful for action ${req.params.id}`);
    } else {
      log.warn('ACTIONS', `Test fire failed for action ${req.params.id}: ${result.result.message}`);
    }

    res.json({
      success: result.success,
      result: result.result,
      durationMs: result.durationMs,
    });
  } catch (error) {
    log.error('ACTIONS', 'Test fire error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
