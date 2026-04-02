import {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
  UpdateType,
} from '@powersync/react-native';
import { supabase } from '../supabase/client';

/**
 * Connector bridges PowerSync ↔ Supabase.
 * Handles authentication token fetching and CRUD operations.
 */
export class SupabaseConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    return {
      endpoint: process.env.EXPO_PUBLIC_POWERSYNC_URL ?? '',
      token: session.access_token,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase) {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    try {
      for (const op of transaction.crud) {
        const table = op.table;
        const record = { ...op.opData, id: op.id };

        switch (op.op) {
          case UpdateType.PUT: {
            const { error } = await supabase.from(table).upsert(record);
            if (error) throw error;
            break;
          }
          case UpdateType.PATCH: {
            const { error } = await supabase
              .from(table)
              .update(op.opData!)
              .eq('id', op.id);
            if (error) throw error;
            break;
          }
          case UpdateType.DELETE: {
            const { error } = await supabase
              .from(table)
              .delete()
              .eq('id', op.id);
            if (error) throw error;
            break;
          }
        }
      }
      await transaction.complete();
    } catch (error) {
      console.error('Upload data error:', error);
      throw error;
    }
  }
}
