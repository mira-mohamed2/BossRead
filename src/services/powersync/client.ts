import { PowerSyncDatabase } from '@powersync/react-native';
import { AppSchema } from './schema';

/**
 * Singleton PowerSync database instance.
 * Initialized once in the root layout provider.
 */
export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'readflow.db',
  },
});
